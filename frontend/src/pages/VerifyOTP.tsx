import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ui/Toast';
import { ArrowLeft, RefreshCw, Sun, Moon } from 'lucide-react';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

import { API_URL } from '../utils/config';
import ParticleScene from '../components/ui/particles/ParticleScene';

export const VerifyOTP: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60); // 60 seconds resend cooldown

  const email = (location.state as any)?.email || '';
  const role = (location.state as any)?.role || 'Customer';

  useEffect(() => {
    if (!email) {
      showToast('No email found. Request OTP first.', 'error');
      navigate(role === 'Admin' ? '/admin/forgot-password' : '/forgot-password');
    }
  }, [email, navigate, role]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      showToast('Please enter the full 6-digit OTP code', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
      if (res.data.success) {
        showToast('OTP verified. Set your new password.', 'success');
        navigate('/reset-password', { state: { resetToken: res.data.resetToken, role } });
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Verification failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResendLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email, role });
      if (res.data.success) {
        showToast('A new OTP has been sent to your email', 'success');
        setTimer(60); // Reset timer
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to resend code', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 overflow-hidden">
      {/* 3D Particle Wave Background */}
      <ParticleScene />

      {/* Top Right Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 shadow-lg transition-all"
          title="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      {/* Liquid Glass Card Container */}
      <div className="relative z-10 w-full max-w-md bg-white/80 dark:bg-slate-900/50 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-black/60 border border-slate-200/80 dark:border-white/10 p-8 overflow-hidden transition-all">
        {/* Top inner specular sheen highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
          }}
        />
        
        {/* Back Link */}
        <Link 
          to={role === 'Admin' ? '/admin/forgot-password' : '/forgot-password'} 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change Email Address
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Verify Code
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            We sent a verification code to <strong className="text-slate-900 dark:text-slate-200 font-semibold">{email}</strong>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-2 text-center">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numeric only
              placeholder="000000"
              className="w-full tracking-[1em] text-center text-xl font-bold py-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loading}
          >
            Confirm & Verify
          </Button>

          {/* Resend Cooldown */}
          <div className="text-center">
            {timer > 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Resend code in <strong className="text-primary-600 dark:text-primary-400 font-semibold">{timer}s</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
              >
                {resendLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                Resend OTP Verification Code
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
