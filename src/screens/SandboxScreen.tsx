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
    scene.fog = new THREE.Fog('#b8dcfa', 24, 65);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 2.0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#b0c4de', 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffaf0', 1.35);
    sunLight.position.set(25, 45, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = '#a8b2bc';
    ctx.fillRect(0, 0, 64, 2);
    ctx.fillRect(0, 62, 64, 2);
    ctx.fillRect(0, 0, 2, 64);
    ctx.fillRect(62, 0, 2, 64);

    for (let i = 2; i < 62; i += 8) {
      for (let j = 2; j < 62; j += 8) {
        if ((i + j) % 16 === 0) {
          ctx.fillStyle = '#e8ecf2';
          ctx.fillRect(i, j, 8, 8);
        }
      }
    }

    const blockTexture = new THREE.CanvasTexture(canvas);
    blockTexture.magFilter = THREE.NearestFilter;
    blockTexture.minFilter = THREE.NearestFilter;

    const blockMaterial = new THREE.MeshLambertMaterial({ map: blockTexture });
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    const chunkSize = 8;
    const chunkRadius = 4;
    const sideCount = (chunkRadius * 2 + 1) * chunkSize;
    const totalBlocks = sideCount * sideCount;

    const instancedFloor = new THREE.InstancedMesh(blockGeometry, blockMaterial, totalBlocks);
    instancedFloor.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    const halfSide = Math.floor(sideCount / 2);
    for (let x = -halfSide; x < halfSide; x++) {
      for (let z = -halfSide; z < halfSide; z++) {
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        instancedFloor.setMatrixAt(idx++, dummy.matrix);
      }
    }
    instancedFloor.instanceMatrix.needsUpdate = true;
    scene.add(instancedFloor);

    const handCanvas = document.createElement('canvas');
    handCanvas.width = 16;
    handCanvas.height = 16;
    const hCtx = handCanvas.getContext('2d')!;

    hCtx.fillStyle = '#3a506b';
    hCtx.fillRect(0, 0, 16, 6);

    hCtx.fillStyle = '#e5a882';
    hCtx.fillRect(0, 6, 16, 10);
    hCtx.fillStyle = '#d4946f';
    hCtx.fillRect(0, 12, 16, 4);

    const handTexture = new THREE.CanvasTexture(handCanvas);
    handTexture.magFilter = THREE.NearestFilter;
    handTexture.minFilter = THREE.NearestFilter;

    const handGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
    const handMat = new THREE.MeshLambertMaterial({ map: handTexture });
    const handMesh = new THREE.Mesh(handGeo, handMat);

    handMesh.position.set(0.36, -0.34, -0.52);
    handMesh.rotation.set(-0.35, -0.15, 0.12);
    camera.add(handMesh);
    scene.add(camera);

    let animationFrameId: number;
    let lastTime = performance.now();
    let walkCycle = 0;

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
      sway.x += (-deltaYaw * 0.35 - sway.x) * (dt * 12);
      sway.y += (-deltaPitch * 0.35 - sway.y) * (dt * 12);

      const move = moveVectorRef.current;
      const speed = isFlyingRef.current ? 9.0 : 4.6;

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angles.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angles.yaw);

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -move.z)
        .addScaledVector(right, move.x);

      let bobX = 0;
      let bobY = 0;

      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        camera.position.addScaledVector(moveDir, speed * dt);

        walkCycle += dt * 8.5;
        bobY = Math.sin(walkCycle) * 0.015;
        bobX = Math.cos(walkCycle * 0.5) * 0.01;
      }

      handMesh.position.x = 0.36 + sway.x + bobX;
      handMesh.position.y = -0.34 + sway.y + bobY;
      handMesh.position.z = -0.52;

      if (isFlyingRef.current) {
        camera.position.y += move.y * speed * dt;
        verticalVelocityRef.current = 0;
        if (camera.position.y < 2.0) {
          camera.position.y = 2.0;
        }
      } else {
        verticalVelocityRef.current -= 22.0 * dt;
        camera.position.y += verticalVelocityRef.current * dt;

        if (camera.position.y <= 2.0) {
          camera.position.y = 2.0;
          verticalVelocityRef.current = 0;
          isGroundedRef.current = true;
        } else {
          isGroundedRef.current = false;
        }
      }

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
            </div>
            <div
              style={{
                ...roundActionButtonStyle,
                fontSize: '11px',
                height: '36px',
                borderRadius: '18px',
              }}
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
          <div
            style={roundActionButtonStyle}
            onTouchStart={triggerJumpOrToggleFlight}
          >
            ▲
          </div>
        )}
      </div>

      <Hotbar />
    </div>
  );
};
