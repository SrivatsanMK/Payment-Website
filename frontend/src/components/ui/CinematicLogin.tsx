/**
 * CinematicLogin.tsx
 * Apple Liquid Glass Login UI on an infinite particle 3D space.
 * Features ultra-clear, neutral, physically accurate glass materials,
 * carved inputs, and a premium white frosted glass submit button.
 * Completely stripped of artificial colored tints.
 */
import React, {
  useState, useEffect, useRef, useCallback, Suspense, lazy
} from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useMotionValue, useSpring, useTransform
} from 'framer-motion'
import {
  Lock, User, Eye, EyeOff, Loader2, Sun, Moon
} from 'lucide-react'
import { Logo } from './Logo'
import { useTheme } from '../../context/ThemeContext'

// Lazy-load the 3D scene
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

// ─── Carved Glass Input ──────────────────────────────────────────────────────

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  focused: boolean
  isDark: boolean
  rightSlot?: React.ReactNode
  onChange: (val: string) => void
}

const GlassInput: React.FC<GlassInputProps> = ({
  icon: Icon, focused, isDark, rightSlot, onChange, ...rest
}) => {
  const hasRight = !!rightSlot

  return (
    <div style={{ position: 'relative' }}>
      {/* Leading icon */}
      <span style={{
        position: 'absolute', left: 14, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        color: focused 
          ? (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)')
          : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
        transition: 'color 0.3s ease',
        pointerEvents: 'none',
      }}>
        <Icon size={15} strokeWidth={1.8} />
      </span>
      
      {/* Carved Input */}
      <input
        {...rest}
        onChange={e => onChange(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          padding: `14px ${hasRight ? '44px' : '16px'} 14px 40px`,
          borderRadius: 14,
          border: 'none',
          // Inner carved effect depending on theme
          background: isDark
            ? 'rgba(0, 0, 0, 0.4)'
            : 'rgba(0, 0, 0, 0.05)',
          boxShadow: isDark
            ? `inset 0 2px 6px rgba(0,0,0,0.6), 
               inset 0 0 0 1px rgba(0,0,0,0.8),
               0 1px 0 rgba(255,255,255,0.08)`
            : `inset 0 2px 6px rgba(0,0,0,0.08), 
               inset 0 0 0 1px rgba(0,0,0,0.1),
               0 1px 0 rgba(255,255,255,0.8)`,
          color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.92)',
          fontSize: 14,
          fontWeight: 500,
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'box-shadow 0.3s ease',
          boxSizing: 'border-box',
          caretColor: isDark ? '#ffffff' : '#000000',
        } as React.CSSProperties}
        onFocus={(e) => {
          if (rest.onFocus) rest.onFocus(e);
          e.currentTarget.style.boxShadow = isDark
            ? `inset 0 2px 6px rgba(0,0,0,0.8), 
               inset 0 0 0 1.5px rgba(255,255,255,0.3)`
            : `inset 0 2px 6px rgba(0,0,0,0.12), 
               inset 0 0 0 1.5px rgba(0,0,0,0.3)`;
        }}
        onBlur={(e) => {
          if (rest.onBlur) rest.onBlur(e);
          e.currentTarget.style.boxShadow = isDark
            ? `inset 0 2px 6px rgba(0,0,0,0.6), 
               inset 0 0 0 1px rgba(0,0,0,0.8),
               0 1px 0 rgba(255,255,255,0.08)`
            : `inset 0 2px 6px rgba(0,0,0,0.08), 
               inset 0 0 0 1px rgba(0,0,0,0.1),
               0 1px 0 rgba(255,255,255,0.8)`;
        }}
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
  onSubmit,
}) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [mounted, setMounted] = useState(false)
  const [idFocus, setIdFocus] = useState(false)
  const [pwFocus, setPwFocus] = useState(false)

  const mouseRef = useRef({ x: 0, y: 0 })
  const cardRef  = useRef<HTMLDivElement>(null)

  // Framer Motion spring card tilt
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotX = useSpring(useTransform(rawY, [-1, 1], [3, -3]),  { stiffness: 30, damping: 20 })
  const rotY = useSpring(useTransform(rawX, [-1, 1], [-3, 3]),  { stiffness: 30, damping: 20 })

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

  // ── Card mouse handlers (tilt) ────────────────────────────────────────────
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

  // ── Cinematic entrance variants ────────────────────────────────────────────
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  })

  // Apple Liquid Glass text colors
  const textColor = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)'
  const labelColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)'

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: isDark ? '#000000' : '#ffffff',
      fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      transition: 'background 0.5s ease',
    }}>

      {/* ── 3D Infinite Particle Space (lazy) ─────────────────────────────── */}
      {mounted && (
        <Suspense fallback={null}>
          <CinematicSceneLazy mouse={mouseRef} theme={theme} />
        </Suspense>
      )}

      {/* ── Liquid Glass Theme Switcher (top-right) ───────────────────────── */}
      <motion.button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed', top: 24, right: 24, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: '50%',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.4)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        {isDark
          ? <Sun  size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          : <Moon size={16} color="rgba(0,0,0,0.7)" strokeWidth={2} />
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
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
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

            {/* Gradient border shell for the premium cut-glass edge */}
            <div style={{
              position: 'relative',
              padding: '1px',
              borderRadius: 34,
              background: isDark 
                ? `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.03) 100%)`
                : `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 100%)`,
            }}>

              {/* ── Inner Liquid Glass Card ─────────────────────────────────── */}
              <div style={{
                position: 'relative',
                borderRadius: 33,
                overflow: 'hidden',
                width: 380,
                // True neutral Apple Liquid Glass (no tints)
                background: isDark ? 'rgba(20,20,22,0.35)' : 'rgba(255,255,255,0.65)',
                backdropFilter: 'blur(72px) saturate(180%) brightness(1.1)',
                WebkitBackdropFilter: 'blur(72px) saturate(180%) brightness(1.1)',
                boxShadow: isDark 
                  ? `0 30px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset`
                  : `0 30px 60px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(255,255,255,0.4) inset, 0 1px 0 rgba(255,255,255,0.8) inset`,
              }}>

                {/* Specular Edge Highlights */}
                <div style={{
                  position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                  background: isDark ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)',
                  pointerEvents: 'none',
                }} />

                <div style={{
                  position: 'absolute', top: '10%', left: 0, bottom: '10%', width: 1,
                  background: isDark ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent)' : 'linear-gradient(180deg, transparent, rgba(255,255,255,0.6), transparent)',
                  pointerEvents: 'none',
                }} />

                {/* Soft Inner Shadow (carved depth for the whole card) */}
                <div style={{
                  position: 'absolute', inset: 0,
                  boxShadow: isDark ? 'inset 0 0 40px rgba(0,0,0,0.5)' : 'none',
                  pointerEvents: 'none',
                }} />

                {/* ── Card content ────────────────────────────────────────────── */}
                <div style={{ position: 'relative', padding: '40px 32px 36px' }}>

                  {/* Logo + Title section */}
                  <motion.div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}
                    {...fadeUp(0.6)}
                  >
                    {/* Logo with elegant white glow */}
                    <div style={{
                      width: '100%', marginBottom: 18,
                      filter: isDark ? 'drop-shadow(0 0 16px rgba(255,255,255,0.15))' : 'none',
                    }}>
                      <Logo size="md" />
                    </div>

                    {/* Title */}
                    <h1 style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 600,
                      color: textColor,
                      letterSpacing: '-0.02em',
                    }}>
                      {title}
                    </h1>
                  </motion.div>

                  {/* ── Form ──────────────────────────────────────────────────── */}
                  <motion.form
                    onSubmit={onSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                    {...fadeUp(0.7)}
                  >
                    {/* Identifier field */}
                    <div>
                      <label
                        htmlFor="cin-identifier"
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 600,
                          color: labelColor,
                          marginBottom: 8,
                          paddingLeft: 4,
                        }}
                      >
                        {identifierLabel}
                      </label>
                      <GlassInput
                        id="cin-identifier"
                        icon={User}
                        focused={idFocus}
                        isDark={isDark}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 4, paddingRight: 4 }}>
                        <label
                          htmlFor="cin-password"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: labelColor,
                          }}
                        >
                          {passwordLabel}
                        </label>
                        <Link
                          to={forgotPasswordLink}
                          style={{
                            fontSize: 11, fontWeight: 500,
                            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', 
                            textDecoration: 'none',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#fff' : '#000')}
                          onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)')}
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <GlassInput
                        id="cin-password"
                        icon={Lock}
                        focused={pwFocus}
                        isDark={isDark}
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
                              color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                              transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)')}
                            onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                          >
                            {showPassword
                              ? <EyeOff size={15} strokeWidth={1.8} />
                              : <Eye    size={15} strokeWidth={1.8} />
                            }
                          </button>
                        }
                      />
                    </div>

                    {/* ── Submit Button ────────────────────────────────────────── */}
                    <div style={{ paddingTop: 12 }}>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '100%', padding: '14px 0',
                          borderRadius: 14,
                          border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          // Apple Liquid Glass White Button
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          color: '#000000',
                          fontSize: 15,
                          fontWeight: 600,
                          letterSpacing: '-0.01em',
                          fontFamily: 'inherit',
                          overflow: 'hidden',
                          opacity: loading ? 0.7 : 1,
                          boxShadow: isDark
                            ? `0 4px 12px rgba(255,255,255,0.1), inset 0 1px 1px rgba(255,255,255,1)`
                            : `0 8px 24px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,1)`,
                          WebkitFontSmoothing: 'antialiased',
                        } as React.CSSProperties}
                        whileHover={loading ? {} : {
                          scale: 1.02,
                          boxShadow: isDark
                            ? `0 8px 24px rgba(255,255,255,0.15), inset 0 1px 1px rgba(255,255,255,1)`
                            : `0 12px 32px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,1)`,
                        } as any}
                        whileTap={loading ? {} : { scale: 0.98 } as any}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        {/* Button: label */}
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {loading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <>{submitLabel}</>
                          }
                        </span>
                      </motion.button>
                    </div>

                  </motion.form>

                  {/* ── Footer micro-text ─────────────────────────────────────── */}
                  <motion.p
                    style={{
                      margin: '24px 0 0',
                      fontSize: 11,
                      color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
                      textAlign: 'center',
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                    {...fadeUp(0.9)}
                  >
                    SSL Encrypted · JWT Protected
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
