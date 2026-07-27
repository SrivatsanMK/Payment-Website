import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ui/Toast';
import { Mail, ArrowLeft, Sun, Moon } from 'lucide-react';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

import { API_URL } from '../utils/config';
import ParticleScene from '../components/ui/particles/ParticleScene';

interface ForgotPasswordProps {
  forcedRole?: 'Customer' | 'Admin';
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ forcedRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const isAdminPage = forcedRole === 'Admin' || location.pathname.startsWith('/admin');
  const role: 'Customer' | 'Admin' = forcedRole || (isAdminPage ? 'Admin' : (location.state as any)?.role || 'Customer');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email, role });
      if (res.data.success) {
        showToast(res.data.message || 'OTP sent successfully', 'success');
        navigate('/verify-otp', { state: { email, role } });
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send OTP. Check your email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loginLink = isAdminPage ? '/admin/login' : '/login';
  const loginText = isAdminPage ? 'Back to Admin Login' : 'Back to Customer Login';
  const pageTitle = isAdminPage ? 'Admin Forgot Password' : 'Forgot Password';

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
          to={loginLink} 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {loginText}
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {pageTitle}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            We will send a 6-digit OTP code to verify your identity.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            loading={loading}
          >
            Send OTP Code
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
