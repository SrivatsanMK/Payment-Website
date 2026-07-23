/// <reference types="@react-three/fiber" />
/**
 * CinematicScene.tsx
 * An ultra-premium, infinite 3D particle universe inspired by Google Antigravity.
 * Features thousands of micro-elements (dots, capsules, flakes) that drift
 * continuously through Z-depth with subtle mouse parallax.
 */
import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─── Infinite Particle Field ─────────────────────────────────────────────────

interface InfiniteParticlesProps {
  count: number
  geometry: THREE.BufferGeometry
  theme: 'light' | 'dark'
  speed: number
  zRange: [number, number] // [minZ, maxZ]
  scaleRange: [number, number]
  opacityRange: [number, number]
}

function InfiniteParticles({
  count, geometry, theme, speed, zRange, scaleRange, opacityRange
}: InfiniteParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  
  // Store original positions and speeds for the update loop
  const particleData = useMemo(() => {
    const data = []
    const [minZ, maxZ] = zRange
    const depth = maxZ - minZ
    
    for (let i = 0; i < count; i++) {
      // Widespread X and Y to fill the screen
      const x = (Math.random() - 0.5) * 40
      const y = (Math.random() - 0.5) * 30
      const z = minZ + Math.random() * depth
      
      // Individual random speeds for parallax feel within the group
      const individualSpeed = speed * (0.5 + Math.random() * 1.5)
      
      // Random rotation
      const rx = Math.random() * Math.PI * 2
      const ry = Math.random() * Math.PI * 2
      const rz = Math.random() * Math.PI * 2
      
      // Random scale
      const scale = lerp(scaleRange[0], scaleRange[1], Math.random())
      
      data.push({ x, y, z, individualSpeed, rx, ry, rz, scale })
    }
    return data
  }, [count, speed, zRange, scaleRange])

  // Material setup (Dark vs Light mode)
  const material = useMemo(() => {
    const isDark = theme === 'dark'
    const color = isDark ? 0xffffff : 0x000000
    
    // We use a physical material for that premium soft shading
    return new THREE.MeshPhysicalMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.5,
      ior: 1.5,
      depthWrite: false, // Prevents z-fighting among overlapping transparent particles
    })
  }, [theme])

  // Initialization
  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    
    const [minO, maxO] = opacityRange
    const isDark = theme === 'dark'
    const baseColor = new THREE.Color(isDark ? 0xffffff : 0x000000)
    
    for (let i = 0; i < count; i++) {
      const d = particleData[i]
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(d.rx, d.ry, d.rz)
      dummy.scale.set(d.scale, d.scale, d.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      
      // Set individual colors/opacities via instance color if desired, 
      // but instance alpha isn't trivially supported without custom shaders.
      // We will vary the color's lightness slightly to simulate opacity/depth.
      const variance = lerp(minO, maxO, Math.random())
      const c = baseColor.clone()
      // In dark mode, lower variance = darker (looks more transparent).
      // In light mode, lower variance = lighter (looks more transparent).
      if (isDark) {
        c.multiplyScalar(variance)
      } else {
        c.lerp(new THREE.Color(0xffffff), 1 - variance)
      }
      meshRef.current.setColorAt(i, c)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }, [count, particleData, opacityRange, theme])

  // Animation Loop
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const [minZ, maxZ] = zRange
    const depth = maxZ - minZ
    
    for (let i = 0; i < count; i++) {
      const d = particleData[i]
      
      // Move forward continuously
      d.z += d.individualSpeed
      
      // If a particle passes the camera (Z > maxZ), wrap it back to minZ
      if (d.z > maxZ) {
        d.z -= depth
        // Re-randomize X and Y slightly when wrapping to avoid recognizable patterns
        d.x = (Math.random() - 0.5) * 40
        d.y = (Math.random() - 0.5) * 30
      }
      
      // Very slow drift rotation
      d.rx += 0.002
      d.ry += 0.003
      
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(d.rx, d.ry, d.rz)
      dummy.scale.set(d.scale, d.scale, d.scale)
      dummy.updateMatrix()
      
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  )
}

// ─── Scene Composition ───────────────────────────────────────────────────────

interface SceneProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  theme: 'light' | 'dark'
}

function InfiniteUniverse({ mouse, theme }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Geometries for our different particle types
  const dotGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), [])
  const capsuleGeo = useMemo(() => new THREE.CapsuleGeometry(0.5, 1, 4, 8), [])
  const flakeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  // Subtle Mouse Parallax
  useFrame(() => {
    if (!groupRef.current) return
    const { x, y } = mouse.current
    const smooth = 0.015 // Extremely soft easing

    // The whole universe subtly rotates and shifts
    groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, -y * 0.05, smooth)
    groupRef.current.rotation.y = lerp(groupRef.current.rotation.y, x * 0.05, smooth)
    
    groupRef.current.position.x = lerp(groupRef.current.position.x, x * 0.5, smooth)
    groupRef.current.position.y = lerp(groupRef.current.position.y, -y * 0.5, smooth)
  })

  // Lighting adjustments based on theme
  const isDark = theme === 'dark'

  return (
    <group ref={groupRef}>
      {/* Ambient lighting */}
      <ambientLight intensity={isDark ? 0.2 : 0.8} color="#ffffff" />
      <directionalLight position={[10, 10, 5]} intensity={isDark ? 0.5 : 1.2} color="#ffffff" />
      <directionalLight position={[-10, -10, -5]} intensity={isDark ? 0.3 : 0.6} color="#ffffff" />

      {/* Layer 1: Tiny dots (Background/Midground) */}
      <InfiniteParticles 
        count={2500}
        geometry={dotGeo}
        theme={theme}
        speed={0.008}
        zRange={[-40, 5]}
        scaleRange={[0.02, 0.06]}
        opacityRange={[0.1, 0.8]}
      />

      {/* Layer 2: Micro capsules (Midground/Foreground) */}
      <InfiniteParticles 
        count={800}
        geometry={capsuleGeo}
        theme={theme}
        speed={0.012}
        zRange={[-30, 8]}
        scaleRange={[0.03, 0.08]}
        opacityRange={[0.2, 0.6]}
      />

      {/* Layer 3: Glass flakes (Widespread) */}
      <InfiniteParticles 
        count={1200}
        geometry={flakeGeo}
        theme={theme}
        speed={0.01}
        zRange={[-35, 10]}
        scaleRange={[0.04, 0.12]}
        opacityRange={[0.05, 0.4]}
      />
    </group>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function CinematicScene({ mouse, theme }: SceneProps) {
  const isDark = theme === 'dark'
  const bgColor = isDark ? '#000000' : '#ffffff'

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
      style={{ position: 'fixed', inset: 0, zIndex: 1 }}
    >
      <color attach="background" args={[bgColor]} />
      {/* Fog ensures particles fade out smoothly in the distance */}
      <fog attach="fog" args={[bgColor, 15, 45]} />

      <Suspense fallback={null}>
        <InfiniteUniverse mouse={mouse} theme={theme} />
      </Suspense>
    </Canvas>
  )
}

export default CinematicScene
