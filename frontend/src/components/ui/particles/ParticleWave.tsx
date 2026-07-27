import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleWaveShader } from './ParticleShader';

interface ParticleWaveProps {
  countX?: number;
  countZ?: number;
  separation?: number;
}

export const ParticleWave: React.FC<ParticleWaveProps> = ({
  countX = 130,
  countZ = 75,
  separation = 0.75,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generate 3D grid position buffer and custom attributes once with useMemo
  const { positions, scales, phases } = useMemo(() => {
    const totalParticles = countX * countZ;
    const posArray = new Float32Array(totalParticles * 3);
    const scaleArray = new Float32Array(totalParticles);
    const phaseArray = new Float32Array(totalParticles);

    let i = 0;
    let i3 = 0;

    const offsetX = (countX * separation) / 2;
    const offsetZ = (countZ * separation) / 2;

    for (let x = 0; x < countX; x++) {
      for (let z = 0; z < countZ; z++) {
        // Center grid in 3D space
        posArray[i3] = x * separation - offsetX;
        posArray[i3 + 1] = 0; // Base Y position (modified by GPU vertex shader)
        posArray[i3 + 2] = z * separation - offsetZ;

        // Particle scale variation
        scaleArray[i] = 0.5 + Math.random() * 1.3;

        // Phase offset for organic wave propagation
        phaseArray[i] = (x * 0.12) + (z * 0.12) + Math.random() * Math.PI;

        i++;
        i3 += 3;
      }
    }

    return {
      positions: posArray,
      scales: scaleArray,
      phases: phaseArray,
    };
  }, [countX, countZ, separation]);

  // Shader material definition with uniforms
  const shaderUniforms = useMemo(() => {
    return THREE.UniformsUtils.clone(ParticleWaveShader.uniforms);
  }, []);

  // Update wave animation time uniform on every frame (GPU accelerated)
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * 1.25;
    }
  });

  return (
    <points rotation={[-0.42, 0.12, -0.04]} position={[0, -0.5, -4]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aScale"
          args={[scales, 1]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            uniforms: shaderUniforms,
            vertexShader: ParticleWaveShader.vertexShader,
            fragmentShader: ParticleWaveShader.fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
};
