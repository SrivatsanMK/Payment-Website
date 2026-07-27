import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface OtpVerifyAnimationProps {
  value: string;
  onChange: (val: string) => void;
  status: 'idle' | 'verifying' | 'success' | 'error';
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export const OtpVerifyAnimation: React.FC<OtpVerifyAnimationProps> = ({
  value = '',
  onChange,
  status = 'idle',
  onComplete,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Convert current value to 6 digits array
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  // Track key flips per box index
  const [flipTrigger, setFlipTrigger] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  // Focus management
  useEffect(() => {
    if (status === 'idle' && !disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [status, disabled]);

  // Handle Input per box
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric only
    if (!val) {
      const newDigits = [...digits];
      newDigits[index] = '';
      const newOtp = newDigits.join('');
      onChange(newOtp);
      return;
    }

    const lastChar = val[val.length - 1];
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const newOtp = newDigits.join('');

    // Trigger 3D Flip animation for this index
    setFlipTrigger((prev) => {
      const copy = [...prev];
      copy[index] += 1;
      return copy;
    });

    onChange(newOtp);

    // Auto trigger completion when 6th digit entered
    if (newOtp.length === 6 && onComplete) {
      onComplete(newOtp);
    }

    // Auto advance focus to next box
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace and Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newOtp = newDigits.join('');
        onChange(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle 6-digit Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === 6 && onComplete) {
        onComplete(pasted);
      }
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="w-full flex flex-col justify-center items-center py-2 relative">
      {/* ── STAGE: SUCCESS MORPH (EMERALD CHECKMARK RING) ── */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            key="success-container"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center space-y-3 my-2"
          >
            {/* Animated Emerald Ring + Checkmark */}
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={isDark ? '#10b981' : '#059669'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: 264, strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.65, ease: 'easeInOut' }}
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.6))'
                      : 'drop-shadow(0 0 6px rgba(5, 150, 105, 0.4))',
                  }}
                />
              </svg>

              {/* Pop-in Checkmark */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 18,
                  delay: 0.25,
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check className={`w-9 h-9 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} strokeWidth={3.5} />
              </motion.div>
            </div>

            {/* "Verified & Secured" Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isDark
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Verified & Secured
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6 OTP DIGIT BOXES ── */}
      {status !== 'success' && (
        <div
          className="relative flex items-center justify-center w-full py-2"
          style={{ perspective: 800, transformStyle: 'preserve-3d' }}
        >
          <motion.div
            animate={
              status === 'verifying'
                ? { scale: [1, 1.03, 1] }
                : status === 'error'
                ? { x: [0, -14, 14, -10, 10, -5, 5, 0] }
                : { scale: 1, x: 0 }
            }
            transition={
              status === 'verifying'
                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                : status === 'error'
                ? { duration: 0.55, ease: 'easeInOut' }
                : {}
            }
            className="flex gap-2.5 sm:gap-3.5 items-center justify-center relative z-10"
          >
            {digits.map((digit, index) => {
              const isFocused = focusedIndex === index && status === 'idle';
              const isFilled = digit !== '';
              const flipCount = flipTrigger[index];

              // Cell styles
              let borderStyle = isDark ? 'border-white/15' : 'border-slate-300/80';
              let glowStyle = isDark ? 'shadow-md shadow-black/40' : 'shadow-sm shadow-slate-200/80';
              let bgStyle = isDark ? 'bg-slate-900/85' : 'bg-white/90';

              if (status === 'error') {
                borderStyle = 'border-red-500 dark:border-red-500';
                glowStyle = 'shadow-lg shadow-red-500/40 ring-2 ring-red-500/30';
              } else if (status === 'verifying') {
                borderStyle = isDark ? 'border-primary-400' : 'border-primary-500';
                glowStyle = isDark
                  ? 'shadow-xl shadow-primary-500/40 ring-2 ring-primary-500/30'
                  : 'shadow-lg shadow-primary-500/30 ring-2 ring-primary-500/20';
              } else if (isFocused) {
                borderStyle = isDark ? 'border-primary-400' : 'border-primary-500';
                glowStyle = isDark
                  ? 'shadow-lg shadow-primary-500/30 ring-2 ring-primary-500/25'
                  : 'shadow-md shadow-primary-500/20 ring-2 ring-primary-500/20';
              } else if (isFilled) {
                borderStyle = isDark ? 'border-primary-400/50' : 'border-primary-500/50';
              }

              return (
                <motion.div
                  key={index}
                  animate={{
                    y: isFocused ? -4 : 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 22,
                  }}
                  className="relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* 3D Flip Card Container */}
                  <motion.div
                    key={`flip-${flipCount}`}
                    initial={{ rotateX: 0 }}
                    animate={{ rotateX: flipCount > 0 ? [0, -25, 0] : 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`relative w-11 h-13 sm:w-13 sm:h-16 rounded-2xl flex items-center justify-center border backdrop-blur-xl transition-all duration-300 ${bgStyle} ${borderStyle} ${glowStyle}`}
                  >
                    {/* Top inner specular sheen highlight */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none rounded-t-2xl"
                      style={{
                        background: isDark
                          ? 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)'
                          : 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
                      }}
                    />

                    {/* Violet Light Streak during 3D Flip */}
                    {flipCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0.8, scaleX: 0.2 }}
                        animate={{ opacity: 0, scaleX: 1.2 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-400/40 to-transparent pointer-events-none rounded-2xl"
                      />
                    )}

                    {/* Digit Text or Blinking Cursor Bar */}
                    {isFilled ? (
                      <span
                        className={`text-xl sm:text-2xl font-black select-none ${
                          status === 'error'
                            ? 'text-red-500'
                            : isDark
                            ? 'text-primary-300'
                            : 'text-primary-700'
                        }`}
                      >
                        {digit}
                      </span>
                    ) : isFocused ? (
                      <motion.div
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className={`w-0.5 h-6 rounded-full ${isDark ? 'bg-primary-400' : 'bg-primary-600'}`}
                      />
                    ) : null}

                    {/* Accessible Underlying Input */}
                    <input
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      disabled={disabled || status === 'verifying'}
                      onChange={(e) => handleChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      aria-label={`Digit ${index + 1} of 6`}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OtpVerifyAnimation;
