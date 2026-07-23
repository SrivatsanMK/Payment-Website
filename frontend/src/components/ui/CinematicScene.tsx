/// <reference types="@react-three/fiber" />
/**
 * CinematicScene.tsx — Ultra-High Contrast 3D Sweeping Particle Mesh Wave
 * Fixes Light Mode fog washout: In Light Mode, particles use deep charcoal/black tones (#090d16, #1e293b)
 * and expanded fog distance so the 3D particle motion is 100% bold, crisp, and striking.
 */
import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
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

  // Grid Dimensions
  const cols = 130
  const rows = 85
  const numParticles = cols * rows

  // Initial grid position generation
  const { positions, baseCoords } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3)
    const base = new Float32Array(numParticles * 2)

    let idx = 0
    let bIdx = 0
    const xSpan = 80
    const zSpan = 50

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1)
        const v = r / (rows - 1)

        const x = (u - 0.5) * xSpan
        const z = (v - 0.5) * zSpan - 4
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

  // Particle Colors — Deep high-contrast dark particles in Light Mode
  const colors = useMemo(() => {
    const colArray = new Float32Array(numParticles * 3)
    const colorObj = new THREE.Color()

    for (let i = 0; i < numParticles; i++) {
      const rand = Math.random()

      if (isDark) {
        // Dark Mode: Bright White & Silver on Pure Black
        if (rand > 0.75) {
          colorObj.set('#ffffff') // Pure White
        } else if (rand > 0.35) {
          colorObj.set('#e2e8f0') // Silver
        } else {
          colorObj.set('#a0aec0') // Slate Gray
        }
      } else {
        // Light Mode: Deep Slate Black & Dark Charcoal so 3D wave pops boldly on Light background!
        if (rand > 0.7) {
          colorObj.set('#020617') // Deepest Midnight Slate
        } else if (rand > 0.35) {
          colorObj.set('#0f172a') // Dark Slate
        } else {
          colorObj.set('#1e293b') // Charcoal Slate
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

      // Sweeping wave equations
      let y = Math.sin(x * 0.18 + z * 0.15 + t * 1.1) * 3.2
      y += Math.cos(x * 0.1 - z * 0.2 + t * 0.8) * 2.2
      y += Math.sin((x + z) * 0.06 + t * 0.5) * 1.5

      // Mouse interaction
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
        size={isDark ? 0.09 : 0.105}
        vertexColors
        transparent
        opacity={isDark ? 0.95 : 0.98}
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
      {/* Light Mode soft background gradient */}
      {!isDark && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 40%, #F8FAFC 0%, #E2E8F0 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* R3F WebGL 3D Canvas */}
      <Canvas
        camera={{ position: [0, 12, 19], fov: 50, near: 0.1, far: 140 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <color attach="background" args={[bgColor]} />
        {/* Fog distance expanded in Light Mode to prevent washing out dark particles */}
        <fog attach="fog" args={[bgColor, isDark ? 12 : 28, isDark ? 50 : 90]} />

        <ambientLight intensity={isDark ? 0.5 : 1.0} />
        <directionalLight position={[10, 20, 15]} intensity={isDark ? 0.9 : 1.4} />

        <ParticleWave mouse={mouse} theme={theme} />
        <CameraRig mouse={mouse} />
      </Canvas>
    </div>
  )
}

export default CinematicScene
