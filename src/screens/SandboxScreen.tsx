import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hotbar } from '../ui/Hotbar';
import { TouchControls } from '../ui/TouchControls';
import {
  createFloorTexture,
  createGloveTexture,
  createSkinTexture,
  createFabricTexture,
} from '../game/textures';

export const SandboxScreen: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [isFlying, setIsFlying] = useState(false);
  const isFlyingRef = useRef(false);
  isFlyingRef.current = isFlying;

  const verticalVelocityRef = useRef(0);
  const isGroundedRef = useRef(true);

  const playerPosRef = useRef({ x: 0, y: 2.0, z: 0 });
  const moveVectorRef = useRef({ x: 0, z: 0, y: 0 });
  const cameraAnglesRef = useRef({ yaw: 0, pitch: 0 });

  const prevYawRef = useRef(0);
  const prevPitchRef = useRef(0);
  const handSwayRef = useRef({ x: 0, y: 0 });
  const lastJumpTapRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b8dcfa');
    scene.fog = new THREE.Fog('#b8dcfa', 24, 56);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#a8c2d8', 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffaf0', 1.35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const blockMaterial = new THREE.MeshLambertMaterial({ map: createFloorTexture() });
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    const chunkSize = 8;
    const chunkRadius = 4;
    const activeChunks = new Map<string, THREE.InstancedMesh>();
    const chunkDummy = new THREE.Object3D();

    const spawnChunk = (chunkX: number, chunkZ: number) => {
      const chunkKey = `${chunkX},${chunkZ}`;
      if (activeChunks.has(chunkKey)) return;

      const mesh = new THREE.InstancedMesh(blockGeometry, blockMaterial, chunkSize * chunkSize);
      mesh.receiveShadow = true;

      let idx = 0;
      const startX = chunkX * chunkSize;
      const startZ = chunkZ * chunkSize;

      for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
          chunkDummy.position.set(startX + x, 0, startZ + z);
          chunkDummy.updateMatrix();
          mesh.setMatrixAt(idx++, chunkDummy.matrix);
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      activeChunks.set(chunkKey, mesh);
    };

    const updateChunks = (centerX: number, centerZ: number) => {
      const currentChunkX = Math.floor(centerX / chunkSize);
      const currentChunkZ = Math.floor(centerZ / chunkSize);
      const requiredKeys = new Set<string>();

      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          requiredKeys.add(`${cx},${cz}`);
          spawnChunk(cx, cz);
        }
      }

      activeChunks.forEach((mesh, key) => {
        if (!requiredKeys.has(key)) {
          scene.remove(mesh);
          mesh.dispose();
          activeChunks.delete(key);
        }
      });
    };

    updateChunks(0, 0);

    const gloveMaterial = new THREE.MeshLambertMaterial({ map: createGloveTexture() });
    const skinMaterial = new THREE.MeshLambertMaterial({ map: createSkinTexture() });
    const bodyMaterial = new THREE.MeshLambertMaterial({
      map: createFabricTexture('#3a4e28', '#2d3d20'),
    });
    const pantsMaterial = new THREE.MeshLambertMaterial({
      map: createFabricTexture('#27323a', '#1e262c'),
    });

    const playerBodyGroup = new THREE.Group();

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.28), bodyMaterial);
    torso.position.y = -0.56;
    torso.castShadow = true;
    playerBodyGroup.add(torso);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), bodyMaterial);
    leftArm.position.set(-0.36, -0.56, 0);
    leftArm.castShadow = true;
    playerBodyGroup.add(leftArm);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.24), pantsMaterial);
    leftLeg.position.set(-0.13, -1.25, 0);
    leftLeg.castShadow = true;
    playerBodyGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.24), pantsMaterial);
    rightLeg.position.set(0.13, -1.25, 0);
    rightLeg.castShadow = true;
    playerBodyGroup.add(rightLeg);

    scene.add(playerBodyGroup);

    const handRig = new THREE.Group();
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), gloveMaterial);
    handRig.add(armMesh);

    const thumbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), skinMaterial);
    thumbMesh.position.set(-0.11, 0.12, 0.05);
    thumbMesh.rotation.z = 0.25;
    handRig.add(thumbMesh);

    handRig.position.set(0.38, -0.36, -0.5);
    camera.add(handRig);
    scene.add(camera);

    let animationFrameId: number;
    let lastTime = performance.now();
    let lastChunkCheckX = 0;
    let lastChunkCheckZ = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const angles = cameraAnglesRef.current;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = angles.yaw;
      camera.rotation.x = angles.pitch;

      const deltaYaw = angles.yaw - prevYawRef.current;
      const deltaPitch = angles.pitch - prevPitchRef.current;
      prevYawRef.current = angles.yaw;
      prevPitchRef.current = angles.pitch;

      const sway = handSwayRef.current;
      sway.x += (-deltaYaw * 0.3 - sway.x) * (dt * 12);
      sway.y += (-deltaPitch * 0.3 - sway.y) * (dt * 12);

      handRig.position.x = 0.38 + sway.x;
      handRig.position.y = -0.36 + sway.y;

      const move = moveVectorRef.current;
      const speed = isFlyingRef.current ? 9.0 : 4.6;

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angles.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angles.yaw);

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -move.z)
        .addScaledVector(right, move.x);

      const pos = playerPosRef.current;

      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        pos.x += moveDir.x * speed * dt;
        pos.z += moveDir.z * speed * dt;

        const distMoved = Math.hypot(pos.x - lastChunkCheckX, pos.z - lastChunkCheckZ);
        if (distMoved >= chunkSize) {
          lastChunkCheckX = pos.x;
          lastChunkCheckZ = pos.z;
          updateChunks(pos.x, pos.z);
        }
      }

      if (isFlyingRef.current) {
        pos.y += move.y * speed * dt;
        verticalVelocityRef.current = 0;
        if (pos.y < 2.0) pos.y = 2.0;
      } else {
        verticalVelocityRef.current -= 22.0 * dt;
        pos.y += verticalVelocityRef.current * dt;

        if (pos.y <= 2.0) {
          pos.y = 2.0;
          verticalVelocityRef.current = 0;
          isGroundedRef.current = true;
        } else {
          isGroundedRef.current = false;
        }
      }

      camera.position.set(pos.x, pos.y, pos.z);
      playerBodyGroup.position.set(pos.x, pos.y, pos.z);
      playerBodyGroup.rotation.y = angles.yaw;

      sunLight.position.set(pos.x + 30, 45, pos.z + 20);
      sunLight.target.position.set(pos.x, 0, pos.z);
      sunLight.target.updateMatrixWorld();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      activeChunks.forEach((mesh) => mesh.dispose());
      activeChunks.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleJumpOrToggleFly = () => {
    const now = performance.now();
    const timeSinceLastTap = now - lastJumpTapRef.current;

    if (timeSinceLastTap < 350) {
      setIsFlying((prev) => !prev);
      moveVectorRef.current.y = 0;
      lastJumpTapRef.current = 0;
    } else {
      if (isGroundedRef.current && !isFlyingRef.current) {
        verticalVelocityRef.current = 7.8;
        isGroundedRef.current = false;
      }
      lastJumpTapRef.current = now;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#b8dcfa', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <TouchControls
        isFlying={isFlying}
        onMove={(x, z) => {
          moveVectorRef.current.x = x;
          moveVectorRef.current.z = z;
        }}
        onLook={(dx, dy) => {
          cameraAnglesRef.current.yaw -= dx * 0.005;
          cameraAnglesRef.current.pitch = Math.max(
            -Math.PI / 2.2,
            Math.min(Math.PI / 2.2, cameraAnglesRef.current.pitch - dy * 0.005)
          );
        }}
        onJumpOrToggleFly={handleJumpOrToggleFly}
        onFlyVertical={(dir) => {
          moveVectorRef.current.y = dir;
        }}
        onStopFly={() => {
          setIsFlying(false);
          moveVectorRef.current.y = 0;
        }}
      />

      <Hotbar />
    </div>
  );
};
