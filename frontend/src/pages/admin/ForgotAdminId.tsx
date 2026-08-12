import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../components/ui/Toast';
import { Mail, ArrowLeft, Sun, Moon, KeyRound, CheckCircle2, Copy, Check, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../utils/config';
import { endpoints } from '../../services/api';
import ParticleScene from '../../components/ui/particles/ParticleScene';

export const ForgotAdminId: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Wizard steps: 1 = Email Input, 2 = OTP Verification, 3 = New Admin ID Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Result data
  const [oldAdminId, setOldAdminId] = useState('');
  const [newAdminId, setNewAdminId] = useState('');

  /* ────────────────── Step 1: Request OTP ────────────────── */
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.trim()) {
      showToast('Please enter your registered admin email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}${endpoints.auth.adminForgotIdRequestOtp}`, {
        email: email.trim(),
      });

      if (res.data.success) {
        showToast(res.data.message || 'OTP verification code sent to your registered email', 'success');
        setStep(2);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send OTP code. Please check your email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ────────────────── Resend OTP Helper ────────────────── */
  const handleResendOtp = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await axios.post(`${API_URL}${endpoints.auth.adminForgotIdRequestOtp}`, {
        email: email.trim(),
      });
      if (res.data.success) {
        showToast('A new OTP verification code has been sent to your email', 'success');
        setOtp('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to resend OTP code.', 'error');
    } finally {
      setResending(false);
    }
  };

  /* ────────────────── Step 2: Verify OTP & Generate New Admin ID ────────────────── */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      showToast('Please enter the complete 6-digit OTP code', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}${endpoints.auth.adminForgotIdVerifyOtp}`, {
        email: email.trim(),
        otp: otp.trim(),
      });

      if (res.data.success) {
        showToast('OTP verified successfully! New Admin ID generated.', 'success');
        setOldAdminId(res.data.oldAdminId || '');
        setNewAdminId(res.data.newAdminId || '');
        setStep(3);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid or expired OTP verification code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ────────────────── Copy New Admin ID Helper ────────────────── */
  const handleCopyNewId = () => {
    if (!newAdminId) return;
    navigator.clipboard.writeText(newAdminId);
    setCopied(true);
    showToast('New Admin ID copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
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
          to="/admin/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin Login
        </Link>

        {/* ════════════════ STEP 1: REGISTERED EMAIL INPUT ════════════════ */}
        {step === 1 && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Forgot Admin ID?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Enter your registered email address to verify your identity.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                    placeholder="Enter your registered admin email"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2"
                loading={loading}
              >
                <Send className="h-4 w-4" />
                Send OTP
              </Button>
            </form>
          </>
        )}

        {/* ════════════════ STEP 2: VERIFY OTP ════════════════ */}
        {step === 2 && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Verify Email OTP
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Enter the 6-digit OTP sent to <strong className="text-purple-600 dark:text-purple-400">{email}</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 text-center text-lg font-mono font-bold tracking-[6px] rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                >
                  Verify OTP
                </Button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 transition-all"
                  >
                    {resending ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {/* ════════════════ STEP 3: SUCCESS NEW ADMIN ID SCREEN ════════════════ */}
        {step === 3 && (
          <div className="text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Admin ID Updated Successfully
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                Your new Admin ID is ready to use.
              </p>
            </div>

            {/* Big Admin ID Box */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 backdrop-blur-md space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400">
                Your New Admin ID
              </span>
              <div className="text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
                {newAdminId}
              </div>
              {oldAdminId && (
                <div className="text-[11px] text-slate-400 line-through font-mono pt-0.5">
                  Previous: {oldAdminId}
                </div>
              )}
            </div>

            {/* Information Subtexts */}
            <div className="text-left p-3.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 space-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Your previous Admin ID is no longer valid.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Your password remains unchanged.</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                type="button"
                onClick={handleCopyNewId}
                className="w-full flex items-center justify-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Admin ID'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Back to Admin Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotAdminId;
