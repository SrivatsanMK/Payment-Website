import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../components/ui/Toast';
import { Logo } from '../../components/ui/Logo';
import { useTheme } from '../../context/ThemeContext';
import { Lock, User, Sun, Moon, ShieldCheck } from 'lucide-react';
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

  // 3D Parallax Tilt State
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'all 0.5s ease-out',
  });
  const [glow, setGlow] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15; // Max 15deg tilt
    const rotateY = ((x - centerX) / centerX) * 15;

    setCardStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`,
      transition: 'transform 0.1s ease-out',
    });
    setGlow({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseLeave = () => {
    setCardStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
    });
    setGlow({ x: 50, y: 50, opacity: 0 });
  };

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
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#2A2A2A] px-4 overflow-hidden select-none">

      {/* Dynamic 3D Scene Ambient Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating 3D Cubes/Orbs */}
        <div className="absolute top-[10%] left-[8%] w-48 h-48 rounded-3xl bg-gradient-to-br from-teal-500/20 to-emerald-600/5 border border-white/10 backdrop-blur-md shadow-2xl animate-[float_8s_ease-in-out_infinite] transform -rotate-12" />
        <div className="absolute bottom-[12%] right-[8%] w-64 h-64 rounded-full bg-gradient-to-tr from-teal-500/20 to-cyan-600/10 border border-white/10 backdrop-blur-md shadow-2xl animate-[float_10s_ease-in-out_infinite_reverse] transform rotate-45" />
        <div className="absolute top-[50%] right-[15%] w-32 h-32 rounded-2xl bg-teal-400/10 border border-teal-500/20 backdrop-blur-sm animate-[pulse_6s_ease-in-out_infinite] transform rotate-12" />
        
        {/* Neon Ambient Grid Lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #14b8a6 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Top Theme Control */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={toggleTheme}
          className="p-3 text-slate-300 bg-black/60 border border-white/10 hover:border-teal-500/50 hover:text-teal-400 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-teal-400" />}
        </button>
      </div>

      {/* Interactive 3D Parallax Card */}
      <div 
        className="relative z-20 w-full max-w-md"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          style={cardStyle}
          className="
            relative rounded-[32px] p-8 sm:p-10
            bg-[#000000]
            border border-white/15
            shadow-[0_30px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(20,184,166,0.15)]
            backdrop-blur-2xl
            overflow-hidden
            transform-style-3d
          "
        >
          {/* Dynamic Cursor Light Reflection Layer */}
          <div 
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${glow.x}% ${glow.y}%, rgba(20, 184, 166, ${glow.opacity}), transparent 40%)`,
            }}
          />

          {/* Top Metallic Accent Bar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-32 bg-gradient-to-r from-transparent via-teal-500 to-transparent shadow-[0_0_15px_#14b8a6]" />

          {/* Floating Logo Layer (Deep 3D TranslateZ) */}
          <div className="mb-8 flex flex-col items-center transform-style-3d" style={{ transform: 'translateZ(40px)' }}>
            <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-md transform transition-transform duration-300 hover:scale-110">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
              Admin Portal
            </h1>
            <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authorized Personnel Only</span>
            </div>
          </div>

          {/* 3D Form Controls Layer */}
          <form onSubmit={handleSubmit} className="space-y-6 transform-style-3d" style={{ transform: 'translateZ(30px)' }}>
            
            {/* Admin ID / Username Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Admin ID / Username
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-teal-400 transition-colors">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Admin ID or Email"
                  className="
                    w-full rounded-2xl bg-[#141414] pl-12 pr-4 py-4 
                    text-sm font-medium text-white placeholder-slate-500 
                    border border-white/10
                    shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)]
                    focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20
                    transition-all duration-300
                  "
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <Link
                  to="/admin/forgot-password"
                  className="text-xs font-semibold text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-teal-400 transition-colors">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="
                    w-full rounded-2xl bg-[#141414] pl-12 pr-12 py-4 
                    text-sm font-medium text-white placeholder-slate-500 
                    border border-white/10
                    shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)]
                    focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20
                    transition-all duration-300
                  "
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Floating 3D Action Button Layer */}
            <div className="pt-2 transform-style-3d" style={{ transform: 'translateZ(50px)' }}>
              <Button
                type="submit"
                className="
                  w-full py-4 rounded-2xl
                  bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-500
                  bg-[length:200%_auto] hover:bg-[position:right_center]
                  border border-white/20
                  shadow-[0_15px_30px_rgba(20,184,166,0.5),0_0_20px_rgba(20,184,166,0.3)]
                  hover:shadow-[0_20px_40px_rgba(20,184,166,0.7),0_0_30px_rgba(20,184,166,0.5)]
                  hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-300 font-extrabold text-white tracking-wider uppercase text-sm
                "
                loading={loading}
              >
                Sign In to Admin Portal
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

