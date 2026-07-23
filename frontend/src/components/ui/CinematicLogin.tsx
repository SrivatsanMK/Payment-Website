/**
 * CinematicLogin.tsx
 * World-class premium login interface — Apple Liquid Glass card floating above
 * a Three.js cinematic 3D environment with full mouse parallax, card tilt,
 * cursor spotlight, shimmer sweep, ripple interactions and staggered entrance.
 */
import React, {
  useState, useEffect, useRef, useCallback, Suspense, lazy
} from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useMotionValue, useSpring, useTransform, AnimatePresence
} from 'framer-motion'
import {
  Lock, User, Eye, EyeOff, ArrowRight, Loader2, Sun, Moon
} from 'lucide-react'
import { Logo } from './Logo'
import { useTheme } from '../../context/ThemeContext'

// Lazy-load the heavy 3D scene so Three.js is only bundled when login is visited
const CinematicSceneLazy = lazy(() =>
  import('./CinematicScene').then(m => ({ default: m.CinematicScene }))
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ripple { id: number; x: number; y: number }

export interface CinematicLoginProps {
  title: string
  identifierLabel: string
  identifierPlaceholder: string
  passwordLabel: string
  forgotPasswordLink: string
  submitLabel: string
  loading: boolean
  identifier: string
  password: string
  showPassword: boolean
  onIdentifierChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onTogglePassword: () => void
  onSubmit: (e: React.FormEvent) => void
  accentColor: 'emerald' | 'cyan'
}

// ─── Accent Token Helper ──────────────────────────────────────────────────────

function accentTokens(c: 'emerald' | 'cyan') {
  const isEm = c === 'emerald'
  return {
    rgb: isEm ? '16,185,129' : '6,182,212',
    hex: isEm ? '#10b981' : '#06b6d4',
    from: isEm ? '#065f46' : '#0c4a6e',
    shadow: isEm ? 'rgba(16,185,129,0.38)' : 'rgba(6,182,212,0.38)',
    glow: isEm ? 'rgba(16,185,129,0.55)' : 'rgba(6,182,212,0.55)',
  }
}

// ─── Glass Input ─────────────────────────────────────────────────────────────

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  focused: boolean
  accentRgb: string
  accentHex: string
  rightSlot?: React.ReactNode
  onChange: (val: string) => void
}

const GlassInput: React.FC<GlassInputProps> = ({
  icon: Icon, focused, accentRgb, accentHex, rightSlot, onChange, ...rest
}) => {
  const hasRight = !!rightSlot
  return (
    <div style={{ position: 'relative' }}>
      {/* Animated glow ring on focus */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -1.5,
          borderRadius: 16,
          border: `1.5px solid ${accentHex}`,
          boxShadow: `0 0 18px rgba(${accentRgb},0.28), 0 0 6px rgba(${accentRgb},0.18) inset`,
          pointerEvents: 'none',
        }}
        animate={{ opacity: focused ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
      {/* Leading icon */}
      <span style={{
        position: 'absolute', left: 14, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        color: focused ? accentHex : 'rgba(255,255,255,0.28)',
        transition: 'color 0.22s ease',
        pointerEvents: 'none',
      }}>
        <Icon size={15} strokeWidth={1.7} />
      </span>
      {/* Native input */}
      <input
        {...rest}
        onChange={e => onChange(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          padding: `12px ${hasRight ? '44px' : '16px'} 12px 40px`,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          background: focused
            ? 'rgba(255,255,255,0.09)'
            : 'rgba(255,255,255,0.045)',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 14,
          fontWeight: 500,
          outline: 'none',
          fontFamily: 'inherit',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'background 0.22s ease, border-color 0.22s ease',
          boxSizing: 'border-box',
          caretColor: accentHex,
        } as React.CSSProperties}
      />
      {/* Trailing slot (eye toggle etc.) */}
      {hasRight && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center', paddingRight: 14,
        }}>
          {rightSlot}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CinematicLogin: React.FC<CinematicLoginProps> = ({
  title, identifierLabel, identifierPlaceholder, passwordLabel,
  forgotPasswordLink, submitLabel, loading, identifier, password,
  showPassword, onIdentifierChange, onPasswordChange, onTogglePassword,
  onSubmit, accentColor,
}) => {
  const { theme, toggleTheme } = useTheme()

  const [mounted, setMounted]   = useState(false)
  const [ripples, setRipples]   = useState<Ripple[]>([])
  const [idFocus, setIdFocus]   = useState(false)
  const [pwFocus, setPwFocus]   = useState(false)
  const [spot, setSpot]         = useState({ x: 50, y: 50, o: 0 })

  const mouseRef = useRef({ x: 0, y: 0 })
  const cardRef  = useRef<HTMLDivElement>(null)

  // Framer Motion spring card tilt
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotX = useSpring(useTransform(rawY, [-1, 1], [5, -5]),  { stiffness: 22, damping: 15 })
  const rotY = useSpring(useTransform(rawX, [-1, 1], [-5, 5]),  { stiffness: 22, damping: 15 })

  const { rgb, hex, from, shadow, glow } = accentTokens(accentColor)

  // ── Mount: global mouse tracking for 3D scene parallax ──────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    setMounted(true)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Card mouse handlers (tilt + spotlight) ────────────────────────────────
  const onCardMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const r  = cardRef.current.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top)  / r.height
    rawX.set(nx * 2 - 1)
    rawY.set(ny * 2 - 1)
    setSpot({ x: nx * 100, y: ny * 100, o: 1 })
  }, [rawX, rawY])

  const onCardLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
    setSpot(p => ({ ...p, o: 0 }))
  }, [rawX, rawY])

  // ── Ripple on button click ─────────────────────────────────────────────────
  const addRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r  = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }])
    setTimeout(() => setRipples(p => p.filter(v => v.id !== id)), 900)
  }, [])

  // ── Cinematic entrance variants ────────────────────────────────────────────
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.75, ease: [0.23, 1, 0.32, 1] as const },
  })

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#000000',
      fontFamily: "'Inter','SF Pro Display','Manrope','Space Grotesk',system-ui,sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }}>

      {/* ── 3D Cinematic Scene (lazy) ───────────────────────────────────────── */}
      {mounted && (
        <Suspense fallback={null}>
          <CinematicSceneLazy mouse={mouseRef} accentColor={accentColor} />
        </Suspense>
      )}

      {/* ── Theme toggle (top-right) ────────────────────────────────────────── */}
      <motion.button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed', top: 22, right: 22, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.11)' } as any}
        whileTap={{ scale: 0.93 } as any}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        {theme === 'dark'
          ? <Sun  size={15} color="#fbbf24" />
          : <Moon size={15} color="rgba(255,255,255,0.7)" />
        }
      </motion.button>

      {/* ── Login card overlay ──────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'none',
      }}>

        {/* Entrance animation wrapper */}
        <motion.div
          style={{ perspective: 1400, pointerEvents: 'auto' }}
          initial={{ opacity: 0, scale: 0.9, y: 44 }}
          animate={{ opacity: 1, scale: 1,   y:  0 }}
          transition={{ duration: 1.15, ease: [0.23, 1, 0.32, 1], delay: 0.45 }}
        >
          {/* 3-D tilt wrapper */}
          <motion.div
            ref={cardRef}
            style={{
              rotateX: rotX,
              rotateY: rotY,
              transformStyle: 'preserve-3d',
            }}
            onMouseMove={onCardMove}
            onMouseLeave={onCardLeave}
          >

            {/* Ambient outer glow pulse */}
            <motion.div
              style={{
                position: 'absolute', inset: -32, borderRadius: 72,
                background: `radial-gradient(ellipse at 50% 60%, ${glow}, transparent 62%)`,
                filter: 'blur(30px)',
                pointerEvents: 'none',
              }}
              animate={{ opacity: [0.45, 0.7, 0.45] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Gradient border shell (1px padding = gradient border trick) */}
            <div style={{
              position: 'relative',
              padding: '1px',
              borderRadius: 30,
              background: `linear-gradient(
                145deg,
                rgba(255,255,255,0.32) 0%,
                rgba(255,255,255,0.08) 35%,
                rgba(${rgb},0.26) 70%,
                rgba(255,255,255,0.14) 100%
              )`,
            }}>

              {/* ── Inner glass card ──────────────────────────────────────────── */}
              <div style={{
                position: 'relative',
                borderRadius: 29,
                overflow: 'hidden',
                width: 390,
                background: 'rgba(8,8,10,0.55)',
                backdropFilter: 'blur(72px) saturate(190%) brightness(1.05)',
                WebkitBackdropFilter: 'blur(72px) saturate(190%) brightness(1.05)',
                boxShadow: `
                  0 0 0 0.5px rgba(255,255,255,0.07) inset,
                  0 2.5px 0 rgba(255,255,255,0.11) inset,
                  0 -1px 0 rgba(255,255,255,0.04) inset,
                  0 72px 144px rgba(0,0,0,0.98),
                  0 28px 56px rgba(0,0,0,0.88)
                `,
              }}>

                {/* Layer A: diagonal inner highlight */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 30%, transparent 50%)',
                  pointerEvents: 'none',
                }} />

                {/* Layer B: top specular edge */}
                <div style={{
                  position: 'absolute', top: 0, left: 24, right: 24, height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)',
                  pointerEvents: 'none',
                }} />

                {/* Layer C: bottom inner shadow */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 64,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)',
                  pointerEvents: 'none',
                }} />

                {/* Layer D: left edge specular */}
                <div style={{
                  position: 'absolute', top: 24, left: 0, bottom: 24, width: 1,
                  background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)',
                  pointerEvents: 'none',
                }} />

                {/* Layer E: cursor spotlight */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(340px circle at ${spot.x}% ${spot.y}%, rgba(${rgb},0.15), transparent 62%)`,
                  opacity: spot.o,
                  transition: 'opacity 0.48s ease',
                  pointerEvents: 'none',
                }} />

                {/* Layer F: SVG noise (frosted glass texture) */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  opacity: 0.032,
                  mixBlendMode: 'overlay' as const,
                  pointerEvents: 'none',
                }} />

                {/* Layer G: animated shimmer sweep */}
                <motion.div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.06) 50%, transparent 62%)',
                    pointerEvents: 'none',
                  }}
                  animate={{ x: ['-130%', '230%'] }}
                  transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 12, ease: 'easeInOut', delay: 2 }}
                />

                {/* ── Card content ────────────────────────────────────────────── */}
                <div style={{ position: 'relative', padding: '36px 32px 32px' }}>

                  {/* Logo + Title section */}
                  <motion.div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}
                    {...fadeUp(0.75)}
                  >
                    {/* Logo with glow */}
                    <div style={{
                      width: '100%', marginBottom: 16,
                      filter: `drop-shadow(0 0 20px rgba(${rgb},0.22)) drop-shadow(0 0 48px rgba(${rgb},0.1))`,
                    }}>
                      <Logo size="md" />
                    </div>

                    {/* Title */}
                    <h1 style={{
                      margin: '0 0 10px',
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.92)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.2,
                    }}>
                      {title}
                    </h1>

                    {/* Accent line */}
                    <motion.div
                      style={{
                        height: 2, borderRadius: 2,
                        background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: 46 }}
                      transition={{ delay: 1.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </motion.div>

                  {/* ── Form ──────────────────────────────────────────────────── */}
                  <motion.form
                    onSubmit={onSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    {...fadeUp(0.9)}
                  >

                    {/* Identifier field */}
                    <div>
                      <label
                        htmlFor="cin-identifier"
                        style={{
                          display: 'block',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.36)',
                          marginBottom: 7,
                        }}
                      >
                        {identifierLabel}
                      </label>
                      <GlassInput
                        id="cin-identifier"
                        icon={User}
                        focused={idFocus}
                        accentRgb={rgb}
                        accentHex={hex}
                        type="text"
                        value={identifier}
                        onChange={onIdentifierChange}
                        placeholder={identifierPlaceholder}
                        onFocus={() => setIdFocus(true)}
                        onBlur={() => setIdFocus(false)}
                        required
                        autoComplete="username"
                        aria-label={identifierLabel}
                      />
                    </div>

                    {/* Password field */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                        <label
                          htmlFor="cin-password"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.36)',
                          }}
                        >
                          {passwordLabel}
                        </label>
                        <Link
                          to={forgotPasswordLink}
                          style={{
                            fontSize: 11, fontWeight: 600,
                            color: hex, textDecoration: 'none',
                            opacity: 0.82,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.82')}
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <GlassInput
                        id="cin-password"
                        icon={Lock}
                        focused={pwFocus}
                        accentRgb={rgb}
                        accentHex={hex}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={onPasswordChange}
                        placeholder="Enter your password"
                        onFocus={() => setPwFocus(true)}
                        onBlur={() => setPwFocus(false)}
                        required
                        autoComplete="current-password"
                        aria-label={passwordLabel}
                        rightSlot={
                          <button
                            type="button"
                            onClick={onTogglePassword}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            style={{
                              background: 'none', border: 'none',
                              cursor: 'pointer', padding: 0,
                              display: 'flex', alignItems: 'center',
                              color: 'rgba(255,255,255,0.36)',
                              transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.36)')}
                          >
                            {showPassword
                              ? <EyeOff size={15} strokeWidth={1.7} />
                              : <Eye    size={15} strokeWidth={1.7} />
                            }
                          </button>
                        }
                      />
                    </div>

                    {/* ── Submit Button ────────────────────────────────────────── */}
                    <div style={{ paddingTop: 8 }}>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        onClick={addRipple}
                        style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '100%', padding: '13.5px 0',
                          borderRadius: 14,
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          background: `linear-gradient(135deg, ${from} 0%, ${hex} 65%)`,
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: '0.015em',
                          fontFamily: 'inherit',
                          overflow: 'hidden',
                          opacity: loading ? 0.7 : 1,
                          boxShadow: `
                            0 8px 32px ${shadow},
                            0 2px 0 rgba(255,255,255,0.16) inset,
                            0 -1px 0 rgba(0,0,0,0.3) inset
                          `,
                          WebkitFontSmoothing: 'antialiased',
                        } as React.CSSProperties}
                        whileHover={loading ? {} : {
                          scale: 1.016,
                          boxShadow: `0 12px 44px ${glow}, 0 2px 0 rgba(255,255,255,0.16) inset`,
                        } as any}
                        whileTap={loading ? {} : { scale: 0.984 } as any}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                      >
                        {/* Button: top glass sheen */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0,
                          height: '50%',
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)',
                          borderRadius: '14px 14px 0 0',
                          pointerEvents: 'none',
                        }} />

                        {/* Button: continuous shimmer sweep */}
                        <motion.div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.24) 50%, transparent 62%)',
                            pointerEvents: 'none',
                          }}
                          animate={{ x: ['-130%', '230%'] }}
                          transition={{ duration: 1.9, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
                        />

                        {/* Button: click ripples */}
                        <AnimatePresence>
                          {ripples.map(r => (
                            <motion.span
                              key={r.id}
                              style={{
                                position: 'absolute',
                                left: r.x - 64, top: r.y - 64,
                                width: 128, height: 128,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.24)',
                                pointerEvents: 'none',
                              }}
                              initial={{ scale: 0, opacity: 0.72 }}
                              animate={{ scale: 4.8, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.85, ease: 'easeOut' }}
                            />
                          ))}
                        </AnimatePresence>

                        {/* Button: label */}
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {loading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <>{submitLabel} <ArrowRight size={15} strokeWidth={2.5} /></>
                          }
                        </span>
                      </motion.button>
                    </div>

                  </motion.form>

                  {/* ── Footer micro-text ─────────────────────────────────────── */}
                  <motion.p
                    style={{
                      margin: '20px 0 0',
                      fontSize: 10.5,
                      color: 'rgba(255,255,255,0.22)',
                      textAlign: 'center',
                      letterSpacing: '0.04em',
                      lineHeight: 1.5,
                    }}
                    {...fadeUp(1.15)}
                  >
                    SSL Encrypted · JWT Protected · All activity is monitored
                  </motion.p>

                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default CinematicLogin
