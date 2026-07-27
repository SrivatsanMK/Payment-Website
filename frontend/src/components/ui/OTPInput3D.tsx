import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface OTPInput3DProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}

export const OTPInput3D: React.FC<OTPInput3DProps> = ({
  value = '',
  onChange,
  onComplete,
  error = false,
  success = false,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Convert string value to 6-element array
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  // Auto focus first input on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  // Handle single digit input or change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric only
    if (!val) {
      // Clear single digit
      const newDigits = [...digits];
      newDigits[index] = '';
      const newOtp = newDigits.join('');
      onChange(newOtp);
      return;
    }

    // Take last entered character if multiple characters pasted in single field
    const lastChar = val[val.length - 1];
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    if (newOtp.length === 6 && onComplete) {
      onComplete(newOtp);
    }

    // Auto advance focus to next box
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace and Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous box and clear it
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

  // Handle Paste across 6 boxes
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      onChange(pastedData);
      if (pastedData.length === 6 && onComplete) {
        onComplete(pastedData);
      }
      const targetIndex = Math.min(pastedData.length, 5);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  // Shake variant for error state
  const containerVariants = {
    shake: {
      x: [0, -12, 12, -9, 9, -5, 5, 0],
      transition: { duration: 0.55, ease: 'easeInOut' },
    },
    success: {
      scale: [1, 1.04, 1],
      transition: { duration: 0.45, ease: 'easeOut' },
    },
    idle: {
      x: 0,
      scale: 1,
    },
  };

  return (
    <motion.div
      className="w-full flex justify-center items-center py-2"
      style={{ perspective: 1000 }}
      variants={containerVariants}
      animate={error ? 'shake' : success ? 'success' : 'idle'}
    >
      <div className="flex gap-2.5 sm:gap-3.5 items-center justify-center">
        {digits.map((digit, index) => {
          const isFocused = focusedIndex === index;
          const isFilled = digit !== '';

          // Determine box border and glow styles based on state and theme
          let boxBorder = isDark ? 'border-white/15' : 'border-slate-300/80';
          let boxGlow = isDark ? 'shadow-lg shadow-black/40' : 'shadow-md shadow-slate-200/80';
          let boxBg = isDark ? 'bg-slate-900/80' : 'bg-white/90';

          if (error) {
            boxBorder = 'border-red-500 dark:border-red-500';
            boxGlow = 'shadow-lg shadow-red-500/40 ring-2 ring-red-500/20';
          } else if (success) {
            boxBorder = 'border-emerald-500 dark:border-emerald-400';
            boxGlow = 'shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-500/30';
          } else if (isFocused) {
            boxBorder = isDark ? 'border-primary-400' : 'border-primary-500';
            boxGlow = isDark
              ? 'shadow-xl shadow-primary-500/30 ring-2 ring-primary-500/30'
              : 'shadow-lg shadow-primary-500/25 ring-2 ring-primary-500/20';
          } else if (isFilled) {
            boxBorder = isDark ? 'border-white/30' : 'border-slate-400/80';
          }

          return (
            <motion.div
              key={index}
              className="relative"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ y: 0 }}
              animate={{
                y: isFocused ? -6 : [0, -3, 0],
              }}
              transition={{
                y: isFocused
                  ? { duration: 0.2, ease: 'easeOut' }
                  : {
                      duration: 3 + index * 0.2,
                      repeat: Infinity,
                      repeatType: 'mirror',
                      ease: 'easeInOut',
                    },
              }}
            >
              {/* 3D Glass Box Wrapper */}
              <div
                className={`relative w-11 h-13 sm:w-13 sm:h-16 rounded-2xl flex items-center justify-center border backdrop-blur-xl overflow-hidden transition-all duration-300 ${boxBg} ${boxBorder} ${boxGlow}`}
                style={{
                  transform: 'rotateX(4deg) rotateY(-2deg)',
                  boxShadow: isFocused
                    ? isDark
                      ? '0 15px 30px -5px rgba(99, 102, 241, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
                      : '0 12px 25px -5px rgba(79, 70, 229, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
                    : isDark
                    ? '0 10px 20px -5px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                    : '0 8px 16px -4px rgba(148, 163, 184, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                }}
              >
                {/* Top specular inner bevel highlight */}
                <div
                  className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none rounded-t-2xl"
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
                  }}
                />

                {/* 3D Flip Clock Animation for Digit Reveal */}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={digit || 'empty'}
                    initial={{ rotateX: -90, opacity: 0, scale: 0.8 }}
                    animate={{ rotateX: 0, opacity: 1, scale: 1 }}
                    exit={{ rotateX: 90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                    className={`text-xl sm:text-2xl font-black select-none ${
                      error
                        ? 'text-red-500'
                        : success
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : isDark
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}
                  >
                    {digit}
                  </motion.span>
                </AnimatePresence>

                {/* Accessible native input element */}
                <input
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={disabled}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Digit ${index + 1} of 6`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default OTPInput3D;
