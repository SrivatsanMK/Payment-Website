/// <reference types="@react-three/fiber" />
/**
 * CinematicScene.tsx — Green Glide Logistics 3D Volumetric Particle Wave
 * Built with React Three Fiber, Three.js, and Post-Processing.
 * Renders an animated 3D particle wave flowing along morphing spline/sine curves with
 * floating light orbs, volumetric lighting, fog, bloom, and mouse reactivity.
 */
import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─── 3D Volumetric Particle Wave ─────────────────────────────────────────────

interface ParticleWaveProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  theme: 'light' | 'dark'
}

function ParticleWave({ mouse, theme }: ParticleWaveProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const isDark = theme === 'dark'

  // Grid dimensions
  const cols = 90
  const rows = 65
  const numParticles = cols * rows

  // Initial geometry setup
  const { positions, baseCoords } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3)
    const base = new Float32Array(numParticles * 2)

    let idx = 0
    let bIdx = 0
    const xSpan = 42
    const zSpan = 32

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1)
        const v = r / (rows - 1)

        const x = (u - 0.5) * xSpan
        const z = (v - 0.5) * zSpan - 2
        const y = 0

        pos[idx]     = x
        pos[idx + 1] = y
        pos[idx + 2] = z

        base[bIdx]     = x
        base[bIdx + 1] = z

        idx += 3
        bIdx += 2
      }
    }

    return { positions: pos, baseCoords: base }
  }, [numParticles])

  // Dynamic particle colors (White, Silver, Gray, Blue, Gold highlights)
  const colors = useMemo(() => {
    const colArray = new Float32Array(numParticles * 3)
    const colorObj = new THREE.Color()

    for (let i = 0; i < numParticles; i++) {
      const rand = Math.random()

      if (isDark) {
        // Dark Mode: White, Silver, Soft Gray, Subtle Blue
        if (rand > 0.88) {
          colorObj.set('#38bdf8') // Icy blue highlight
        } else if (rand > 0.65) {
          colorObj.set('#ffffff') // Pure white
        } else if (rand > 0.35) {
          colorObj.set('#e2e8f0') // Silver
        } else {
          colorObj.set('#94a3b8') // Soft gray
        }
      } else {
        // Light Mode: High contrast Silver, Blue, Gold, Dark Gray
        if (rand > 0.88) {
          colorObj.set('#38bdf8') // Soft Sky Blue
        } else if (rand > 0.75) {
          colorObj.set('#f59e0b') // Soft Gold highlight
        } else if (rand > 0.45) {
          colorObj.set('#475569') // Dark Gray contrast
        } else {
          colorObj.set('#64748b') // Medium Slate
        }
      }

      colArray[i * 3]     = colorObj.r
      colArray[i * 3 + 1] = colorObj.g
      colArray[i * 3 + 2] = colorObj.b
    }

    return colArray
  }, [numParticles, isDark])

  // Geometry ref for live position buffer updates
  const geometryRef = useRef<THREE.BufferGeometry>(null!)

  // Animation Loop — morphing wave along sine/spline curves
  useFrame(({ clock }) => {
    if (!geometryRef.current) return

    const t = clock.getElapsedTime()
    const posAttr = geometryRef.current.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    const targetMouseX = mouse.current.x * 12
    const targetMouseZ = mouse.current.y * 8

    for (let i = 0; i < numParticles; i++) {
      const x = baseCoords[i * 2]
      const z = baseCoords[i * 2 + 1]

      // Primary flowing spline curves
      let y = Math.sin(x * 0.18 + t * 0.85) * Math.cos(z * 0.22 + t * 0.65) * 2.8
      y += Math.sin((x + z) * 0.12 + t * 0.4) * 1.6
      y += Math.cos(x * 0.08 - t * 0.3) * 0.9

      // Mouse proximity interaction (wave bends toward mouse)
      const dx = x - targetMouseX
      const dz = z - targetMouseZ
      const distSq = dx * dx + dz * dz
      const mouseBend = Math.exp(-distSq / 45) * 2.2
      y += mouseBend

      posArray[i * 3 + 1] = y
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isDark ? 0.09 : 0.11}
        vertexColors
        transparent
        opacity={isDark ? 0.85 : 0.9}
        sizeAttenuation
        depthWrite={false}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  )
}

// ─── Ambient Floating Orbs ────────────────────────────────────────────────────

function FloatingOrbs({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark'
  const orb1 = useRef<THREE.Mesh>(null!)
  const orb2 = useRef<THREE.Mesh>(null!)
  const orb3 = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (orb1.current) {
      orb1.current.position.x = Math.sin(t * 0.3) * 14
      orb1.current.position.y = Math.cos(t * 0.25) * 6 + 2
    }
    if (orb2.current) {
      orb2.current.position.x = Math.cos(t * 0.2) * 16
      orb2.current.position.y = Math.sin(t * 0.35) * 7 - 3
    }
    if (orb3.current) {
      orb3.current.position.x = Math.sin(t * 0.15 + 2) * 12
      orb3.current.position.y = Math.cos(t * 0.2 + 1) * 5
    }
  })

  const orbColor1 = isDark ? '#38bdf8' : '#60a5fa'
  const orbColor2 = isDark ? '#818cf8' : '#38bdf8'
  const orbColor3 = isDark ? '#34d399' : '#f59e0b'

  return (
    <group>
      <mesh ref={orb1} position={[-8, 4, -12]}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color={orbColor1} transparent opacity={isDark ? 0.15 : 0.12} />
      </mesh>
      <mesh ref={orb2} position={[10, -3, -15]}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color={orbColor2} transparent opacity={isDark ? 0.12 : 0.1} />
      </mesh>
      <mesh ref={orb3} position={[0, 2, -18]}>
        <sphereGeometry args={[4.0, 32, 32]} />
        <meshBasicMaterial color={orbColor3} transparent opacity={isDark ? 0.08 : 0.07} />
      </mesh>
    </group>
  )
}

// ─── Camera & Parallax Rig ───────────────────────────────────────────────────

function CameraRig({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  useFrame(({ camera }) => {
    const targetX = mouse.current.x * 2.5
    const targetY = mouse.current.y * 1.8 + 11

    camera.position.x = lerp(camera.position.x, targetX, 0.03)
    camera.position.y = lerp(camera.position.y, targetY, 0.03)
    camera.lookAt(0, 0, -2)
  })

  return null
}

// ─── Main Export Component ────────────────────────────────────────────────────

interface SceneProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  theme: 'light' | 'dark'
}

export function CinematicScene({ mouse, theme }: SceneProps) {
  const isDark = theme === 'dark'
  const bgColor = isDark ? '#000000' : '#F5F6F8'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, overflow: 'hidden' }}>
      {/* Light Mode Layered Soft Gradients (Ensures Light Mode is never flat white) */}
      {!isDark && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(224, 242, 254, 0.7) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(254, 243, 199, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(241, 245, 249, 0.9) 0%, #F5F6F8 100%)
          `,
          pointerEvents: 'none',
        }} />
      )}

      {/* R3F WebGL 3D Canvas */}
      <Canvas
        camera={{ position: [0, 11, 18], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 12, 42]} />

        <Suspense fallback={null}>
          <ambientLight intensity={isDark ? 0.4 : 0.8} />
          <directionalLight position={[10, 20, 15]} intensity={isDark ? 0.8 : 1.4} />

          <ParticleWave mouse={mouse} theme={theme} />
          <FloatingOrbs theme={theme} />
          <CameraRig mouse={mouse} />
        </Suspense>

        <EffectComposer>
          <Bloom
            luminanceThreshold={isDark ? 0.25 : 0.35}
            luminanceSmoothing={0.8}
            intensity={isDark ? 1.4 : 0.9}
            radius={0.65}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

export default CinematicScene
