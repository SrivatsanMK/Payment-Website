/// <reference types="@react-three/fiber" />
/**
 * CinematicScene.tsx
 * Premium Three.js 3D environment — glass spheres, chrome rings,
 * crystal shards, particles, animated lights, bloom post-processing,
 * and full mouse-parallax across three depth layers.
 */
import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, MeshTransmissionMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type V3 = [number, number, number]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─── Glass Sphere ─────────────────────────────────────────────────────────────
interface SphereProps { pos: V3; r: number; spd: number; dly: number }

function GlassSphere({ pos, r, spd, dly }: SphereProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const [ox, oy] = pos

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * spd + dly
    ref.current.position.y = oy + Math.sin(t) * 0.28
    ref.current.position.x = ox + Math.sin(t * 0.6) * 0.1
    ref.current.rotation.x = t * 0.07
    ref.current.rotation.y = t * 0.11
  })

  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[r, 48, 48]} />
      <MeshTransmissionMaterial
        backside
        samples={3}
        thickness={0.55}
        roughness={0.04}
        transmission={1}
        ior={1.45}
        chromaticAberration={0.028}
        anisotropy={0.18}
        distortion={0.14}
        distortionScale={0.09}
        temporalDistortion={0.05}
        color="white"
        envMapIntensity={0.55}
        attenuationColor="#ffffff"
        attenuationDistance={0.6}
      />
    </mesh>
  )
}

// ─── Small Glass Orb (cheaper material) ──────────────────────────────────────
interface OrbProps { pos: V3; r: number; spd: number; dly: number }

function GlassOrb({ pos, r, spd, dly }: OrbProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const [ox, oy] = pos

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * spd + dly
    ref.current.position.y = oy + Math.sin(t) * 0.22
    ref.current.position.x = ox + Math.cos(t * 0.5) * 0.08
    ref.current.rotation.x = t * 0.09
    ref.current.rotation.y = t * 0.13
  })

  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[r, 32, 32]} />
      <meshPhysicalMaterial
        color="#f5faff"
        metalness={0.0}
        roughness={0.02}
        transmission={0.92}
        ior={1.5}
        thickness={0.4}
        transparent
        opacity={0.88}
        envMapIntensity={1.2}
      />
    </mesh>
  )
}

// ─── Chrome Ring ──────────────────────────────────────────────────────────────
interface RingProps { pos: V3; s: number; spd: number; tiltSeed?: number }

function ChromeRing({ pos, s, spd, tiltSeed = 0 }: RingProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const [ox, oy] = pos

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * spd + tiltSeed
    ref.current.rotation.x = t + tiltSeed * 0.5
    ref.current.rotation.z = t * 0.65 + tiltSeed
    ref.current.position.y = oy + Math.sin(t * 0.48) * 0.22
    ref.current.position.x = ox + Math.cos(t * 0.32) * 0.1
  })

  return (
    <mesh ref={ref} position={pos} scale={s}>
      <torusGeometry args={[1, 0.038, 16, 128]} />
      <meshStandardMaterial
        color="#dddddd"
        metalness={1}
        roughness={0.045}
        envMapIntensity={2.8}
        emissive="#ffffff"
        emissiveIntensity={0.022}
      />
    </mesh>
  )
}

// ─── Crystal Shard (Octahedron) ───────────────────────────────────────────────
interface ShardProps { pos: V3; s: number; spd: number; dly: number }

function CrystalShard({ pos, s, spd, dly }: ShardProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const [ox, oy] = pos

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * spd + dly
    ref.current.rotation.x = t * 0.55
    ref.current.rotation.y = t * 0.82
    ref.current.rotation.z = t * 0.3
    ref.current.position.y = oy + Math.sin(t * 1.1) * 0.18
    ref.current.position.x = ox + Math.cos(t * 0.72) * 0.09
  })

  return (
    <mesh ref={ref} position={pos} scale={s}>
      <octahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color="#eef5ff"
        metalness={0.08}
        roughness={0.0}
        transmission={0.86}
        ior={1.95}
        thickness={0.28}
        transparent
        opacity={0.88}
        envMapIntensity={1.6}
        emissive="#aaddff"
        emissiveIntensity={0.018}
      />
    </mesh>
  )
}

// ─── Thin Metallic Disc (accent object) ──────────────────────────────────────
function MetallicDisc({ pos, s, spd }: { pos: V3; s: number; spd: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const [ox, oy] = pos

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * spd
    ref.current.rotation.y = t
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.5 + 0.4
    ref.current.position.y = oy + Math.sin(t * 0.55) * 0.18
    ref.current.position.x = ox + Math.cos(t * 0.38) * 0.12
  })

  return (
    <mesh ref={ref} position={pos} scale={s}>
      <cylinderGeometry args={[1, 1, 0.05, 64]} />
      <meshStandardMaterial
        color="#c8c8c8"
        metalness={1}
        roughness={0.06}
        envMapIntensity={3.5}
        emissive="#ffffff"
        emissiveIntensity={0.015}
      />
    </mesh>
  )
}

// ─── Particle Field ───────────────────────────────────────────────────────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null!)
  const N = 320

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      pos[i * 3]     = ((i * 127 + 31) % 300) / 300 * 30 - 15
      pos[i * 3 + 1] = ((i * 53 + 17) % 200) / 200 * 22 - 11
      pos[i * 3 + 2] = ((i * 79 + 43) % 200) / 200 * 16 - 10
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.y = t * 0.013
    ref.current.rotation.x = Math.sin(t * 0.004) * 0.04
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        transparent
        color="#ffffff"
        size={0.016}
        sizeAttenuation
        depthWrite={false}
        opacity={0.48}
      />
    </points>
  )
}

// ─── Volumetric Light Streaks (emissive planes) ───────────────────────────────
function LightStreak({ pos, rot, color }: { pos: V3; rot: V3; color: string }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(t * 0.4 + rot[0]) * 0.025
    ref.current.rotation.z = rot[2] + Math.sin(t * 0.15) * 0.05
  })


  return (
    <mesh ref={ref} position={pos} rotation={rot}>
      <planeGeometry args={[0.08, 18]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.04}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ─── Animated Lights ──────────────────────────────────────────────────────────
function AnimatedLights({ accent }: { accent: string }) {
  const l1 = useRef<THREE.PointLight>(null!)
  const l2 = useRef<THREE.PointLight>(null!)
  const l3 = useRef<THREE.PointLight>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (l1.current) l1.current.position.set(Math.sin(t * 0.22) * 9, Math.cos(t * 0.18) * 6, Math.sin(t * 0.14) * 5 + 4)
    if (l2.current) l2.current.position.set(Math.cos(t * 0.18) * 10, Math.sin(t * 0.22) * 7, Math.cos(t * 0.11) * 6 + 3)
    if (l3.current) l3.current.position.set(Math.sin(t * 0.28 + 2) * 6, Math.cos(t * 0.14 + 1) * 5, 5)
  })

  return (
    <>
      <ambientLight intensity={0.045} />
      <pointLight ref={l1} intensity={3.2} color="#ffffff" distance={30} decay={2} castShadow={false} />
      <pointLight ref={l2} intensity={2.4} color="#ddeeff" distance={25} decay={2} />
      <pointLight ref={l3} intensity={1.6} color={accent} distance={22} decay={2} />
      {/* Static fill lights */}
      <pointLight position={[-8, -5, 2]} intensity={0.9} color="#ffffff" distance={18} decay={2} />
      <pointLight position={[8, 5, 2]} intensity={0.7} color="#ffffff" distance={16} decay={2} />
    </>
  )
}

// ─── Parallax Scene (3 depth groups) ─────────────────────────────────────────
interface ParallaxProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  accent: string
}

function ParallaxScene({ mouse, accent }: ParallaxProps) {
  const bg  = useRef<THREE.Group>(null!)
  const mid = useRef<THREE.Group>(null!)
  const fg  = useRef<THREE.Group>(null!)

  useFrame(() => {
    const { x, y } = mouse.current
    const smooth = 0.032

    // Background moves least (0.3x)
    if (bg.current) {
      bg.current.position.x = lerp(bg.current.position.x, x * 0.32, smooth)
      bg.current.position.y = lerp(bg.current.position.y, -y * 0.26, smooth)
    }
    // Mid-ground (0.6x)
    if (mid.current) {
      mid.current.position.x = lerp(mid.current.position.x, x * 0.58, smooth)
      mid.current.position.y = lerp(mid.current.position.y, -y * 0.46, smooth)
    }
    // Foreground moves most (1.0x)
    if (fg.current) {
      fg.current.position.x = lerp(fg.current.position.x, x * 1.0, smooth)
      fg.current.position.y = lerp(fg.current.position.y, -y * 0.8, smooth)
    }
  })

  return (
    <>
      <AnimatedLights accent={accent} />

      {/* ── Background layer (Z -5 to -7) ──────────────────────────────── */}
      <group ref={bg}>
        <GlassSphere    pos={[-5.5,  2.2, -5.5]}  r={1.35}  spd={0.19}  dly={0}   />
        <GlassSphere    pos={[ 6.5, -1.2, -6.0]}  r={1.75}  spd={0.17}  dly={1.5} />
        <ChromeRing     pos={[-7.8,  1.0, -6.5]}  s={2.0}   spd={0.11}  tiltSeed={0.8} />
        <CrystalShard   pos={[ 5.5,  4.2, -5.2]}  s={0.68}  spd={0.21}  dly={0}   />
        <CrystalShard   pos={[-3.8, -4.2, -5.5]}  s={0.46}  spd={0.26}  dly={1.2} />
        <MetallicDisc   pos={[ 3.0,  5.5, -6.0]}  s={1.4}   spd={0.08}  />
        <LightStreak    pos={[-3,  0, -8]} rot={[0, 0, -0.25]}  color="#ffffff" />
        <LightStreak    pos={[ 4,  0, -8]} rot={[0, 0,  0.18]}  color={accent}  />
      </group>

      {/* ── Midground layer (Z -2 to -3.5) ─────────────────────────────── */}
      <group ref={mid}>
        <GlassSphere    pos={[ 4.8,  2.5, -2.8]}  r={0.88}  spd={0.29}  dly={2}   />
        <GlassSphere    pos={[-4.6, -2.1, -2.4]}  r={0.72}  spd={0.34}  dly={3}   />
        <GlassOrb       pos={[ 0.5, -3.8, -3.0]}  r={0.58}  spd={0.27}  dly={4}   />
        <GlassOrb       pos={[-2.2,  3.8, -3.2]}  r={0.42}  spd={0.31}  dly={5}   />
        <ChromeRing     pos={[ 6.8, -0.5, -3.2]}  s={1.35}  spd={0.21}  tiltSeed={1.5} />
        <ChromeRing     pos={[-6.8,  3.2, -4.0]}  s={1.05}  spd={0.17}  tiltSeed={2.2} />
        <CrystalShard   pos={[-1.2,  4.0, -3.0]}  s={0.29}  spd={0.24}  dly={2}   />
        <CrystalShard   pos={[ 3.8, -2.1, -2.5]}  s={0.21}  spd={0.31}  dly={3.2} />
        <MetallicDisc   pos={[-5.0, -3.5, -3.5]}  s={0.9}   spd={0.14}  />
      </group>

      {/* ── Foreground layer (Z 0 to +1.5) ─────────────────────────────── */}
      <group ref={fg}>
        <GlassOrb       pos={[-7.8, -1.5,  0.5]}  r={0.42}  spd={0.44}  dly={5}   />
        <GlassOrb       pos={[ 7.8,  1.2,  0.2]}  r={0.36}  spd={0.39}  dly={6}   />
        <GlassOrb       pos={[ 0.0,  5.5,  0.8]}  r={0.28}  spd={0.48}  dly={7}   />
        <ChromeRing     pos={[ 4.8, -3.8,  0.2]}  s={0.72}  spd={0.34}  tiltSeed={3} />
        <ChromeRing     pos={[-3.8,  4.8,  0.8]}  s={0.56}  spd={0.29}  tiltSeed={4} />
        <CrystalShard   pos={[ 2.2,  3.8,  0.8]}  s={0.16}  spd={0.41}  dly={3.5} />
        <CrystalShard   pos={[-2.8, -3.0,  0.5]}  s={0.13}  spd={0.38}  dly={4.5} />
        <MetallicDisc   pos={[-6.5,  2.0,  0.5]}  s={0.55}  spd={0.22}  />
      </group>

      <ParticleField />
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
interface SceneProps {
  mouse: React.MutableRefObject<{ x: number; y: number }>
  accentColor: 'emerald' | 'cyan'
}

export function CinematicScene({ mouse, accentColor }: SceneProps) {
  const accent = accentColor === 'emerald' ? '#10b981' : '#06b6d4'

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      dpr={[1, Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 2, 2)]}
      style={{ position: 'fixed', inset: 0, zIndex: 1 }}
    >
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 22, 42]} />

      <Suspense fallback={null}>
        <Environment background={false} preset="city" />
        <ParallaxScene mouse={mouse} accent={accent} />
      </Suspense>

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.32}
          luminanceSmoothing={0.88}
          intensity={1.25}
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  )
}

export default CinematicScene
