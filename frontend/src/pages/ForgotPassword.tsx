import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ui/Toast';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

import { API_URL } from '../utils/config';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Customer' | 'Admin'>(() => {
    return (location.state as any)?.role || 'Customer';
  });
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

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 p-8">
        
        {/* Back Link */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-150">
            Forgot Password
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            We will send a 6-digit OTP code to verify your identity.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector representation */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Confirm Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('Customer')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  role === 'Customer'
                    ? 'border-primary-500 bg-primary-500/5 text-primary-600 dark:text-primary-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('Admin')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  role === 'Admin'
                    ? 'border-primary-500 bg-primary-500/5 text-primary-600 dark:text-primary-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
            Send OTP Code
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
