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

      {/* 3D Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none perspective-1000">
        {/* Glows */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary-500/20 dark:bg-primary-500/10 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 dark:bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Floating 3D Icons */}
        <div className="absolute top-20 right-[10%] text-slate-300 dark:text-black opacity-30 dark:opacity-40 animate-[bounce_8s_infinite] drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]">
          <div className="animate-[spin_15s_linear_infinite] preserve-3d">
            <Package size={140} strokeWidth={0.5} />
          </div>
        </div>
        <div className="absolute bottom-20 left-[10%] text-slate-300 dark:text-black opacity-30 dark:opacity-40 animate-[bounce_10s_infinite] drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" style={{ animationDelay: '1s' }}>
          <div className="animate-[spin_20s_linear_infinite_reverse] preserve-3d">
            <Box size={180} strokeWidth={0.5} />
          </div>
        </div>
        <div className="absolute top-1/3 left-10 text-slate-300 dark:text-black opacity-20 dark:opacity-30 animate-[bounce_12s_infinite] drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">
          <div className="animate-[spin_12s_linear_infinite] preserve-3d">
            <Package size={80} strokeWidth={1} />
          </div>
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

      {/* 3D Login Card Wrapper */}
      <div className="relative z-10 w-full max-w-md perspective-1000">
        <div className="
          relative rounded-3xl p-10 
          bg-white dark:bg-black 
          /* 3D Bevel Borders */
          border-t border-l border-white dark:border-[#333333]
          border-b-[8px] border-r-[8px] border-b-slate-200 border-r-slate-200 dark:border-b-[#0a0a0a] dark:border-r-[#0a0a0a]
          /* Deep Ambient Shadow */
          shadow-[0_40px_60px_-15px_rgba(8,112,184,0.2)] 
          dark:shadow-[0_40px_60px_-15px_rgba(0,0,0,1),0_0_40px_rgba(0,0,0,0.5)]
          transform transition-transform duration-500 hover:-translate-y-2 hover:shadow-[0_50px_70px_-15px_rgba(8,112,184,0.3)] dark:hover:shadow-[0_50px_70px_-15px_rgba(0,0,0,1),0_0_60px_rgba(8,112,184,0.15)]
        ">

          {/* Logo & branding */}
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-6 transform transition-transform duration-500 hover:scale-110 hover:rotate-3 drop-shadow-xl">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight drop-shadow-sm">Customer Portal</h1>
            <div className="h-1 w-12 bg-primary-500 rounded-full mt-4 shadow-[0_0_10px_rgba(var(--primary),0.8)]"></div>
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
                  className="w-full rounded-2xl bg-slate-50 dark:bg-[#151515] pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 
                             /* 3D Inset Cavity */
                             border-t-[3px] border-l-[3px] border-slate-200 dark:border-[#050505]
                             border-b border-r border-white dark:border-[#222222]
                             shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] 
                             dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.8),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]
                             focus:outline-none focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.8),0_0_20px_rgba(8,112,184,0.3)]
                             transition-all"
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
                  className="w-full rounded-2xl bg-slate-50 dark:bg-[#151515] pl-12 pr-12 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 
                             /* 3D Inset Cavity */
                             border-t-[3px] border-l-[3px] border-slate-200 dark:border-[#050505]
                             border-b border-r border-white dark:border-[#222222]
                             shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] 
                             dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.8),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]
                             focus:outline-none focus:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.8),0_0_20px_rgba(8,112,184,0.3)]
                             transition-all"
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

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full py-4 rounded-2xl 
                           bg-gradient-to-b from-primary-400 to-primary-600 
                           /* 3D Button Bevel */
                           border-t-2 border-white/30
                           border-b-[6px] border-primary-800
                           /* Drop shadow */
                           shadow-[0_10px_20px_rgba(8,112,184,0.4)]
                           /* Active Press State */
                           active:border-b-[0px] active:translate-y-[6px] active:shadow-[0_2px_5px_rgba(8,112,184,0.4)]
                           hover:brightness-110
                           transition-all font-extrabold text-white tracking-[0.2em] uppercase text-sm"
                loading={loading}
              >
                Sign In Securely
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
