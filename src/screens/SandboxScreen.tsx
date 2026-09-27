import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hotbar } from '../ui/Hotbar';

export const SandboxScreen: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [cameraMode, setCameraMode] = useState<0 | 1 | 2>(0);
  const cameraModeRef = useRef<0 | 1 | 2>(0);
  cameraModeRef.current = cameraMode;

  const [isFlying, setIsFlying] = useState<boolean>(false);
  const isFlyingRef = useRef<boolean>(false);
  isFlyingRef.current = isFlying;

  const verticalVelocityRef = useRef<number>(0);
  const isGroundedRef = useRef<boolean>(true);

  const playerPosRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 2.0, z: 0 });
  const moveVectorRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const cameraAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });

  const prevYawRef = useRef<number>(0);
  const prevPitchRef = useRef<number>(0);
  const handSwayRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rollLeanRef = useRef<number>(0);
  const pitchLeanRef = useRef<number>(0);

  const lastJumpTapRef = useRef<number>(0);

  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState<boolean>(false);

  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

    const createFloorTexture = (): THREE.CanvasTexture => {
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
          if ((x * 7 + y * 13) % 5 === 0) cx.fillRect(x, y, 2, 2);
        }
      }
      for (let i = 8; i < 64; i += 8) {
        cx.fillStyle = 'rgba(143, 155, 166, 0.35)';
        cx.fillRect(i, 2, 1, 60);
        cx.fillRect(2, i, 60, 1);
      }
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    };

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

    const createBeigeHeadTexture = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#dfaf8e';
      cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = '#d5a17e';
      for (let x = 0; x < 64; x += 8) {
        for (let y = 0; y < 64; y += 8) {
          if ((x * 3 + y * 5) % 4 === 0) cx.fillRect(x, y, 4, 4);
        }
      }
      cx.fillStyle = '#e9bd9d';
      for (let x = 4; x < 64; x += 8) {
        for (let y = 4; y < 64; y += 8) {
          if ((x * 7 + y * 2) % 3 === 0) cx.fillRect(x, y, 4, 4);
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    };

    const createUpperBodyTexture = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#3a4e28';
      cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = '#2b3b1e';
      for (let x = 0; x < 64; x += 8) {
        for (let y = 0; y < 64; y += 8) {
          if ((x + y) % 16 === 0) cx.fillRect(x, y, 4, 4);
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    };

    const createLowerBodyTexture = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#232a22';
      cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = '#b5832b';
      cx.fillRect(24, 8, 16, 10);
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    };

    const createLimbTexture = (c1: string, c2: string): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = c1;
      cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = c2;
      for (let x = 0; x < 64; x += 8) {
        for (let y = 0; y < 64; y += 8) {
          if ((x + y) % 16 === 0) cx.fillRect(x, y, 4, 4);
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    };

    const headMat = new THREE.MeshLambertMaterial({ map: createBeigeHeadTexture() });
    const upperBodyMat = new THREE.MeshLambertMaterial({ map: createUpperBodyTexture() });
    const lowerBodyMat = new THREE.MeshLambertMaterial({ map: createLowerBodyTexture() });
    const armMat = new THREE.MeshLambertMaterial({ map: createLimbTexture('#3a4e28', '#2a3a1d') });
    const legMat = new THREE.MeshLambertMaterial({ map: createLimbTexture('#242c33', '#192025') });

    const playerBodyGroup = new THREE.Group();

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), headMat);
    headMesh.position.set(0, 0.08, 0.12);
    headMesh.castShadow = true;
    playerBodyGroup.add(headMesh);

    const torsoUpper = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.24), upperBodyMat);
    torsoUpper.position.set(0, -0.34, 0.12);
    torsoUpper.castShadow = true;
    playerBodyGroup.add(torsoUpper);

    const torsoLower = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.22), lowerBodyMat);
    torsoLower.position.set(0, -0.66, 0.12);
    torsoLower.castShadow = true;
    playerBodyGroup.add(torsoLower);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.31, -0.16, 0.12);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.16), armMat);
    leftArmMesh.position.set(0, -0.31, 0);
    leftArmMesh.castShadow = true;
    leftArmPivot.add(leftArmMesh);
    playerBodyGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.31, -0.16, 0.12);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.16), armMat);
    rightArmMesh.position.set(0, -0.31, 0);
    rightArmMesh.castShadow = true;
    rightArmPivot.add(rightArmMesh);
    playerBodyGroup.add(rightArmPivot);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, -0.80, 0.12);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.74, 0.18), legMat);
    leftLegMesh.position.set(0, -0.37, 0);
    leftLegMesh.castShadow = true;
    leftLegPivot.add(leftLegMesh);
    playerBodyGroup.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, -0.80, 0.12);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.74, 0.18), legMat);
    rightLegMesh.position.set(0, -0.37, 0);
    rightLegMesh.castShadow = true;
    rightLegPivot.add(rightLegMesh);
    playerBodyGroup.add(rightLegPivot);

    scene.add(playerBodyGroup);

    const createFpsArmTexture = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#3a4e28';
      cx.fillRect(0, 0, 64, 30);
      cx.fillStyle = '#28381b';
      cx.fillRect(0, 26, 64, 4);
      cx.fillStyle = '#1c1f1b';
      cx.fillRect(0, 30, 64, 24);
      cx.fillStyle = '#dfaf8e';
      cx.fillRect(0, 54, 64, 10);
      cx.fillStyle = '#c79676';
      cx.fillRect(0, 54, 64, 2);
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      return t;
    };

    const fpsArmMat = new THREE.MeshLambertMaterial({ map: createFpsArmTexture() });
    const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), fpsArmMat);
    handMesh.position.set(0.32, -0.28, -0.42);
    handMesh.rotation.set(-0.65, 0.35, -0.15);
    camera.add(handMesh);
    scene.add(camera);

    let animationFrameId: number;
    let lastTime = performance.now();
    let lastChunkCheckX = 0;
    let lastChunkCheckZ = 0;
    let walkCycle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const angles = cameraAnglesRef.current;
      const currentMode = cameraModeRef.current;

      const deltaYaw = angles.yaw - prevYawRef.current;
      const deltaPitch = angles.pitch - prevPitchRef.current;
      prevYawRef.current = angles.yaw;
      prevPitchRef.current = angles.pitch;

      const sway = handSwayRef.current;
      sway.x += (-deltaYaw * 0.25 - sway.x) * (dt * 12);
      sway.y += (-deltaPitch * 0.25 - sway.y) * (dt * 12);

      handMesh.position.x = 0.32 + sway.x;
      handMesh.position.y = -0.28 + sway.y;

      const move = moveVectorRef.current;
      const speed = isFlyingRef.current ? 9.0 : 4.6;

      const targetRoll = -move.x * 0.04;
      const targetPitch = move.z * 0.03;
      rollLeanRef.current += (targetRoll - rollLeanRef.current) * (dt * 9);
      pitchLeanRef.current += (targetPitch - pitchLeanRef.current) * (dt * 9);

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

        walkCycle += dt * 10;
        leftLegPivot.rotation.x = Math.sin(walkCycle) * 0.65;
        rightLegPivot.rotation.x = -Math.sin(walkCycle) * 0.65;
        leftArmPivot.rotation.x = -Math.sin(walkCycle) * 0.55;
        rightArmPivot.rotation.x = Math.sin(walkCycle) * 0.55;

        const distMoved = Math.hypot(pos.x - lastChunkCheckX, pos.z - lastChunkCheckZ);
        if (distMoved >= chunkSize) {
          lastChunkCheckX = pos.x;
          lastChunkCheckZ = pos.z;
          updateChunks(pos.x, pos.z);
        }
      } else {
        leftLegPivot.rotation.x *= 0.8;
        rightLegPivot.rotation.x *= 0.8;
        leftArmPivot.rotation.x *= 0.8;
        rightArmPivot.rotation.x *= 0.8;
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

      playerBodyGroup.position.set(pos.x, pos.y, pos.z);
      playerBodyGroup.rotation.y = angles.yaw - move.x * 0.1;
      playerBodyGroup.rotation.z = rollLeanRef.current * 1.2;
      playerBodyGroup.rotation.x = pitchLeanRef.current * 1.2;

      if (currentMode === 0) {
        camera.position.set(pos.x, pos.y, pos.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = angles.yaw;
        camera.rotation.x = angles.pitch + pitchLeanRef.current * 0.5;
        camera.rotation.z = rollLeanRef.current;

        headMesh.visible = false;
        rightArmPivot.visible = false;
        handMesh.visible = true;
      } else if (currentMode === 1) {
        const dist = 3.6;
        const camX = pos.x + Math.sin(angles.yaw) * Math.cos(angles.pitch) * dist;
        const camY = pos.y + Math.sin(-angles.pitch) * dist + 0.5;
        const camZ = pos.z + Math.cos(angles.yaw) * Math.cos(angles.pitch) * dist;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(pos.x, pos.y - 0.2, pos.z);

        headMesh.visible = true;
        rightArmPivot.visible = true;
        handMesh.visible = false;
      } else {
        const dist = 3.6;
        const camX = pos.x - Math.sin(angles.yaw) * Math.cos(angles.pitch) * dist;
        const camY = pos.y - Math.sin(-angles.pitch) * dist + 0.5;
        const camZ = pos.z - Math.cos(angles.yaw) * Math.cos(angles.pitch) * dist;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(pos.x, pos.y - 0.2, pos.z);

        headMesh.visible = true;
        rightArmPivot.visible = true;
        handMesh.visible = false;
      }

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
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

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
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

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
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

  const triggerJumpOrToggleFlight = (e: React.TouchEvent<HTMLDivElement>) => {
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

  const cycleCameraMode = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setCameraMode((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
  };

  const overlayTouchStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10,
    touchAction: 'none',
  };

  const topControlsStyle: React.CSSProperties = {
    position: 'fixed',
    top: '18px',
    right: '24px',
    zIndex: 50,
    display: 'flex',
    gap: '10px',
  };

  const topViewButtonStyle: React.CSSProperties = {
    height: '36px',
    padding: '0 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    backdropFilter: 'blur(4px)',
    border: '2px solid rgba(255, 255, 255, 0.85)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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

  const controlsContainerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '36px',
    right: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 50,
    pointerEvents: 'auto',
  };

  const btnStyle: React.CSSProperties = {
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

  const getCameraModeLabel = (): string => {
    if (cameraMode === 0) return '1-Е ЛИЦО';
    if (cameraMode === 1) return '3-Е ЛИЦО';
    return '2-Е ЛИЦО';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#b8dcfa', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={overlayTouchStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      <div style={topControlsStyle}>
        <div
          style={topViewButtonStyle}
          onTouchStart={cycleCameraMode}
          onClick={cycleCameraMode}
        >
          {getCameraModeLabel()}
        </div>
      </div>

      <div style={joystickBaseStyle}>
        <div style={joystickKnobStyle} />
      </div>

      <div style={controlsContainerStyle}>
        {isFlying ? (
          <>
            <div
              style={btnStyle}
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
              style={btnStyle}
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
            </div>
            <div
              style={{ ...btnStyle, fontSize: '11px', height: '36px', borderRadius: '18px' }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsFlying(false);
                moveVectorRef.current.y = 0;
              }}
            >
              СТОП
            </div>
          </>
        ) : (
          <div style={btnStyle} onTouchStart={triggerJumpOrToggleFlight}>
            ▲
          </div>
        )}
      </div>

      <Hotbar />
    </div>
  );
};
