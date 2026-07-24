/**
 * ProfileSelection.tsx — Apple VisionOS Liquid Glass Admin Profile Selection
 * World-class 60fps Liquid Glass interface inspired by iOS 26, VisionOS & Netflix Profile Selection.
 * Logos & Icons inside the 190px circles are scaled up 2x for maximum visibility.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, Layers } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../context/ThemeContext';

export const ProfileSelection: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedProfile, setSelectedProfile] = useState<'dashboard' | 'private' | null>(null);

  const handleProfileSelect = (profile: 'dashboard' | 'private') => {
    setSelectedProfile(profile);
    localStorage.setItem('adminProfile', profile);
    setTimeout(() => {
      navigate('/admin/dashboard');
    }, 280);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(circle at 50% 50%, rgba(18, 18, 24, 0.4) 0%, #000000 100%)'
          : 'radial-gradient(circle at 50% 30%, #ffffff 0%, #f8fafc 100%)',
        color: isDark ? '#ffffff' : '#111111',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        boxSizing: 'border-box',
        padding: '24px 16px',
        transition: 'background 500ms ease, color 500ms ease',
      }}
    >
      {/* ── TOP BAR: System Branding (Left) & Theme Toggle (Right) ─────────── */}
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        {/* Top Left: Dealer Payment Management System Branding */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
            border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
          }}>
            <Layers size={16} color="#8b5cf6" strokeWidth={2.2} />
          </div>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(17, 17, 17, 0.9)',
          }}>
            Dealer Payment Management System
          </span>
        </motion.div>

        {/* Top Right: 56x56 Circular Floating Liquid Glass Theme Toggle Button */}
        <motion.button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            pointerEvents: 'auto',
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark
              ? 'rgba(25, 25, 30, 0.55)'
              : 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.18)'
              : '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: isDark
              ? '0 12px 32px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
              : '0 12px 32px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 1)',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 500ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
          whileHover={{ scale: 1.08, rotate: 12 }}
          whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {isDark ? (
            <Moon size={20} color="#ffffff" strokeWidth={1.8} />
          ) : (
            <Sun size={20} color="#111111" strokeWidth={1.8} />
          )}
        </motion.button>
      </header>

      {/* ── CENTER SECTION: Header & Subtitle ────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginBottom: 56,
        maxWidth: 720,
        zIndex: 10,
      }}>
        {/* Large Heading: Who's accessing the system? */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            margin: 0,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: isDark ? '#ffffff' : '#111111',
          }}
        >
          Who's accessing the system?
        </motion.h1>

        {/* Subtitle: Welcome back, admin. Please select your workspace. */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 16,
            marginBottom: 0,
            fontSize: 'clamp(16px, 2.2vw, 22px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            color: isDark ? '#A0A0A0' : '#6B7280',
          }}
        >
          Welcome back, {admin?.name || 'admin'}. Please select your workspace.
        </motion.p>
      </div>

      {/* ── PROFILE CARDS GRID: 190px x 190px Liquid Glass Circles ────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.35 },
          },
        }}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(32px, 6vw, 64px)',
          zIndex: 20,
        }}
      >
        {/* ── PROFILE 1: Private Business ─────────────────────────────────── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 24, scale: 0.92 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => handleProfileSelect('private')}
          role="button"
          tabIndex={0}
          aria-label="Select Private Business workspace"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleProfileSelect('private');
          }}
        >
          {/* Continuous floating animation wrapper */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.06, y: -8 }}
            whileTap={{ scale: 0.96 }}
            style={{
              position: 'relative',
              width: 190,
              height: 190,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Apple Liquid Glass Surface
              background: isDark
                ? 'rgba(25, 25, 25, 0.45)'
                : 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.18)'
                : '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: isDark
                ? (selectedProfile === 'private'
                    ? '0 0 0 3px #0d9488, 0 25px 60px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.6)'
                    : '0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -4px 12px rgba(0,0,0,0.5)')
                : (selectedProfile === 'private'
                    ? '0 0 0 3px #0d9488, 0 20px 45px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,1)'
                    : '0 20px 50px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,1), inset 0 -4px 12px rgba(255,255,255,0.4)'),
              transition: 'all 450ms cubic-bezier(.22,.61,.36,1)',
              overflow: 'hidden',
            }}
          >
            {/* Top Curved Specular Glass Reflection Sheen */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              borderRadius: '190px 190px 0 0',
              background: isDark
                ? 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* Top Specular Curved Edge Highlight Rim */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              right: '15%',
              height: 1.5,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              pointerEvents: 'none',
            }} />

            {/* Modern Teal Building Icon (2x Scaled) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '85%',
              height: '85%',
              position: 'relative',
              zIndex: 2,
            }}>
              <svg
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  filter: isDark ? 'drop-shadow(0 4px 12px rgba(13, 148, 136, 0.5))' : 'none',
                }}
              >
                <path
                  d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21"
                  stroke="#0d9488"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 7H10M14 7H15M9 11H10M14 11H15M9 15H10M14 15H15"
                  stroke="#0d9488"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <path
                  d="M10 21V18C10 17.4477 10.4477 17 11 17H13C13.5523 17 14 17.4477 14 18V21"
                  stroke="#0d9488"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </motion.div>

          {/* Workspace Name: Private Business */}
          <span style={{
            marginTop: 20,
            fontSize: 'clamp(22px, 2.5vw, 30px)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: isDark ? '#ffffff' : '#111111',
            textAlign: 'center',
            transition: 'color 300ms ease',
          }}>
            Private Business
          </span>
        </motion.div>

        {/* ── PROFILE 2: Green Glide Logistics ─────────────────────────────── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 24, scale: 0.92 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => handleProfileSelect('dashboard')}
          role="button"
          tabIndex={0}
          aria-label="Select Green Glide Logistics workspace"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleProfileSelect('dashboard');
          }}
        >
          {/* Continuous floating animation wrapper */}
          <motion.div
            animate={{ y: [4, -4, 4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.06, y: -8 }}
            whileTap={{ scale: 0.96 }}
            style={{
              position: 'relative',
              width: 190,
              height: 190,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Apple Liquid Glass Surface
              background: isDark
                ? 'rgba(25, 25, 25, 0.45)'
                : 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.18)'
                : '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: isDark
                ? (selectedProfile === 'dashboard'
                    ? '0 0 0 3px #10b981, 0 25px 60px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.6)'
                    : '0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -4px 12px rgba(0,0,0,0.5)')
                : (selectedProfile === 'dashboard'
                    ? '0 0 0 3px #10b981, 0 20px 45px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,1)'
                    : '0 20px 50px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,1), inset 0 -4px 12px rgba(255,255,255,0.4)'),
              transition: 'all 450ms cubic-bezier(.22,.61,.36,1)',
              overflow: 'hidden',
            }}
          >
            {/* Top Curved Specular Glass Reflection Sheen */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              borderRadius: '190px 190px 0 0',
              background: isDark
                ? 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* Top Specular Curved Edge Highlight Rim */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              right: '15%',
              height: 1.5,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              pointerEvents: 'none',
            }} />

            {/* Green Glide Logistics Centered Logo (2x Scaled — 90% container with scale 1.35) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '90%',
              height: '90%',
              position: 'relative',
              zIndex: 2,
            }}>
              <img
                src="/logo.png"
                alt="Green Glide Logistics Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scale(1.35)',
                  filter: isDark
                    ? 'brightness(1.18) contrast(1.05) drop-shadow(0 6px 16px rgba(0,0,0,0.85))'
                    : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
                }}
              />
            </div>
          </motion.div>

          {/* Workspace Name: Green Glide Logistics */}
          <span style={{
            marginTop: 20,
            fontSize: 'clamp(22px, 2.5vw, 30px)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: isDark ? '#ffffff' : '#111111',
            textAlign: 'center',
            transition: 'color 300ms ease',
          }}>
            Green Glide Logistics
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileSelection;
