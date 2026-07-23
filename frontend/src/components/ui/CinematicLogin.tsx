/**
 * CinematicLogin.tsx — Compact iPhone Liquid Glass Card
 * Features authentic iPhone Liquid Glass transparency (translucent frosted glass
 * allowing 3D background motion to be clearly visible moving behind the card),
 * compact card dimensions (390px width), 40px rounded corners, and full mobile/laptop responsiveness.
 */
import React, {
  useState, useEffect, useRef, useCallback, Suspense, lazy
} from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useMotionValue, useSpring, useTransform
} from 'framer-motion'
import {
  Lock, User, Eye, EyeOff, ArrowRight, Loader2, Sun, Moon
} from 'lucide-react'
import { Logo } from './Logo'
import { useTheme } from '../../context/ThemeContext'

// Lazy-load the 3D particle wave background
const CinematicSceneLazy = lazy(() =>
  import('./CinematicScene').then(m => ({ default: m.CinematicScene }))
)

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
}

// ─── iPhone Liquid Glass Pill Input (Height: 48px, Radius: 18px) ───────────────

interface PillGlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  isDark: boolean
  rightSlot?: React.ReactNode
  onChange: (val: string) => void
}

const PillGlassInput: React.FC<PillGlassInputProps> = ({
  icon: Icon, isDark, rightSlot, onChange, ...rest
}) => {
  const hasRight = !!rightSlot
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Icon Left */}
      <span style={{
        position: 'absolute', left: 16, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        color: focused
          ? (isDark ? '#ffffff' : '#0f172a')
          : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)'),
        transition: 'color 200ms ease',
        pointerEvents: 'none',
      }}>
        <Icon size={16} strokeWidth={1.8} />
      </span>

      {/* Input Field */}
      <input
        {...rest}
        onChange={e => onChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true)
          if (rest.onFocus) rest.onFocus(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          if (rest.onBlur) rest.onBlur(e)
        }}
        style={{
          display: 'block',
          width: '100%',
          height: 48,
          padding: `0 ${hasRight ? '44px' : '18px'} 0 44px`,
          borderRadius: 18,
          border: isDark
            ? (focused ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.15)')
            : (focused ? '1px solid rgba(15,23,42,0.3)' : '1px solid rgba(255,255,255,0.9)'),
          background: isDark
            ? (focused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)')
            : (focused ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)'),
          boxShadow: isDark
            ? (focused
                ? '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)'
                : 'inset 0 1px 1px rgba(255,255,255,0.1)')
            : (focused
                ? '0 6px 20px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,1)'
                : '0 2px 8px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.8)'),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: isDark ? '#ffffff' : '#0f172a',
          fontSize: 13.5,
          fontWeight: 400,
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'all 200ms ease',
          boxSizing: 'border-box',
          caretColor: isDark ? '#ffffff' : '#0f172a',
        } as React.CSSProperties}
      />

      {/* Trailing Right Slot (eye icon) */}
      {hasRight && (
        <div style={{
          position: 'absolute', right: 14, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center',
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
  onSubmit,
}) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [mounted, setMounted] = useState(false)
  const mouseRef = useRef({ x: 0, y: 0 })
  const cardRef  = useRef<HTMLDivElement>(null)

  // Framer Motion tilt physics
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotX = useSpring(useTransform(rawY, [-1, 1], [3, -3]), { stiffness: 45, damping: 24 })
  const rotY = useSpring(useTransform(rawX, [-1, 1], [-3, 3]), { stiffness: 45, damping: 24 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    setMounted(true)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const onCardMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const r  = cardRef.current.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top)  / r.height
    rawX.set(nx * 2 - 1)
    rawY.set(ny * 2 - 1)
  }, [rawX, rawY])

  const onCardLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  // Fade Up Variant
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark ? '#000000' : '#EAEBED',
      fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      transition: 'background 400ms ease',
    }}>

      {/* ── Full Screen 3D Particle Wave Canvas ─────────────────────────── */}
      {mounted && (
        <Suspense fallback={null}>
          <CinematicSceneLazy mouse={mouseRef} theme={theme} />
        </Suspense>
      )}

      {/* ── Top Right Theme Toggle ────────────────────────────────────────── */}
      <motion.button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed', top: 24, right: 24, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 42, height: 42, borderRadius: '50%',
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)',
          boxShadow: isDark
            ? '0 8px 24px rgba(0,0,0,0.4), inset 0 1px rgba(255,255,255,0.25)'
            : '0 8px 24px rgba(0,0,0,0.08), inset 0 1px rgba(255,255,255,1)',
          cursor: 'pointer',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {isDark
          ? <Moon size={17} color="#ffffff" strokeWidth={1.8} />
          : <Sun  size={17} color="#0f172a" strokeWidth={1.8} />
        }
      </motion.button>

      {/* ── Centered Compact iPhone Liquid Glass Card ────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 16,
        boxSizing: 'border-box',
      }}>

        {/* Entrance Animation */}
        <motion.div
          style={{ perspective: 1200 }}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >

          {/* Floating Motion & 3D Tilt Wrapper */}
          <motion.div
            ref={cardRef}
            style={{
              rotateX: rotX,
              rotateY: rotY,
              transformStyle: 'preserve-3d',
            }}
            animate={{
              y: [-4, 4, -4],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            onMouseMove={onCardMove}
            onMouseLeave={onCardLeave}
          >

            {/* Compact iPhone Liquid Glass Card (Width: 390px, Radius: 38px) */}
            <div style={{
              position: 'relative',
              width: 390,
              maxWidth: '90vw',
              borderRadius: 38,
              padding: '36px 30px 28px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              // True iPhone Liquid Glass Transparency — translucent glass fill so 3D background motion is clearly visible behind card!
              background: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.22)'
                : '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: isDark
                ? `0 30px 80px rgba(0,0,0,0.6), 
                   inset 0 1px 1px rgba(255,255,255,0.4), 
                   inset 0 -1px 1px rgba(0,0,0,0.3)`
                : `0 24px 70px rgba(0,0,0,0.06), 
                   inset 0 1px 2px rgba(255,255,255,1), 
                   inset 0 -1px 1px rgba(0,0,0,0.03)`,
              overflow: 'hidden',
            }}>

              {/* Top Liquid Reflection Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '32%',
                background: isDark
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)',
                pointerEvents: 'none',
              }} />

              {/* Top Curved Edge Specular Highlight */}
              <div style={{
                position: 'absolute', top: 0, left: 30, right: 30, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                pointerEvents: 'none',
              }} />

              {/* ── CARD TOP: Logo & Subtitle ────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 24, position: 'relative' }}>

                {/* Green Glide Logistics Logo */}
                <motion.div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                  {...fadeUp(0.15)}
                >
                  <Logo size="md" />
                </motion.div>

                {/* Customer Portal Title */}
                <motion.h1
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 600,
                    color: isDark ? '#ffffff' : '#0f172a',
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                  }}
                  {...fadeUp(0.25)}
                >
                  {title}
                </motion.h1>

              </div>

              {/* ── CARD MIDDLE: Form & Pill Inputs ───────────────────────── */}
              <motion.form
                onSubmit={onSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  width: '100%',
                  position: 'relative',
                }}
                {...fadeUp(0.35)}
              >

                {/* Customer ID / Email Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.65)',
                    marginBottom: 7,
                    paddingLeft: 4,
                  }}>
                    {identifierLabel}
                  </label>
                  <PillGlassInput
                    id="gg-identifier"
                    icon={User}
                    isDark={isDark}
                    type="text"
                    value={identifier}
                    onChange={onIdentifierChange}
                    placeholder={identifierPlaceholder}
                    required
                    autoComplete="username"
                    aria-label={identifierLabel}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 7,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}>
                    <label style={{
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.65)',
                    }}>
                      {passwordLabel}
                    </label>
                    <Link
                      to={forgotPasswordLink}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.65)',
                        textDecoration: 'none',
                        transition: 'color 200ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#ffffff' : '#0f172a')}
                      onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.65)')}
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <PillGlassInput
                    id="gg-password"
                    icon={Lock}
                    isDark={isDark}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={onPasswordChange}
                    placeholder="Enter your password"
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
                          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.45)',
                          transition: 'color 200ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#ffffff' : '#0f172a')}
                        onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.45)')}
                      >
                        {showPassword
                          ? <EyeOff size={15} strokeWidth={1.8} />
                          : <Eye    size={15} strokeWidth={1.8} />
                        }
                      </button>
                    }
                  />
                </div>

                {/* ── CARD BOTTOM: White Liquid Glass Button (48px Height, 16px Radius) ── */}
                <div style={{ paddingTop: 4 }}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: 48,
                      borderRadius: 16,
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 14.5,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      overflow: 'hidden',
                      opacity: loading ? 0.75 : 1,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px rgba(255,255,255,1)',
                      transition: 'all 200ms ease',
                    } as React.CSSProperties}
                    whileHover={loading ? {} : {
                      y: -2,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    } as any}
                    whileTap={loading ? {} : { scale: 0.98 } as any}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      {loading ? (
                        <Loader2 size={17} className="animate-spin" color="#0f172a" />
                      ) : (
                        <>
                          {submitLabel}
                          <motion.span
                            initial={{ x: 0 }}
                            whileHover={{ x: 4 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <ArrowRight size={16} strokeWidth={2.2} color="#0f172a" />
                          </motion.span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>

              </motion.form>

              {/* ── CARD FOOTER: SSL Encrypted • JWT Protected ──────────────── */}
              <motion.div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.45)',
                  fontSize: 10.5,
                  fontWeight: 400,
                  position: 'relative',
                }}
                {...fadeUp(0.45)}
              >
                <Lock size={11} strokeWidth={1.8} />
                <span>SSL Encrypted • JWT Protected</span>
              </motion.div>

            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default CinematicLogin
