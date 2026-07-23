import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, useMotionValue, useSpring, useTransform, AnimatePresence,
} from 'framer-motion';
import { Lock, User, Sun, Moon, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  id: number; x: number; y: number; size: number;
  speedX: number; opacity: number; color: string; blur: number;
}

interface RippleItem { id: number; x: number; y: number; }

export interface LiquidGlassLoginProps {
  title: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  passwordLabel: string;
  forgotPasswordLink: string;
  submitLabel: string;
  loading: boolean;
  identifier: string;
  password: string;
  showPassword: boolean;
  onIdentifierChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  accentColor: 'emerald' | 'cyan';
}

// ─── Sub-components (defined outside to avoid re-creation) ────────────────────

interface OrbProps {
  x: number; y: number; size: number; color: string;
  delay: number; duration: number; dx: number; dy: number; depth: number;
}
const FloatingOrb: React.FC<OrbProps> = ({ x, y, size, color, delay, duration, dx, dy, depth }) => {
  const px = dx * depth * 40;
  const py = dy * depth * 40;
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`, top: `${y}%`, width: size, height: size,
        background: color, filter: `blur(${size * 0.35}px)`,
      }}
      animate={{
        x: [0, px + 20, px - 15, px],
        y: [0, py - 25, py + 20, py],
        scale: [1, 1.12, 0.92, 1],
        opacity: [0.45, 0.65, 0.5, 0.45],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
};

interface RingProps { x: number; y: number; size: number; delay: number; dx: number; dy: number; }
const CrystalRing: React.FC<RingProps> = ({ x, y, size, delay, dx, dy }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}%`, top: `${y}%`, width: size, height: size,
      border: '1.5px solid rgba(255,255,255,0.18)',
      boxShadow: 'inset 0 0 30px rgba(255,255,255,0.04)',
      background: 'rgba(255,255,255,0.02)',
      backdropFilter: 'blur(4px)',
    }}
    animate={{
      x: [0, dx * 20, -dx * 10, 0],
      y: [0, dy * 10, -dy * 20, 0],
      rotate: [0, 180, 360],
      scale: [1, 1.06, 0.96, 1],
    }}
    transition={{ duration: 18 + delay * 3, delay, repeat: Infinity, ease: 'linear' }}
  />
);

interface RayProps { x: number; y: number; angle: number; color: string; delay: number; }
const LightRay: React.FC<RayProps> = ({ x, y, angle, color, delay }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`, top: `${y}%`, width: 2, height: '40vh',
      background: `linear-gradient(to bottom,${color},transparent)`,
      transform: `rotate(${angle}deg)`,
      filter: 'blur(3px)',
      transformOrigin: 'bottom center',
    }}
    animate={{ opacity: [0, 0.25, 0, 0.18, 0] }}
    transition={{ duration: 8, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

interface GPProps { p: Particle; seed: number; }
const GlowParticle: React.FC<GPProps> = ({ p, seed }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${p.x}%`, top: `${p.y}%`,
      width: p.size, height: p.size,
      background: p.color,
      filter: `blur(${p.blur}px)`,
    }}
    animate={{
      y: [0, -60, 0],
      x: [0, p.speedX * 20, 0],
      opacity: [0, p.opacity, 0],
      scale: [0.5, 1.2, 0.5],
    }}
    transition={{
      duration: 6 + (seed % 6),
      delay: seed * 0.3,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const LiquidGlassLogin: React.FC<LiquidGlassLoginProps> = ({
  title, identifierLabel, identifierPlaceholder, passwordLabel,
  forgotPasswordLink, submitLabel, loading, identifier, password,
  showPassword, onIdentifierChange, onPasswordChange, onTogglePassword,
  onSubmit, accentColor,
}) => {
  const { theme, toggleTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const [idFocus, setIdFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const sX = useSpring(rawX, { stiffness: 35, damping: 25, mass: 1 });
  const sY = useSpring(rawY, { stiffness: 35, damping: 25, mass: 1 });
  const rotX = useTransform(sY, [-1, 1], [8, -8]);
  const rotY = useTransform(sX, [-1, 1], [-8, 8]);
  const spotX = useTransform(sX, [-1, 1], [0, 100]);
  const spotY = useTransform(sY, [-1, 1], [0, 100]);

  const isEm = accentColor === 'emerald';
  const isDark = theme === 'dark';

  const ac = {
    glow: isEm ? 'rgba(16,185,129,0.7)' : 'rgba(6,182,212,0.7)',
    soft: isEm ? 'rgba(16,185,129,0.28)' : 'rgba(6,182,212,0.28)',
    o1: isEm
      ? 'radial-gradient(circle,rgba(16,185,129,0.5) 0%,rgba(52,211,153,0.12) 60%,transparent 100%)'
      : 'radial-gradient(circle,rgba(6,182,212,0.5) 0%,rgba(34,211,238,0.12) 60%,transparent 100%)',
    o2: isEm
      ? 'radial-gradient(circle,rgba(5,150,105,0.4) 0%,rgba(16,185,129,0.08) 60%,transparent 100%)'
      : 'radial-gradient(circle,rgba(14,116,144,0.4) 0%,rgba(6,182,212,0.08) 60%,transparent 100%)',
    o3: isEm
      ? 'radial-gradient(circle,rgba(52,211,153,0.22) 0%,transparent 70%)'
      : 'radial-gradient(circle,rgba(34,211,238,0.22) 0%,transparent 70%)',
    ray: isEm ? 'rgba(52,211,153,0.6)' : 'rgba(34,211,238,0.6)',
    bf: isEm ? '#059669' : '#0891b2',
    bt: isEm ? '#10b981' : '#06b6d4',
    bs: isEm ? 'rgba(16,185,129,0.45)' : 'rgba(6,182,212,0.45)',
    tc: isEm ? 'text-emerald-400' : 'text-cyan-400',
    th: isEm ? 'hover:text-emerald-300' : 'hover:text-cyan-300',
    bor: isEm ? 'rgba(16,185,129,0.5)' : 'rgba(6,182,212,0.5)',
    pc: isEm ? 'rgba(52,211,153,0.9)' : 'rgba(34,211,238,0.9)',
  };

  const PARTICLES: Particle[] = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 4 + i * 4,
    y: 30 + ((i * 37) % 50),
    size: 2 + (i % 3),
    speedX: ((i % 5) - 2) * 0.5,
    opacity: 0.6 + ((i * 7) % 4) * 0.1,
    color: i % 3 === 0 ? ac.pc : i % 3 === 1 ? 'rgba(255,255,255,0.8)' : 'rgba(200,230,255,0.75)',
    blur: (i % 4) * 0.4,
  }));

  useEffect(() => { setMounted(true); }, []);

  const onMM = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
    rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }, [rawX, rawY]);

  const onML = useCallback(() => { rawX.set(0); rawY.set(0); }, [rawX, rawY]);

  const onBtnClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples(p => p.filter(rp => rp.id !== id)), 700);
  }, []);

  const dxV = sX.get();
  const dyV = sY.get();

  const bg = isDark
    ? 'radial-gradient(ellipse at 20% 20%,rgba(5,150,105,0.16) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(6,182,212,0.10) 0%,transparent 55%),linear-gradient(135deg,#0f172a 0%,#020617 100%)'
    : 'radial-gradient(ellipse at 20% 20%,rgba(16,185,129,0.13) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(6,182,212,0.10) 0%,transparent 50%),linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)';

  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.9)';
  const cardShadow = isDark
    ? `0 32px 80px rgba(0,0,0,0.6),0 0 0 0.5px rgba(255,255,255,0.08) inset,0 2px 0 rgba(255,255,255,0.12) inset,0 80px 160px ${ac.soft}`
    : `0 32px 80px rgba(0,0,0,0.12),0 0 0 0.5px rgba(255,255,255,0.8) inset,0 2px 0 rgba(255,255,255,1) inset,0 60px 120px ${ac.soft}`;

  const inputCls = isDark
    ? 'bg-white/6 text-white placeholder-slate-500 border border-white/10 focus:bg-white/10'
    : 'bg-black/4 text-slate-800 placeholder-slate-400 border border-black/8 focus:bg-white/80';

  return (
    <div
      ref={containerRef}
      className="relative w-screen min-h-screen overflow-hidden flex items-center justify-center px-4 select-none"
      style={{ background: bg, fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" }}
      onMouseMove={onMM}
      onMouseLeave={onML}
    >
      {/* ── Background Scene ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Aurora shimmer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(135deg,rgba(16,185,129,0.07) 0%,transparent 40%,rgba(6,182,212,0.05) 70%,transparent 100%)'
              : 'linear-gradient(135deg,rgba(16,185,129,0.09) 0%,transparent 40%,rgba(6,182,212,0.07) 70%,transparent 100%)',
          }}
          animate={{ opacity: [0.6, 1, 0.7, 1, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Ambient orbs */}
        <FloatingOrb x={5} y={10} size={400} color={ac.o1} delay={0} duration={22} dx={dxV} dy={dyV} depth={0.08} />
        <FloatingOrb x={68} y={58} size={500} color={ac.o2} delay={4} duration={26} dx={dxV} dy={dyV} depth={0.06} />
        <FloatingOrb x={40} y={72} size={300}
          color={isDark ? 'radial-gradient(circle,rgba(255,255,255,0.05) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(100,200,240,0.18) 0%,transparent 70%)'}
          delay={2} duration={18} dx={dxV} dy={dyV} depth={0.04} />
        <FloatingOrb x={83} y={5} size={260} color={ac.o3} delay={6} duration={20} dx={dxV} dy={dyV} depth={0.1} />

        {/* Crystal rings */}
        <CrystalRing x={8} y={15} size={180} delay={0} dx={dxV} dy={dyV} />
        <CrystalRing x={76} y={63} size={240} delay={3} dx={dxV} dy={dyV} />
        <CrystalRing x={53} y={83} size={120} delay={6} dx={dxV} dy={dyV} />
        <CrystalRing x={88} y={23} size={160} delay={1.5} dx={dxV} dy={dyV} />

        {/* Light rays */}
        <LightRay x={15} y={0} angle={-15} color={ac.ray} delay={0} />
        <LightRay x={73} y={0} angle={12} color={ac.ray} delay={3} />
        <LightRay x={43} y={0} angle={-5}
          color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(180,220,255,0.5)'} delay={6} />

        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.035) 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow particles */}
        {mounted && PARTICLES.map((p, i) => <GlowParticle key={p.id} p={p} seed={i} />)}
      </div>

      {/* ── Theme Toggle ──────────────────────────────────────────────────── */}
      <div className="absolute top-6 right-6 z-30">
        <motion.button
          onClick={toggleTheme}
          className={`p-3 rounded-2xl backdrop-blur-2xl border transition-all duration-300 ${
            isDark
              ? 'bg-white/8 border-white/15 hover:border-white/30'
              : 'bg-black/5 border-black/10 hover:border-black/20'
          }`}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          title="Toggle theme"
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div key="sun"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}>
                <Sun className="h-4 w-4 text-amber-400" />
              </motion.div>
            ) : (
              <motion.div key="moon"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.25 }}>
                <Moon className="h-4 w-4 text-slate-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Liquid Glass Card ─────────────────────────────────────────────── */}
      <motion.div
        className="relative z-20 w-full max-w-[420px]"
        initial={{ opacity: 0, y: 48, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        style={{ perspective: 1200 }}
      >
        <motion.div
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        >
          {/* Glass card */}
          <div
            className="relative rounded-[32px] overflow-hidden"
            style={{
              background: cardBg,
              backdropFilter: 'blur(48px) saturate(180%)',
              WebkitBackdropFilter: 'blur(48px) saturate(180%)',
              border: cardBorder,
              boxShadow: cardShadow,
            }}
          >
            {/* Cursor spotlight */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-[32px]"
              style={{
                background: useTransform(
                  [spotX, spotY],
                  ([sx, sy]) => `radial-gradient(400px circle at ${sx}% ${sy}%,${ac.soft},transparent 60%)`,
                ),
                opacity: isDark ? 1 : 0.5,
              }}
            />

            {/* Top glass edge */}
            <div
              className="absolute top-0 left-6 right-6 h-px rounded-full pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)'
                  : 'linear-gradient(90deg,transparent,rgba(255,255,255,1),transparent)',
              }}
            />

            {/* Inner shimmer */}
            <motion.div
              className="absolute top-0 left-0 w-full h-1/2 pointer-events-none rounded-[32px]"
              style={{
                background: isDark
                  ? 'linear-gradient(180deg,rgba(255,255,255,0.06) 0%,transparent 100%)'
                  : 'linear-gradient(180deg,rgba(255,255,255,0.6) 0%,transparent 100%)',
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Content */}
            <div className="relative px-8 pt-10 pb-10">

              {/* Logo + Title */}
              <motion.div
                className="flex flex-col items-center mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="relative mb-5" style={{ filter: `drop-shadow(0 0 32px ${ac.soft})` }}>
                  <Logo size="lg" />
                  <div
                    className="absolute -bottom-3 left-0 right-0 h-3 pointer-events-none"
                    style={{ background: `linear-gradient(to bottom,${ac.soft},transparent)`, filter: 'blur(4px)' }}
                  />
                </div>

                <motion.h1
                  className={`text-[22px] font-bold tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}
                  style={{ letterSpacing: '-0.02em' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {title}
                </motion.h1>

                <motion.div
                  className="mt-3 h-[2px] rounded-full"
                  style={{ background: `linear-gradient(90deg,transparent,${ac.glow},transparent)` }}
                  initial={{ width: 0 }}
                  animate={{ width: 56 }}
                  transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                />
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={onSubmit}
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {/* Identifier */}
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {identifierLabel}
                  </label>
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      animate={{
                        boxShadow: idFocus
                          ? `0 0 0 1.5px ${ac.bor},0 0 24px ${ac.soft}`
                          : '0 0 0 1px rgba(255,255,255,0.08)',
                      }}
                      transition={{ duration: 0.25 }}
                    />
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 ${idFocus ? (isEm ? 'text-emerald-400' : 'text-cyan-400') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                      <User className="h-[17px] w-[17px]" strokeWidth={1.8} />
                    </span>
                    <input
                      type="text"
                      value={identifier}
                      onChange={e => onIdentifierChange(e.target.value)}
                      placeholder={identifierPlaceholder}
                      onFocus={() => setIdFocus(true)}
                      onBlur={() => setIdFocus(false)}
                      required
                      autoComplete="username"
                      className={`w-full pl-11 pr-4 py-[13px] rounded-2xl text-[14px] font-medium outline-none transition-all duration-300 ${inputCls}`}
                      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {passwordLabel}
                    </label>
                    <Link
                      to={forgotPasswordLink}
                      className={`text-[11px] font-semibold transition-colors ${ac.tc} ${ac.th}`}
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      animate={{
                        boxShadow: pwFocus
                          ? `0 0 0 1.5px ${ac.bor},0 0 24px ${ac.soft}`
                          : '0 0 0 1px rgba(255,255,255,0.08)',
                      }}
                      transition={{ duration: 0.25 }}
                    />
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 ${pwFocus ? (isEm ? 'text-emerald-400' : 'text-cyan-400') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                      <Lock className="h-[17px] w-[17px]" strokeWidth={1.8} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => onPasswordChange(e.target.value)}
                      placeholder="Enter your password"
                      onFocus={() => setPwFocus(true)}
                      onBlur={() => setPwFocus(false)}
                      required
                      autoComplete="current-password"
                      className={`w-full pl-11 pr-12 py-[13px] rounded-2xl text-[14px] font-medium outline-none transition-all duration-300 ${inputCls}`}
                      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                    />
                    <button
                      type="button"
                      onClick={onTogglePassword}
                      className={`absolute inset-y-0 right-0 flex items-center pr-4 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {showPassword
                        ? <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.8} />
                        : <Eye className="h-[17px] w-[17px]" strokeWidth={1.8} />
                      }
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-3">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    onClick={onBtnClick}
                    className="relative w-full py-[14px] rounded-2xl overflow-hidden font-bold text-[14px] text-white tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(135deg,${ac.bf} 0%,${ac.bt} 50%,${ac.bf} 100%)`,
                      backgroundSize: '200% auto',
                      boxShadow: `0 8px 32px ${ac.bs},0 2px 0 rgba(255,255,255,0.18) inset`,
                    }}
                    whileHover={{ scale: 1.025 }}
                    whileTap={{ scale: 0.975 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Button glass top */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none"
                      style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.2),transparent)' }}
                    />

                    {/* Ripples */}
                    <AnimatePresence>
                      {ripples.map(r => (
                        <motion.span
                          key={r.id}
                          className="absolute rounded-full bg-white/30 pointer-events-none"
                          style={{ left: r.x - 60, top: r.y - 60, width: 120, height: 120 }}
                          initial={{ scale: 0, opacity: 0.6 }}
                          animate={{ scale: 3, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.65, ease: 'easeOut' }}
                        />
                      ))}
                    </AnimatePresence>

                    <span className="relative flex items-center justify-center gap-2.5">
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          {submitLabel}
                          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>
              </motion.form>
            </div>
          </div>

          {/* Outer glow ring */}
          <div
            className="absolute -inset-px rounded-[33px] pointer-events-none"
            style={{ boxShadow: `0 0 80px ${ac.soft}` }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LiquidGlassLogin;
