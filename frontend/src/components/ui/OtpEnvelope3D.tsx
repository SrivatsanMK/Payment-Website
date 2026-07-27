import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface EnvelopeSceneProps {
  isDark: boolean;
}

function EnvelopeScene({ isDark }: EnvelopeSceneProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const flapGroupRef = useRef<THREE.Group>(null!);
  const letterRef = useRef<THREE.Group>(null!);
  const particlesRef = useRef<THREE.Points>(null!);

  // Colors based on theme
  const envelopeColor = isDark ? '#0f172a' : '#f8fafc';
  const flapColor = isDark ? '#1e293b' : '#e2e8f0';
  const edgeColor = isDark ? '#22d3ee' : '#0284c7';
  const secondaryEdgeColor = isDark ? '#a78bfa' : '#6366f1';
  const letterColor = isDark ? '#1e293b' : '#ffffff';

  // Floating particles initial positions
  const numParticles = 25;
  const { particlePositions, initialY } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3);
    const inY = new Float32Array(numParticles);
    for (let i = 0; i < numParticles; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.5;
      const y = (Math.random() - 0.5) * 2.5;
      pos[i * 3 + 1] = y;
      inY[i] = y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    return { particlePositions: pos, initialY: inY };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // 1. Gentle Idle Floating & Tilting for whole envelope group
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.8) * 0.12 - 0.2;
      groupRef.current.rotation.y = Math.sin(t * 0.9) * 0.15;
      groupRef.current.rotation.x = Math.cos(t * 1.2) * 0.05 + 0.1;
    }

    // 2. Loop Animation timing (4.5s cycle)
    const cycleTime = t % 4.5;
    let targetFlapAngle = 0;
    let targetLetterY = 0;
    let targetLetterRotX = 0;

    if (cycleTime > 0.8 && cycleTime < 3.6) {
      // Open state
      targetFlapAngle = -Math.PI * 0.75; // -135 degrees
      targetLetterY = 1.15; // Slide letter up
      targetLetterRotX = 0.18; // Tilt slightly toward camera
    }

    // Smooth lerp for flap angle
    if (flapGroupRef.current) {
      flapGroupRef.current.rotation.x = lerp(
        flapGroupRef.current.rotation.x,
        targetFlapAngle,
        0.08
      );
    }

    // Smooth lerp for letter position & rotation
    if (letterRef.current) {
      letterRef.current.position.y = lerp(
        letterRef.current.position.y,
        targetLetterY,
        0.06
      );
      letterRef.current.rotation.x = lerp(
        letterRef.current.rotation.x,
        targetLetterRotX,
        0.06
      );
    }

    // 3. Floating particle upward drift
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < numParticles; i++) {
        arr[i * 3 + 1] += 0.008;
        if (arr[i * 3 + 1] > 1.8) {
          arr[i * 3 + 1] = -1.2;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── Envelope Base Pocket ── */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.6, 1.6, 0.16]} />
        <meshStandardMaterial
          color={envelopeColor}
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={0.92}
        />
        <Edges color={edgeColor} threshold={15} />
      </mesh>

      {/* Front V-fold detail accent */}
      <mesh position={[0, -0.05, 0.09]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[1.28, 0.75, 3]} />
        <meshStandardMaterial
          color={isDark ? '#090d16' : '#cbd5e1'}
          roughness={0.4}
        />
        <Edges color={edgeColor} />
      </mesh>

      {/* ── Top Flap Hinge Pivot Group ── */}
      <group ref={flapGroupRef} position={[0, 0.8, 0.08]}>
        <mesh position={[0, -0.4, 0]}>
          <coneGeometry args={[1.3, 0.8, 3]} />
          <meshStandardMaterial
            color={flapColor}
            roughness={0.25}
            metalness={0.6}
          />
          <Edges color={secondaryEdgeColor} />
        </mesh>
      </group>

      {/* ── OTP Letter Card Sliding Out ── */}
      <group ref={letterRef} position={[0, 0, 0.04]}>
        <mesh>
          <boxGeometry args={[2.1, 1.35, 0.04]} />
          <meshStandardMaterial
            color={letterColor}
            emissive={isDark ? '#0284c7' : '#38bdf8'}
            emissiveIntensity={isDark ? 0.25 : 0.15}
            roughness={0.2}
          />
          <Edges color={secondaryEdgeColor} />
        </mesh>

        {/* Lock / Shield Emblem on Card */}
        <group position={[0, 0.15, 0.03]}>
          {/* Lock Shackle */}
          <mesh position={[0, 0.18, 0]}>
            <torusGeometry args={[0.16, 0.04, 8, 16, Math.PI]} />
            <meshStandardMaterial color={edgeColor} emissive={edgeColor} emissiveIntensity={0.6} />
          </mesh>
          {/* Lock Body */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.42, 0.36, 0.06]} />
            <meshStandardMaterial color={edgeColor} emissive={edgeColor} emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* Simulated Text Lines on Card */}
        <mesh position={[0, -0.32, 0.03]}>
          <boxGeometry args={[1.4, 0.05, 0.01]} />
          <meshBasicMaterial color={isDark ? '#94a3b8' : '#64748b'} />
        </mesh>
        <mesh position={[0, -0.44, 0.03]}>
          <boxGeometry args={[0.9, 0.05, 0.01]} />
          <meshBasicMaterial color={isDark ? '#64748b' : '#94a3b8'} />
        </mesh>
      </group>

      {/* ── Ambient Floating Particles ── */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          color={edgeColor}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ── Main Export Component ──

interface OtpEnvelope3DProps {
  isDark?: boolean;
}

export const OtpEnvelope3D: React.FC<OtpEnvelope3DProps> = ({ isDark = true }) => {
  return (
    <div className="w-full h-[190px] relative pointer-events-none select-none">
      <Canvas
        camera={{ position: [0, 0.1, 4.8], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={isDark ? 0.7 : 1.2} />
        <directionalLight position={[5, 10, 7]} intensity={isDark ? 1.2 : 1.8} />
        <pointLight position={[-4, -2, 4]} color="#22d3ee" intensity={isDark ? 2.5 : 1.5} />
        <pointLight position={[4, 3, 4]} color="#a78bfa" intensity={isDark ? 2.0 : 1.2} />

        <EnvelopeScene isDark={isDark} />

        <EffectComposer>
          <Bloom
            intensity={isDark ? 0.6 : 0.3}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default OtpEnvelope3D;
