/// <reference types="@react-three/fiber" />
/**
 * CinematicScene.tsx — Full-Screen 3D Volumetric Particle Mesh Wave
 * Optimized for laptops, desktops, and mobile screens.
 * Expands grid boundaries so the sweeping particle wave covers 100% of the screen seamlessely.
 */
import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─── Full-Screen 3D Sweeping Particle Mesh Wave ──────────────────────────────

interface ParticleWaveProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  theme: 'light' | 'dark'
}

function ParticleWave({ mouse, theme }: ParticleWaveProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const isDark = theme === 'dark'

  // Widescreen & Mobile Full-Coverage Grid
  const cols = 160
  const rows = 95
  const numParticles = cols * rows

  // Expanded spans so wave fills 100% of laptop and mobile screens
  const { positions, baseCoords } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3)
    const base = new Float32Array(numParticles * 2)

    let idx = 0
    let bIdx = 0
    const xSpan = 75 // Wide span to cover all screen widths
    const zSpan = 55 // Deep span to cover all camera depths

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1)
        const v = r / (rows - 1)

        const x = (u - 0.5) * xSpan
        const z = (v - 0.5) * zSpan - 5
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

  // Particle Colors
  const colors = useMemo(() => {
    const colArray = new Float32Array(numParticles * 3)
    const colorObj = new THREE.Color()

    for (let i = 0; i < numParticles; i++) {
      const rand = Math.random()

      if (isDark) {
        // Dark Mode: Bright Crisp White & Silver
        if (rand > 0.75) {
          colorObj.set('#ffffff') // Pure White
        } else if (rand > 0.35) {
          colorObj.set('#cbd5e1') // Bright Silver Slate
        } else {
          colorObj.set('#94a3b8') // Medium Slate
        }
      } else {
        // Light Mode: High contrast Dark Charcoal / Slate so 3D motion is 100% visible
        if (rand > 0.75) {
          colorObj.set('#0f172a') // Deep Slate Black
        } else if (rand > 0.35) {
          colorObj.set('#334155') // Dark Charcoal
        } else {
          colorObj.set('#475569') // Rich Slate
        }
      }

      colArray[i * 3]     = colorObj.r
      colArray[i * 3 + 1] = colorObj.g
      colArray[i * 3 + 2] = colorObj.b
    }

    return colArray
  }, [numParticles, isDark])

  const geometryRef = useRef<THREE.BufferGeometry>(null!)

  // Animation Loop — sweeping diagonal wave physics
  useFrame(({ clock }) => {
    if (!geometryRef.current) return

    const t = clock.getElapsedTime() * 0.8
    const posAttr = geometryRef.current.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    const targetMouseX = mouse.current.x * 14
    const targetMouseZ = mouse.current.y * 8

    for (let i = 0; i < numParticles; i++) {
      const x = baseCoords[i * 2]
      const z = baseCoords[i * 2 + 1]

      // Sweeping diagonal wave equations (covers full screen seamlessly)
      let y = Math.sin(x * 0.18 + z * 0.15 + t * 1.2) * 2.8
      y += Math.cos(x * 0.1 - z * 0.2 + t * 0.85) * 2.0
      y += Math.sin((x + z) * 0.06 + t * 0.5) * 1.4

      // Mouse interaction
      const dx = x - targetMouseX
      const dz = z - targetMouseZ
      const distSq = dx * dx + dz * dz
      const mouseInfluence = Math.exp(-distSq / 60) * 2.0
      y += mouseInfluence

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
        size={isDark ? 0.09 : 0.1}
        vertexColors
        transparent
        opacity={isDark ? 0.95 : 0.95}
        sizeAttenuation
        depthWrite={false}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  )
}

// ─── Camera & Parallax Rig ───────────────────────────────────────────────────

function CameraRig({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  useFrame(({ camera }) => {
    const targetX = mouse.current.x * 3.0
    const targetY = mouse.current.y * 2.0 + 9.5

    camera.position.x = lerp(camera.position.x, targetX, 0.035)
    camera.position.y = lerp(camera.position.y, targetY, 0.035)
    camera.lookAt(0, -0.5, -2)
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
  const bgColor = isDark ? '#000000' : '#EAEBED'

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 1, overflow: 'hidden' }}>
      {/* Light Mode soft background gradient */}
      {!isDark && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 40%, #F5F6F8 0%, #E2E4E9 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Full Screen WebGL 3D Canvas */}
      <Canvas
        camera={{ position: [0, 9.5, 16], fov: 54, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 10, 50]} />

        <Suspense fallback={null}>
          <ambientLight intensity={isDark ? 0.5 : 0.9} />
          <directionalLight position={[10, 20, 15]} intensity={isDark ? 1.0 : 1.3} />

          <ParticleWave mouse={mouse} theme={theme} />
          <CameraRig mouse={mouse} />
        </Suspense>

        {isDark && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.8}
              intensity={1.4}
              radius={0.65}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}

export default CinematicScene
