import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  User,
  Camera,
  Save,
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Send,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { getAssetUrl } from '../../utils/config';

/* ─── Role label helper ─── */
const roleLabel = (role: string) => {
  if (role === 'ADMIN_1') return 'Akash Admin';
  return 'Hrithik Admin';
};

export const AdminProfile: React.FC = () => {
  const { admin, updateAdminProfile } = useAdminAuth();
  const api = useAxios();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ── avatar ── */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  /* ── profile data from server ── */
  const [profileData, setProfileData] = useState<any>(null);

  /* ── editable form (safe fields — no OTP needed) ── */
  const [formData, setFormData] = useState({
    username: '',
  });

  /* ── sensitive fields that need OTP verification ── */
  const [sensitiveData, setSensitiveData] = useState({
    email: '',
    phone: '',
  });

  /* ── OTP state-machine for sensitive field changes ──
     step 0 = idle (show locked sensitive fields)
     step 1 = OTP sent, waiting for code
     step 2 = OTP verified, fields unlocked for editing
  */
  const [sensitiveStep, setSensitiveStep] = useState<0 | 1 | 2>(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [profileToken, setProfileToken] = useState('');
  const [savingSensitive, setSavingSensitive] = useState(false);

  /* ── Password reset OTP state-machine ──
     step 1 = idle, step 2 = OTP sent, step 3 = OTP verified, enter new pwd
  */
  const [pwdStep, setPwdStep] = useState<1 | 2 | 3>(1);
  const [sendingPwdOtp, setSendingPwdOtp] = useState(false);
  const [verifyingPwdOtp, setVerifyingPwdOtp] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [pwdOtpCode, setPwdOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  /* ─────────────────────────── fetch ─────────────────────────── */
  const fetchProfile = async () => {
    try {
      const res = await api.get(endpoints.auth.adminProfile);
      if (res.data.success) {
        const a = res.data.admin;
        setProfileData(a);
        setFormData({ username: a.username || '' });
        setSensitiveData({ email: a.email || '', phone: a.phone || '' });
        if (a.profilePicture) {
          setImagePreview(getAssetUrl(a.profilePicture));
        } else {
          setImagePreview('/temp_profile_photo.png');
        }
      }
    } catch {
      showToast('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  /* ─────────────────────────── avatar ─────────────────────────── */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  /* ─────────────────────── save basic info ───────────────────── */
  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    data.append('username', formData.username);
    if (imageFile) data.append('profilePicture', imageFile);
    try {
      const res = await api.put(endpoints.auth.adminProfile, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Profile details saved successfully', 'success');
        updateAdminProfile({
          name: res.data.admin.username,
          email: res.data.admin.email,
          profilePicture: res.data.admin.profilePicture
        });
        setProfileData((prev: any) => ({ ...prev, ...res.data.admin }));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ──────────── OTP flow for sensitive (email / phone) ────────── */
  const handleRequestSensitiveOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await api.post(endpoints.auth.adminProfileRequestOtp);
      if (res.data.success) {
        showToast(`OTP sent to ${sensitiveData.email}`, 'success');
        setSensitiveStep(1);
        setOtpCode('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifySensitiveOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showToast('Enter the 6-digit OTP code', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await api.post(endpoints.auth.adminProfileVerifyOtp, { otp: otpCode.trim() });
      if (res.data.success) {
        showToast('Identity verified! Update your email / phone below.', 'success');
        setProfileToken(res.data.profileToken);
        setSensitiveStep(2);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid OTP', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleNotifyOtpIssue = async () => {
    setNotifying(true);
    try {
      const res = await api.post(endpoints.auth.adminProfileNotifyIssue);
      if (res.data.success) {
        showToast('Notification email sent to all admin accounts', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send notification', 'error');
    } finally {
      setNotifying(false);
    }
  };

  const handleSaveSensitive = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSensitive(true);
    try {
      const data = new FormData();
      data.append('email', sensitiveData.email);
      data.append('phone', sensitiveData.phone);
      const res = await api.put(endpoints.auth.adminProfile, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Email & phone updated successfully', 'success');
        setProfileData((prev: any) => ({ ...prev, ...res.data.admin }));
        updateAdminProfile({ email: res.data.admin.email });
        setSensitiveStep(0);
        setProfileToken('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update contact details', 'error');
    } finally {
      setSavingSensitive(false);
    }
  };

  /* ─────────────────── OTP password reset flow ──────────────── */
  const handleSendPwdOtp = async () => {
    setSendingPwdOtp(true);
    try {
      const res = await api.post(endpoints.auth.adminForgotPassword, {
        email: profileData?.email,
        role: 'Admin'
      });
      if (res.data.success) {
        showToast(`OTP sent to ${profileData?.email}`, 'success');
        setPwdStep(2);
        setPwdOtpCode('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send OTP', 'error');
    } finally {
      setSendingPwdOtp(false);
    }
  };

  const handleVerifyPwdOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingPwdOtp(true);
    try {
      const res = await api.post(endpoints.auth.adminVerifyOtp, {
        email: profileData?.email,
        otp: pwdOtpCode.trim()
      });
      if (res.data.success) {
        showToast('OTP verified! Set your new password.', 'success');
        setResetToken(res.data.resetToken);
        setPwdStep(3);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid OTP', 'error');
    } finally {
      setVerifyingPwdOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match', 'error'); return;
    }
    setResettingPwd(true);
    try {
      const res = await api.post(endpoints.auth.adminResetPassword, {
        resetToken,
        password: passwordForm.newPassword,
        role: 'Admin'
      });
      if (res.data.success) {
        showToast('Password updated! Works across both admin profiles.', 'success');
        setPwdStep(1);
        setPwdOtpCode('');
        setResetToken('');
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setResettingPwd(false);
    }
  };

  const copyAdminId = () => {
    if (profileData?.adminId) {
      navigator.clipboard.writeText(profileData.adminId);
      showToast('Admin ID copied to clipboard', 'success');
    }
  };

  const currentRoleLabel = roleLabel(profileData?.role || '');

  /* ════════════════════════════════ RENDER ════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Admin Account Profile
        </h1>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── TOP ROW: Admin Profile (Left) & Reset Password (Right) with Equal Height ── */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-stretch">
            {/* ── LEFT: Basic Info (2/3 width) ── */}
            <form onSubmit={handleSaveBasic} className="lg:col-span-2 flex flex-col h-full">
              <Card className="h-full flex flex-col justify-between space-y-5">
                <div className="space-y-5">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row gap-5 items-start">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="h-24 w-24 rounded-full border-2 border-purple-500/30 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900/30 relative group shadow-lg">
                        <img
                          src={imagePreview || '/temp_profile_photo.png'}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.endsWith('/temp_profile_photo.png')) {
                              target.src = '/temp_profile_photo.png';
                            }
                          }}
                        />
                        <label className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-full">
                          <Camera className="h-5 w-5 text-white" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Photo</span>
                    </div>

                    {/* Name field only */}
                    <div className="flex-1 w-full">
                      <Input
                        label="Admin Name"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Admin ID + Role badge */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Admin ID — read-only */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Admin ID
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-purple-600 dark:text-purple-400 cursor-not-allowed">
                          {profileData?.adminId || '—'}
                        </div>
                        {profileData?.adminId && (
                          <button
                            type="button"
                            onClick={copyAdminId}
                            title="Copy Admin ID"
                            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-purple-500/10 text-slate-500 hover:text-purple-500 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Role badge */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Account Role
                      </label>
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold ${profileData?.role === 'ADMIN_1'
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                        }`}>
                        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                        <span>{currentRoleLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={saving} className="flex gap-2 text-xs font-semibold py-2.5 px-6">
                    <Save className="h-4 w-4" />
                    Save Name &amp; Photo
                  </Button>
                </div>
              </Card>
            </form>

            {/* ── RIGHT: Password Reset via OTP (1/3 width) ── */}
            <div className="lg:col-span-1 flex flex-col h-full">
              <Card className="h-full flex flex-col justify-between space-y-4">
                <div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-purple-500" />
                      Reset Password
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      OTP sent to your email. Changing password here updates both admin profiles.
                    </p>
                  </div>

                  {/* Step 1 */}
                  {pwdStep === 1 && (
                    <div className="space-y-4 pt-3">
                      <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                          <Mail className="h-4 w-4" /> Email Verification
                        </p>
                        <p className="text-[11px] text-slate-400">
                          OTP will be sent to:<br />
                          <span className="font-bold text-slate-800 dark:text-white break-all">{profileData?.email}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Enter OTP */}
                  {pwdStep === 2 && (
                    <form onSubmit={handleVerifyPwdOtp} className="space-y-4 pt-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400">
                        Enter the code sent to <strong>{profileData?.email}</strong>.
                      </div>

                      <Input
                        label="6-Digit OTP Code"
                        type="text"
                        value={pwdOtpCode}
                        onChange={(e) => setPwdOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter OTP"
                        maxLength={6}
                        required
                      />

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setPwdStep(1)} className="w-1/3 text-xs py-2.5">
                          Back
                        </Button>
                        <Button type="submit" loading={verifyingPwdOtp} className="w-2/3 text-xs font-semibold py-2.5">
                          Verify OTP
                        </Button>
                      </div>

                      {/* Didn't receive OTP */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                        <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" /> Didn't receive OTP?
                        </p>
                        <div className="flex flex-col gap-1.5">
                          <button type="button" onClick={handleSendPwdOtp} disabled={sendingPwdOtp}
                            className="text-[10px] font-semibold text-purple-500 hover:underline text-left flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" /> Resend OTP
                          </button>
                          <button type="button" onClick={handleNotifyOtpIssue} disabled={notifying}
                            className="text-[10px] font-semibold text-amber-500 hover:underline text-left flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {notifying ? 'Sending...' : 'Notify Admins via Email'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Step 3: New password */}
                  {pwdStep === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-4 pt-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        OTP Verified! Set your new password.
                      </div>

                      <div className="relative">
                        <Input
                          label="New Password"
                          type={showNewPwd ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="Min 8 characters"
                          required
                        />
                        <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                          className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          label="Confirm New Password"
                          type={showConfirmPwd ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Re-enter password"
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                          className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <Button type="submit" loading={resettingPwd} variant="danger" className="w-full text-xs font-semibold py-2.5">
                        Update Password
                      </Button>
                    </form>
                  )}
                </div>

                {pwdStep === 1 && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={handleSendPwdOtp}
                      loading={sendingPwdOtp}
                      className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5"
                    >
                      <Send className="h-4 w-4" />
                      Send OTP to Email
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ── LOWER ROW: Email & Phone (Left) & Login Credentials (Right) ── */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-start">
            {/* ── CARD 2: Sensitive fields (Email / Phone) with OTP gate (2/3 width) ── */}
            <div className="lg:col-span-2">
              <Card className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-purple-500" />
                    Email &amp; Phone — OTP Protected
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    To update your email or phone number, verify your identity with a one-time code sent to your current email.
                  </p>
                </div>

                {/* Step 0: Locked view */}
                {sensitiveStep === 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 cursor-not-allowed">
                          {sensitiveData.email || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                          Phone Number
                        </label>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 cursor-not-allowed">
                          {sensitiveData.phone || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 flex-1">
                        These fields are locked. Click below to receive a verification OTP on your current email, then unlock and update them.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleRequestSensitiveOtp}
                        loading={sendingOtp}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send OTP to Unlock
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 1: Enter OTP */}
                {sensitiveStep === 1 && (
                  <form onSubmit={handleVerifySensitiveOtp} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300">
                      A 6-digit verification code has been sent to <strong>{sensitiveData.email}</strong>. Enter it below to unlock your contact details.
                    </div>

                    <Input
                      label="6-Digit OTP Code"
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                    />

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setSensitiveStep(0); setOtpCode(''); }}
                        className="text-xs py-2.5 flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        loading={verifyingOtp}
                        className="text-xs font-semibold py-2.5 flex-1"
                      >
                        Verify OTP &amp; Unlock
                      </Button>
                    </div>

                    {/* Didn't receive OTP */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Didn't receive the OTP?
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={handleRequestSensitiveOtp}
                          disabled={sendingOtp}
                          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline py-1.5 px-3 rounded-lg hover:bg-purple-500/10 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Resend OTP
                        </button>
                        <button
                          type="button"
                          onClick={handleNotifyOtpIssue}
                          disabled={notifying}
                          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline py-1.5 px-3 rounded-lg hover:bg-amber-500/10 transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {notifying ? 'Sending...' : 'Notify Admins via Email'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        "Notify Admins" sends a tech-issue alert email to all admin accounts so someone can assist you.
                      </p>
                    </div>
                  </form>
                )}

                {/* Step 2: Unlocked — edit email / phone */}
                {sensitiveStep === 2 && (
                  <form onSubmit={handleSaveSensitive} className="space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      Identity verified! Update your email and phone number, then save.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Email Address"
                        type="email"
                        value={sensitiveData.email}
                        onChange={(e) => setSensitiveData({ ...sensitiveData, email: e.target.value })}
                        required
                      />
                      <Input
                        label="Phone Number"
                        type="text"
                        value={sensitiveData.phone}
                        onChange={(e) => setSensitiveData({ ...sensitiveData, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setSensitiveStep(0); setProfileToken(''); }}
                        className="text-xs py-2.5 flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        loading={savingSensitive}
                        className="text-xs font-semibold py-2.5 flex-1 flex items-center justify-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Email &amp; Phone
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>

            {/* ── CARD 3: Login credentials summary (1/3 width) ── */}
            <div className="lg:col-span-1">
              <Card className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-500" />
                  Your Login Credentials
                </h3>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Admin ID</span>
                    <span className="font-mono font-bold text-purple-500">{profileData?.adminId || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Username</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{profileData?.username || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Email</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate max-w-[120px]">
                      {profileData?.email || '—'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                  You can login using your <strong>Admin ID</strong>, <strong>username</strong>, <strong>email</strong>, or <strong>phone number</strong> with your password.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
