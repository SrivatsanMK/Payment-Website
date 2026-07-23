/// <reference types="@react-three/fiber" />
/**
 * CinematicScene.tsx — Fullscreen 3D Sweeping Particle Wave
 * Renders smooth circular glowing particles (no square pixel artifacts)
 * and fills 100% of dynamic viewport height (100dvh) for mobile & desktop.
 */
import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─── 3D Fullscreen Sweeping Particle Mesh Wave ───────────────────────────────

interface ParticleWaveProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  theme: 'light' | 'dark'
}

function ParticleWave({ mouse, theme }: ParticleWaveProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const isDark = theme === 'dark'

  // Dynamic canvas texture for soft circular glowing dots (eliminates square pixel points)
  const circleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  // Expanded Grid Dimensions
  const cols = 150
  const rows = 95
  const numParticles = cols * rows

  // Initial grid position generation
  const { positions, baseCoords } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3)
    const base = new Float32Array(numParticles * 2)

    let idx = 0
    let bIdx = 0
    const xSpan = 85
    const zSpan = 55

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
        // Dark Mode: Crisp White & Silver
        if (rand > 0.75) {
          colorObj.set('#ffffff') // Pure White
        } else if (rand > 0.35) {
          colorObj.set('#cbd5e1') // Silver Slate
        } else {
          colorObj.set('#94a3b8') // Medium Slate
        }
      } else {
        // Light Mode: Dark Charcoal & Slate for 3D contrast
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

    const t = clock.getElapsedTime() * 0.75
    const posAttr = geometryRef.current.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    const targetMouseX = mouse.current.x * 12
    const targetMouseZ = mouse.current.y * 8

    for (let i = 0; i < numParticles; i++) {
      const x = baseCoords[i * 2]
      const z = baseCoords[i * 2 + 1]

      let y = Math.sin(x * 0.18 + z * 0.15 + t * 1.1) * 3.2
      y += Math.cos(x * 0.1 - z * 0.2 + t * 0.8) * 2.2
      y += Math.sin((x + z) * 0.06 + t * 0.5) * 1.5

      const dx = x - targetMouseX
      const dz = z - targetMouseZ
      const distSq = dx * dx + dz * dz
      const mouseInfluence = Math.exp(-distSq / 60) * 2.2
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
        size={isDark ? 0.22 : 0.25}
        vertexColors
        transparent
        opacity={isDark ? 0.85 : 0.9}
        map={circleTexture || undefined}
        alphaTest={0.01}
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
    const targetY = mouse.current.y * 2.0 + 12.0

    camera.position.x = lerp(camera.position.x, targetX, 0.035)
    camera.position.y = lerp(camera.position.y, targetY, 0.035)
    camera.lookAt(0, -1, -2)
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      minHeight: '100vh',
      zIndex: 1,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Light Mode background gradient */}
      {!isDark && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 40%, #F5F6F8 0%, #E2E4E9 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* R3F WebGL 3D Canvas */}
      <Canvas
        camera={{ position: [0, 12, 19], fov: 50, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 12, 50]} />

        <Suspense fallback={null}>
          <ambientLight intensity={isDark ? 0.5 : 0.9} />
          <directionalLight position={[10, 20, 15]} intensity={isDark ? 0.9 : 1.2} />

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
