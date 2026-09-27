import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hotbar } from '../ui/Hotbar';

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

  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickStartRef = useRef({ x: 0, y: 0 });
  const [joystickThumb, setJoystickThumb] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef({ x: 0, y: 0 });

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

    const createFloorCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;

      cx.fillStyle = '#f4f6f8';
      cx.fillRect(0, 0, 64, 64);

      cx.fillStyle = '#8f9ba6';
      cx.fillRect(0, 0, 64, 2);
      cx.fillRect(0, 62, 64, 2);
      cx.fillRect(0, 0, 2, 64);
      cx.fillRect(62, 0, 2, 64);

      cx.fillStyle = '#b4bec8';
      cx.fillRect(2, 2, 60, 1);
      cx.fillRect(2, 2, 1, 60);

      cx.fillStyle = '#dce2e8';
      for (let x = 4; x < 60; x += 4) {
        for (let y = 4; y < 60; y += 4) {
          if ((x * 7 + y * 13) % 5 === 0) {
            cx.fillRect(x, y, 2, 2);
          }
        }
      }

      for (let i = 8; i < 64; i += 8) {
        cx.fillStyle = 'rgba(143, 155, 166, 0.35)';
        cx.fillRect(i, 2, 1, 60);
        cx.fillRect(2, i, 60, 1);
      }

      return c;
    };

    const floorTexture = new THREE.CanvasTexture(createFloorCanvas());
    floorTexture.magFilter = THREE.NearestFilter;
    floorTexture.minFilter = THREE.NearestFilter;

    const blockMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
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
          const key = `${cx},${cz}`;
          requiredKeys.add(key);
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

    const createGloveTexture = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;

      cx.fillStyle = '#3a4e28';
      cx.fillRect(0, 0, 64, 24);
      cx.fillStyle = '#2c3d1e';
      for (let i = 0; i < 64; i += 4) {
        cx.fillRect(i, 0, 2, 24);
      }

      cx.fillStyle = '#222622';
      cx.fillRect(0, 24, 64, 40);

      cx.fillStyle = '#171a17';
      cx.fillRect(0, 24, 64, 4);
      cx.fillRect(0, 48, 64, 2);

      cx.fillStyle = '#d69772';
      cx.fillRect(44, 46, 16, 18);
      cx.fillStyle = '#ba7b56';
      cx.fillRect(44, 46, 16, 2);
      cx.fillRect(44, 46, 2, 18);

      return c;
    };

    const gloveTexture = new THREE.CanvasTexture(createGloveTexture());
    gloveTexture.magFilter = THREE.NearestFilter;
    gloveTexture.minFilter = THREE.NearestFilter;
    const gloveMaterial = new THREE.MeshLambertMaterial({ map: gloveTexture });

    const createSkinTexture = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#d69772';
      cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = '#c78663';
      for (let i = 0; i < 64; i += 8) {
        for (let j = 0; j < 64; j += 8) {
          if ((i + j) % 16 === 0) cx.fillRect(i, j, 4, 4);
        }
      }
      return c;
    };

    const skinTexture = new THREE.CanvasTexture(createSkinTexture());
    skinTexture.magFilter = THREE.NearestFilter;
    skinTexture.minFilter = THREE.NearestFilter;
    const skinMaterial = new THREE.MeshLambertMaterial({ map: skinTexture });

    const createFabricTexture = (color1: string, color2: string) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = color1;
      cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = color2;
      for (let i = 0; i < 64; i += 8) {
        cx.fillRect(i, 0, 4, 64);
      }
      return c;
    };

    const bodyTexture = new THREE.CanvasTexture(createFabricTexture('#3a4e28', '#2d3d20'));
    bodyTexture.magFilter = THREE.NearestFilter;
    bodyTexture.minFilter = THREE.NearestFilter;
    const bodyMaterial = new THREE.MeshLambertMaterial({ map: bodyTexture });

    const pantsTexture = new THREE.CanvasTexture(createFabricTexture('#27323a', '#1e262c'));
    pantsTexture.magFilter = THREE.NearestFilter;
    pantsTexture.minFilter = THREE.NearestFilter;
    const pantsMaterial = new THREE.MeshLambertMaterial({ map: pantsTexture });

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
    armMesh.position.set(0, 0, 0);
    handRig.add(armMesh);

    const thumbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), skinMaterial);
    thumbMesh.position.set(-0.11, 0.12, 0.05);
    thumbMesh.rotation.z = 0.25;
    handRig.add(thumbMesh);

    handRig.position.set(0.38, -0.36, -0.5);
    handRig.rotation.set(0, 0, 0);
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
      handRig.position.z = -0.5;

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

  const handleTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const isLeft = touch.clientX < window.innerWidth / 2;

      if (isLeft && joystickTouchIdRef.current === null) {
        joystickTouchIdRef.current = touch.identifier;
        joystickStartRef.current = { x: touch.clientX, y: touch.clientY };
        setIsJoystickActive(true);
        setJoystickThumb({ x: 0, y: 0 });
      } else if (!isLeft && lookTouchIdRef.current === null) {
        lookTouchIdRef.current = touch.identifier;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickStartRef.current.x;
        const dy = touch.clientY - joystickStartRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 45;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;

        setJoystickThumb({ x: thumbX, y: thumbY });
        moveVectorRef.current.x = thumbX / maxDist;
        moveVectorRef.current.z = thumbY / maxDist;
      } else if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lookLastPosRef.current.x;
        const dy = touch.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        cameraAnglesRef.current.yaw -= dx * 0.005;
        cameraAnglesRef.current.pitch = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, cameraAnglesRef.current.pitch - dy * 0.005)
        );
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsJoystickActive(false);
        setJoystickThumb({ x: 0, y: 0 });
        moveVectorRef.current.x = 0;
        moveVectorRef.current.z = 0;
      } else if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
      }
    }
  };

  const triggerJumpOrToggleFlight = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
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

  const overlayTouchLayerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10,
    touchAction: 'none',
  };

  const joystickBaseStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '36px',
    left: '36px',
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(3px)',
    border: '2px solid rgba(255, 255, 255, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    pointerEvents: 'none',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  };

  const joystickKnobStyle: React.CSSProperties = {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: isJoystickActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
    transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
    transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
  };

  const rightControlsContainerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '36px',
    right: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 50,
    pointerEvents: 'auto',
  };

  const roundActionButtonStyle: React.CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    backdropFilter: 'blur(4px)',
    border: '2px solid rgba(255, 255, 255, 0.85)',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#b8dcfa', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={overlayTouchLayerStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      <div style={joystickBaseStyle}>
        <div style={joystickKnobStyle} />
      </div>

      <div style={rightControlsContainerStyle}>
        {isFlying ? (
          <>
            <div
              style={roundActionButtonStyle}
              onTouchStart={(e) => {
                e.stopPropagation();
                moveVectorRef.current.y = 1;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                moveVectorRef.current.y = 0;
              }}
            >
              ▲
            </div>
            <div
              style={roundActionButtonStyle}
              onTouchStart={(e) => {
                e.stopPropagation();
                moveVectorRef.current.y = -1;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                moveVectorRef.current.y = 0;
              }}
            >
              ▼
