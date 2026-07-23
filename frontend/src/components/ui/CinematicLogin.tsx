/**
 * CinematicLogin.tsx — Green Glide Logistics VisionOS Apple Liquid Glass Card
 * Designed with Apple VisionOS aesthetics, floating card animations, 22px pill glass inputs,
 * white liquid glass button (62px height), and seamless light/dark mode support.
 * COMPLETELY REMOVED any footer text below the Sign In button.
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

// ─── Modern Pill Glass Input (22px radius, 56px height) ───────────────────────

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
        position: 'absolute', left: 20, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        color: focused
          ? (isDark ? '#ffffff' : '#171717')
          : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
        transition: 'color 300ms ease',
        pointerEvents: 'none',
      }}>
        <Icon size={18} strokeWidth={1.8} />
      </span>

      {/* Pill Input */}
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
          height: 56,
          padding: `0 ${hasRight ? '50px' : '22px'} 0 52px`,
          borderRadius: 22,
          border: 'none',
          background: isDark
            ? (focused ? 'rgba(30,30,30,0.65)' : 'rgba(18,18,18,0.45)')
            : (focused ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'),
          boxShadow: isDark
            ? (focused
                ? 'inset 0 1px 1px rgba(255,255,255,0.25), 0 0 18px rgba(255,255,255,0.1)'
                : 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.2)')
            : (focused
                ? 'inset 0 1px 1px rgba(255,255,255,0.9), 0 0 18px rgba(0,0,0,0.08)'
                : 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px rgba(0,0,0,0.04)'),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: isDark ? '#ffffff' : '#171717',
          fontSize: 15,
          fontWeight: 500,
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'all 300ms ease',
          boxSizing: 'border-box',
          caretColor: isDark ? '#ffffff' : '#171717',
        } as React.CSSProperties}
      />

      {/* Trailing Right Slot (eye icon etc) */}
      {hasRight && (
        <div style={{
          position: 'absolute', right: 18, top: 0, bottom: 0,
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
  const rotX = useSpring(useTransform(rawY, [-1, 1], [4, -4]), { stiffness: 40, damping: 22 })
  const rotY = useSpring(useTransform(rawX, [-1, 1], [-4, 4]), { stiffness: 40, damping: 22 })

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

  // Sequential Fade Up Variant (300ms smooth transitions)
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
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
      background: isDark ? '#000000' : '#F5F6F8',
      fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      transition: 'background 400ms ease',
    }}>

      {/* ── 3D Volumetric Particle Wave Canvas ─────────────────────────────── */}
      {mounted && (
        <Suspense fallback={null}>
          <CinematicSceneLazy mouse={mouseRef} theme={theme} />
        </Suspense>
      )}

      {/* ── Top Right Theme Toggle ONLY ───────────────────────────────────── */}
      <motion.button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed', top: 28, right: 28, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: '50%',
          background: isDark ? 'rgba(30,30,30,0.5)' : 'rgba(255,255,255,0.65)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px rgba(255,255,255,0.35)',
          cursor: 'pointer',
          border: 'none',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {isDark
          ? <Sun  size={18} color="#ffffff" strokeWidth={2} />
          : <Moon size={18} color="#171717" strokeWidth={2} />
        }
      </motion.button>

      {/* ── Centered Floating Apple VisionOS Liquid Glass Card ───────────── */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 20,
        boxSizing: 'border-box',
      }}>

        {/* Entrance animation wrapper */}
        <motion.div
          style={{ perspective: 1200 }}
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >

          {/* Floating Y-Motion & Mouse Tilt Wrapper */}
          <motion.div
            ref={cardRef}
            style={{
              rotateX: rotX,
              rotateY: rotY,
              transformStyle: 'preserve-3d',
            }}
            animate={{
              y: [-6, 6, -6],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            onMouseMove={onCardMove}
            onMouseLeave={onCardLeave}
          >

            {/* Glass Card Container (Width: 520px, Height: 760px, Radius: 36px) */}
            <div style={{
              position: 'relative',
              width: 520,
              maxHeight: '90vh',
              height: 760,
              borderRadius: 36,
              padding: '48px 44px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              // Apple Liquid Glass
              background: isDark
                ? 'rgba(22, 22, 22, 0.45)'
                : 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: `
                0 30px 90px rgba(0,0,0,.28),
                inset 0 1px rgba(255,255,255,.35)
              `,
              overflow: 'hidden',
            }}>

              {/* Top Glass Specular Reflection Highlight */}
              <div style={{
                position: 'absolute', top: 0, left: 30, right: 30, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                pointerEvents: 'none',
              }} />

              {/* ── CARD TOP: Logo & Title ──────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Green Glide Logistics Logo */}
                <motion.div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 24,
                  }}
                  {...fadeUp(0.3)}
                >
                  <Logo size="lg" />
                </motion.div>

                {/* Customer Portal Title */}
                <motion.h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 700,
                    color: isDark ? '#ffffff' : '#171717',
                    letterSpacing: '-0.03em',
                    textAlign: 'center',
                  }}
                  {...fadeUp(0.4)}
                >
                  {title}
                </motion.h1>

              </div>

              {/* ── CARD MIDDLE: Form & Inputs ───────────────────────────── */}
              <motion.form
                onSubmit={onSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 22,
                  margin: 'auto 0',
                }}
                {...fadeUp(0.5)}
              >

                {/* Customer ID / Email Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: isDark ? '#CFCFCF' : '#707070',
                    marginBottom: 10,
                    paddingLeft: 6,
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
                    marginBottom: 10,
                    paddingLeft: 6,
                    paddingRight: 6,
                  }}>
                    <label style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDark ? '#CFCFCF' : '#707070',
                    }}>
                      {passwordLabel}
                    </label>
                    <Link
                      to={forgotPasswordLink}
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: isDark ? '#CFCFCF' : '#707070',
                        textDecoration: 'none',
                        transition: 'color 300ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#ffffff' : '#171717')}
                      onMouseLeave={e => (e.currentTarget.style.color = isDark ? '#CFCFCF' : '#707070')}
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
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                          transition: 'color 300ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#ffffff' : '#171717')}
                        onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')}
                      >
                        {showPassword
                          ? <EyeOff size={18} strokeWidth={1.8} />
                          : <Eye    size={18} strokeWidth={1.8} />
                        }
                      </button>
                    }
                  />
                </div>

                {/* ── CARD BOTTOM: White Sign In Button (62px Height, 20px Radius) ── */}
                <div style={{ paddingTop: 10 }}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      width: '100%',
                      height: 62,
                      borderRadius: 20,
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      // Pure White Liquid Glass Button
                      background: '#ffffff',
                      color: '#171717',
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      fontFamily: 'inherit',
                      overflow: 'hidden',
                      opacity: loading ? 0.75 : 1,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 1px rgba(255,255,255,1)',
                      transition: 'all 300ms ease',
                    } as React.CSSProperties}
                    whileHover={loading ? {} : {
                      y: -2,
                      boxShadow: '0 16px 36px rgba(0,0,0,0.25), 0 0 20px rgba(255,255,255,0.6)',
                    } as any}
                    whileTap={loading ? {} : { scale: 0.98 } as any}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      {loading ? (
                        <Loader2 size={20} className="animate-spin" color="#171717" />
                      ) : (
                        <>
                          {submitLabel}
                          <motion.span
                            initial={{ x: 0 }}
                            whileHover={{ x: 5 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <ArrowRight size={18} strokeWidth={2.5} color="#171717" />
                          </motion.span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>

              </motion.form>

              {/* STRICTLY REMOVED: NO FOOTER OR TEXT BELOW SIGN IN BUTTON */}

            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default CinematicLogin
