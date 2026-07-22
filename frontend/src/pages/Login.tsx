import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Logo } from '../components/ui/Logo';
import { useTheme } from '../context/ThemeContext';
import { Lock, User, Sun, Moon, Package, Box } from 'lucide-react';
import Button from '../components/ui/Button';

export const Login: React.FC = () => {
  const { login } = useAuth();
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
      showToast('Welcome back!', 'success');

      if (res.user.forcedPasswordReset) {
        navigate('/profile', { state: { forcedReset: true } });
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      showToast(err || 'Invalid credentials. Please check your Customer ID and password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-[#2A2A2A] dark:via-[#2A2A2A] dark:to-[#2A2A2A] px-4 overflow-hidden">

      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary-100/60 dark:bg-primary-900/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-100/60 dark:bg-blue-900/10 blur-3xl" />
        <div className="absolute top-10 right-20 text-slate-200 dark:text-slate-800 opacity-40 transform rotate-12">
          <Package size={100} strokeWidth={1} />
        </div>
        <div className="absolute bottom-10 left-20 text-slate-200 dark:text-slate-800 opacity-40 transform -rotate-12">
          <Box size={120} strokeWidth={1} />
        </div>
        <div className="absolute top-1/3 left-10 text-slate-200 dark:text-slate-800 opacity-20 transform rotate-45">
          <Package size={60} strokeWidth={1} />
        </div>
      </div>

      {/* Top controls */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg shadow-md transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl bg-white dark:bg-black p-8 shadow-[0_20px_60px_rgba(8,112,184,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800">

          {/* Logo & branding */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 hover:scale-105 transition-transform">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Customer Portal</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Customer ID / Email
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. CUST12345 or your email"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A1A1A] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all shadow-inner"
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
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A1A1A] pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all shadow-inner"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
              className="w-full mt-2 py-2.5 rounded-xl shadow-[0_8px_20px_rgba(8,112,184,0.2)] hover:shadow-[0_12px_24px_rgba(8,112,184,0.3)] transition-all"
              loading={loading}
            >
              Sign In Securely
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
