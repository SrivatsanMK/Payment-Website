import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../components/ui/Toast';
import { Logo } from '../../components/ui/Logo';
import { useTheme } from '../../context/ThemeContext';
import { Lock, Sun, Moon, User } from 'lucide-react';
import Button from '../../components/ui/Button';

export const AdminLogin: React.FC = () => {
  const { login } = useAdminAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ identifier, password });
      const role = res.user.role;
      showToast('Admin login successful', 'success');

      if (role === 'ADMIN_1') {
        localStorage.removeItem('adminProfile');
        navigate('/admin/profile-selection');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      showToast(err || 'Invalid admin credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/30 to-slate-200 dark:from-[#2A2A2A] dark:via-[#2A2A2A] dark:to-[#2A2A2A] px-4">

      {/* Animated gradient blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-teal-400/20 dark:bg-teal-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-400/20 dark:bg-primary-500/10 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-teal-300/10 dark:bg-teal-700/5 blur-2xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04] dark:opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg shadow-md transition-colors backdrop-blur-sm"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* 3D Admin Login Card */}
      <div className="relative z-10 w-full max-w-md perspective-1000">
        <div className="
          relative rounded-2xl p-8 
          bg-white dark:bg-black 
          border border-slate-100 dark:border-slate-800
          shadow-[0_8px_0_0_#e2e8f0,0_20px_40px_rgba(20,184,166,0.15)] 
          dark:shadow-[0_8px_0_0_#111111,0_20px_40px_rgba(0,0,0,0.8),0_0_50px_rgba(20,184,166,0.1)]
          transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_0_0_#e2e8f0,0_30px_50px_rgba(20,184,166,0.2)]
          dark:hover:shadow-[0_12px_0_0_#111111,0_30px_50px_rgba(0,0,0,0.9),0_0_60px_rgba(20,184,166,0.15)]
        ">

          {/* Logo & title */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Admin Portal</h1>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Authorized Personnel Only
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Admin ID / Username
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Admin ID or Email"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1A1A] pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-teal-500 focus:outline-none shadow-[inset_0_3px_6px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.06),0_0_15px_rgba(20,184,166,0.2)] transition-all"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between items-center">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <Link
                  to="/admin/forgot-password"
                  className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1A1A] pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-teal-500 focus:outline-none shadow-[inset_0_3px_6px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] focus:shadow-[inset_0_3px_6px_rgba(0,0,0,0.06),0_0_15px_rgba(20,184,166,0.2)] transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-b from-teal-400 to-teal-600 border-b-4 border-teal-700 shadow-[0_8px_20px_rgba(20,184,166,0.3)] hover:brightness-110 hover:shadow-[0_12px_25px_rgba(20,184,166,0.4)] hover:-translate-y-0.5 active:border-b-0 active:translate-y-1 active:shadow-[0_2px_10px_rgba(20,184,166,0.3)] transition-all font-bold text-white tracking-wide uppercase text-sm"
              loading={loading}
            >
              Sign In to Admin Portal
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
