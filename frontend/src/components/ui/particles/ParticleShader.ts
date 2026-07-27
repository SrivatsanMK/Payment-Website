import * as THREE from 'three';

export const ParticleWaveShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') },
    uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
    uSize: { value: 24.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    attribute float aScale;
    attribute float aPhase;
    varying float vDistance;
    varying float vAlpha;

    void main() {
      vec3 pos = position;
      
      // Dynamic, flowing 3D wave motion
      float wave1 = sin(pos.x * 0.14 + uTime * 0.9 + aPhase) * 2.8;
      float wave2 = cos(pos.z * 0.12 + uTime * 0.7 + aPhase * 0.7) * 2.2;
      float wave3 = sin((pos.x * 0.09 + pos.z * 0.09) + uTime * 0.5) * 1.8;
      
      pos.y += wave1 + wave2 + wave3;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Particle size attenuates with camera distance for 3D depth
      gl_PointSize = (uSize * aScale * uPixelRatio) * (30.0 / -mvPosition.z);

      // Distance calculation for camera depth fading
      vDistance = -mvPosition.z;
      
      // Smooth alpha falloff from center to edges
      float distFromCenter = length(pos.xz) / 55.0;
      vAlpha = smoothstep(1.0, 0.1, distFromCenter);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vDistance;
    varying float vAlpha;

    void main() {
      // Create a smooth circular particle point shape
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      // Crisp glowing radial gradient
      float glow = pow(1.0 - (dist * 2.0), 1.8);
      
      // Soft depth opacity attenuation
      float depthFade = smoothstep(80.0, 5.0, vDistance);

      gl_FragColor = vec4(uColor, glow * 0.92 * vAlpha * depthFade);
    }
  `
};
