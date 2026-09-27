import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hotbar } from '../ui/Hotbar';

export const SandboxScreen: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [isFlying, setIsFlying] = useState(false);
  const isFlyingRef = useRef(false);
  isFlyingRef.current = isFlying;

  const moveVectorRef = useRef({ x: 0, z: 0, y: 0 });
  const cameraAnglesRef = useRef({ yaw: 0, pitch: 0 });

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
    scene.background = new THREE.Color('#0c140a');
    scene.fog = new THREE.Fog('#0c140a', 20, 60);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 2.0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xd4ecd5, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e8eee5';
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = '#b0b8ac';
    ctx.fillRect(0, 0, 64, 4);
    ctx.fillRect(0, 60, 64, 4);
    ctx.fillRect(0, 0, 4, 64);
    ctx.fillRect(60, 0, 4, 64);

    for (let i = 4; i < 60; i += 8) {
      for (let j = 4; j < 60; j += 8) {
        if ((i + j) % 16 === 0) {
          ctx.fillStyle = '#dde3da';
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

    const handGeometry = new THREE.BoxGeometry(0.24, 0.6, 0.24);
    const handCanvas = document.createElement('canvas');
    handCanvas.width = 16;
    handCanvas.height = 16;
    const handCtx = handCanvas.getContext('2d')!;
    handCtx.fillStyle = '#5c8a32';
    handCtx.fillRect(0, 0, 16, 16);
    handCtx.fillStyle = '#426821';
    handCtx.fillRect(0, 8, 16, 8);

    const handTexture = new THREE.CanvasTexture(handCanvas);
    handTexture.magFilter = THREE.NearestFilter;
    handTexture.minFilter = THREE.NearestFilter;

    const handMaterial = new THREE.MeshLambertMaterial({ map: handTexture });
    const handMesh = new THREE.Mesh(handGeometry, handMaterial);
    handMesh.position.set(0.35, -0.35, -0.6);
    handMesh.rotation.set(-0.35, -0.2, 0.2);
    camera.add(handMesh);
    scene.add(camera);

    let animationFrameId: number;
    let lastTime = performance.now();
    let verticalVelocity = 0;
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

      const move = moveVectorRef.current;
      const speed = isFlyingRef.current ? 8.0 : 4.5;

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angles.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angles.yaw);

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -move.z)
        .addScaledVector(right, move.x);

      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        camera.position.addScaledVector(moveDir, speed * dt);
        walkCycle += dt * 9;
        handMesh.position.y = -0.35 + Math.sin(walkCycle) * 0.03;
        handMesh.position.x = 0.35 + Math.cos(walkCycle) * 0.02;
      } else {
        handMesh.position.y = -0.35;
        handMesh.position.x = 0.35;
      }

      if (isFlyingRef.current) {
        camera.position.y += move.y * speed * dt;
        verticalVelocity = 0;
        if (camera.position.y < 2.0) {
          camera.position.y = 2.0;
        }
      } else {
        verticalVelocity -= 18.0 * dt;
        camera.position.y += verticalVelocity * dt;

        if (camera.position.y <= 2.0) {
          camera.position.y = 2.0;
          verticalVelocity = 0;
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

  const handleJumpPress = () => {
    const now = Date.now();
    if (now - lastJumpTapRef.current < 300) {
      setIsFlying((prev) => !prev);
    }
    lastJumpTapRef.current = now;
  };

  const overlayTouchLayerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10,
    touchAction: 'none',
  };

  const joystickBaseStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '40px',
    left: '40px',
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    backgroundColor: 'rgba(10, 16, 8, 0.45)',
    border: '2px solid rgba(110, 175, 55, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  };

  const joystickKnobStyle: React.CSSProperties = {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: isJoystickActive ? '#6ea838' : 'rgba(110, 168, 56, 0.65)',
    transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
    transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
  };

  const rightControlsContainerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '40px',
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
    backgroundColor: 'rgba(12, 18, 9, 0.75)',
    border: '2px solid #5a8e2b',
    color: '#9ad45b',
    fontSize: '20px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000000', overflow: 'hidden' }}>
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
              onTouchStart={() => (moveVectorRef.current.y = 1)}
              onTouchEnd={() => (moveVectorRef.current.y = 0)}
            >
              ▲
            </div>
            <div
              style={roundActionButtonStyle}
              onTouchStart={() => (moveVectorRef.current.y = -1)}
              onTouchEnd={() => (moveVectorRef.current.y = 0)}
            >
              ▼
            </div>
            <div
              style={{ ...roundActionButtonStyle, fontSize: '11px', height: '36px', borderRadius: '18px' }}
              onClick={handleJumpPress}
            >
              СТОП
            </div>
          </>
        ) : (
          <div style={roundActionButtonStyle} onClick={handleJumpPress}>
            ▲
          </div>
        )}
      </div>

      <Hotbar />
    </div>
  );
};
