import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ui/Toast';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const resetToken = (location.state as any)?.resetToken || '';
  const role = (location.state as any)?.role || 'Customer';

  useEffect(() => {
    if (!resetToken) {
      showToast('Unauthorized access. Request OTP.', 'error');
      navigate('/forgot-password');
    }
  }, [resetToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      showToast('All fields are required', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`http://${window.location.hostname}:5000/api/auth/reset-password`, {
        resetToken,
        password,
        role
      });
      if (res.data.success) {
        showToast('Password updated successfully. You can log in now.', 'success');
        navigate('/login', { state: { role } });
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Password update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 p-8">
        
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-150">
            Set New Password
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose a strong, secure password for your account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-655"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            loading={loading}
          >
            Update & Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
