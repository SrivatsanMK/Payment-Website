import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  User, 
  Camera, 
  Save, 
  KeyRound,
  Mail,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Send,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Phone
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { API_URL, getAssetUrl } from '../../utils/config';

export const CustomerProfile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const api = useAxios();
  const { showToast } = useToast();
  const location = useLocation();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);

  // Profile image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // Basic Form states (Name, Address)
  const [basicForm, setBasicForm] = useState({
    name: '',
    address: ''
  });

  // Sensitive Form states (Email, Phone) protected by OTP
  const [sensitiveData, setSensitiveData] = useState({
    email: '',
    phone: ''
  });

  /* ── Sensitive fields OTP state-machine ──
     step 0 = idle (locked sensitive fields)
     step 1 = OTP sent, waiting for code
     step 2 = OTP verified, fields unlocked for editing
  */
  const [sensitiveStep, setSensitiveStep] = useState<0 | 1 | 2>(0);
  const [sendingSensitiveOtp, setSendingSensitiveOtp] = useState(false);
  const [verifyingSensitiveOtp, setVerifyingSensitiveOtp] = useState(false);
  const [savingSensitive, setSavingSensitive] = useState(false);
  const [sensitiveOtpCode, setSensitiveOtpCode] = useState('');
  const [profileToken, setProfileToken] = useState('');

  const [isForcedReset, setIsForcedReset] = useState(false);

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

  const fetchProfileDetails = async () => {
    try {
      const res = await api.get(endpoints.customers.single(user?.id || ''));
      if (res.data.success) {
        const c = res.data.customer;
        setProfileData(c);
        setBasicForm({
          name: c.name || '',
          address: c.address || ''
        });
        setSensitiveData({
          email: c.email || '',
          phone: c.phone || ''
        });
        if (c.profilePicture) {
          setImagePreview(getAssetUrl(c.profilePicture));
        } else {
          setImagePreview('/temp_profile_photo.png');
        }
      }
    } catch (err) {
      showToast('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
    
    // Check if redirect was forced password reset
    if ((location.state as any)?.forcedReset) {
      setIsForcedReset(true);
      showToast('Administrator requires a security password update on this account.', 'info');
    }
  }, [user, location.state]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  /* ─────────────────────── save basic info ───────────────────── */
  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBasic(true);

    const data = new FormData();
    data.append('name', basicForm.name);
    data.append('address', basicForm.address);
    if (imageFile) {
      data.append('profilePicture', imageFile);
    }

    try {
      const res = await api.put(endpoints.customers.single(user?.id || ''), data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Profile details updated successfully', 'success');
        updateUserProfile({
          name: res.data.customer.name,
          profilePicture: res.data.customer.profilePicture
        });
        setProfileData((prev: any) => ({ ...prev, ...res.data.customer }));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update profile info', 'error');
    } finally {
      setSavingBasic(false);
    }
  };

  /* ──────────── OTP flow for sensitive (email / phone) ────────── */
  const handleRequestSensitiveOtp = async () => {
    setSendingSensitiveOtp(true);
    try {
      const res = await api.post(endpoints.auth.customerProfileRequestOtp);
      if (res.data.success) {
        showToast(`Verification OTP sent to ${sensitiveData.email}`, 'success');
        setSensitiveStep(1);
        setSensitiveOtpCode('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send verification OTP', 'error');
    } finally {
      setSendingSensitiveOtp(false);
    }
  };

  const handleVerifySensitiveOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sensitiveOtpCode.trim().length !== 6) {
      showToast('Please enter the 6-digit OTP code', 'error');
      return;
    }
    setVerifyingSensitiveOtp(true);
    try {
      const res = await api.post(endpoints.auth.customerProfileVerifyOtp, { otp: sensitiveOtpCode.trim() });
      if (res.data.success) {
        showToast('Identity verified! Update your email / phone below.', 'success');
        setProfileToken(res.data.profileToken);
        setSensitiveStep(2);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid or expired OTP', 'error');
    } finally {
      setVerifyingSensitiveOtp(false);
    }
  };

  const handleSaveSensitive = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSensitive(true);
    try {
      const data = new FormData();
      data.append('email', sensitiveData.email);
      data.append('phone', sensitiveData.phone);
      if (profileToken) {
        data.append('profileToken', profileToken);
      }

      const res = await api.put(endpoints.customers.single(user?.id || ''), data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'x-profile-token': profileToken
        }
      });

      if (res.data.success) {
        showToast('Email & phone updated successfully', 'success');
        setProfileData((prev: any) => ({ ...prev, ...res.data.customer }));
        updateUserProfile({ email: res.data.customer.email });
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
    if (!profileData?.email) {
      showToast('No registered email found for this account', 'error');
      return;
    }
    setSendingPwdOtp(true);
    try {
      const res = await axios.post(`${API_URL}${endpoints.auth.forgotPassword}`, {
        email: profileData.email,
        role: 'Customer'
      });
      if (res.data.success) {
        showToast(`Verification OTP sent to ${profileData.email}`, 'success');
        setPwdStep(2);
        setPwdOtpCode('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send OTP code', 'error');
    } finally {
      setSendingPwdOtp(false);
    }
  };

  const handleVerifyPwdOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdOtpCode || pwdOtpCode.trim().length !== 6) {
      showToast('Please enter the complete 6-digit OTP code', 'error');
      return;
    }
    setVerifyingPwdOtp(true);
    try {
      const res = await axios.post(`${API_URL}${endpoints.auth.verifyOtp}`, {
        email: profileData?.email,
        otp: pwdOtpCode.trim()
      });
      if (res.data.success) {
        showToast('OTP verified! Set your new password.', 'success');
        setResetToken(res.data.resetToken);
        setPwdStep(3);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid or expired OTP verification code.', 'error');
    } finally {
      setVerifyingPwdOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('Please fill in password fields', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setResettingPwd(true);
    try {
      const res = await axios.post(`${API_URL}${endpoints.auth.resetPassword}`, {
        resetToken,
        password: passwordForm.newPassword,
        role: 'Customer'
      });
      if (res.data.success) {
        showToast('Password updated successfully!', 'success');
        setIsForcedReset(false);
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

  return (
    <div className="space-y-6">
      {/* Forced warning */}
      {isForcedReset && (
        <div className="flex gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
          <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong>Security Action Required:</strong> You are using a temporary password set by the Admin. Please verify via OTP and set a new personal password below.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          My Account Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review client registration details, contact info, photo, and manage security credentials.
        </p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── TOP ROW: Basic Details (Left 2/3) & Reset Password (Right 1/3) ── */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-stretch">
            {/* Left: Basic info form */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <form onSubmit={handleSaveBasic} className="h-full flex flex-col">
                <Card className="h-full flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                      {/* Avatar Uploader */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-24 w-24 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900/30 relative group shadow-sm">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Avatar" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-10 w-10 text-slate-400" />
                          )}
                          <label className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                            <Camera className="h-5 w-5 text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                          </label>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Photo</span>
                      </div>

                      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Full Client Name"
                          type="text"
                          value={basicForm.name}
                          onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                          required
                        />
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Customer ID
                          </label>
                          <input
                            type="text"
                            value={profileData?.customerId || ''}
                            className="w-full px-4 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/80 text-slate-400 focus:outline-none cursor-not-allowed font-mono font-semibold"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="Billing Address"
                        type="text"
                        value={basicForm.address}
                        onChange={(e) => setBasicForm({ ...basicForm, address: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button type="submit" loading={savingBasic} className="flex gap-2 text-xs font-semibold py-2 px-6">
                      <Save className="h-4 w-4" />
                      Save Details
                    </Button>
                  </div>
                </Card>
              </form>
            </div>

            {/* Right: OTP-gated Reset Password Card */}
            <div className="lg:col-span-1 flex flex-col h-full">
              <Card className="h-full flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-purple-500" />
                      Reset Password
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Update your login password securely using one-time OTP verification sent to your email.
                    </p>
                  </div>

                  {/* Step 1: Idle View */}
                  {pwdStep === 1 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <Mail className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">OTP will be sent to</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{profileData?.email || 'Registered Email'}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Click below to receive a 6-digit OTP code to verify your identity before creating a new password.
                      </p>
                    </div>
                  )}

                  {/* Step 2: OTP Entry */}
                  {pwdStep === 2 && (
                    <form onSubmit={handleVerifyPwdOtp} className="space-y-3 pt-1">
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-2 font-medium">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        OTP sent to <strong className="truncate">{profileData?.email}</strong>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          6-Digit OTP Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={pwdOtpCode}
                          onChange={(e) => setPwdOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-[6px] rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button type="button" variant="outline" onClick={() => setPwdStep(1)} className="w-1/3 text-xs py-2">
                          Back
                        </Button>
                        <Button type="submit" loading={verifyingPwdOtp} className="w-2/3 text-xs font-semibold py-2">
                          Verify OTP
                        </Button>
                      </div>

                      {/* Didn't receive OTP */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1.5 mt-2">
                        <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" /> Didn't receive code?
                        </p>
                        <button
                          type="button"
                          onClick={handleSendPwdOtp}
                          disabled={sendingPwdOtp}
                          className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline text-left flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${sendingPwdOtp ? 'animate-spin' : ''}`} />
                          {sendingPwdOtp ? 'Sending...' : 'Resend OTP Code'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 3: New Password */}
                  {pwdStep === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
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
                        <button
                          type="button"
                          onClick={() => setShowNewPwd(!showNewPwd)}
                          className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
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
                        <button
                          type="button"
                          onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                          className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
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

          {/* ── LOWER ROW: Email & Phone (Left 2/3) & Login Credentials (Right 1/3) ── */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-stretch">
            {/* ── CARD 2: Sensitive fields (Email / Phone) with OTP gate (2/3 width) ── */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <Card className="h-full flex flex-col justify-between space-y-4">
                <div className="space-y-4">
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
                          loading={sendingSensitiveOtp}
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
                        value={sensitiveOtpCode}
                        onChange={(e) => setSensitiveOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        required
                      />

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { setSensitiveStep(0); setSensitiveOtpCode(''); }}
                          className="text-xs py-2.5 flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          loading={verifyingSensitiveOtp}
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
                            disabled={sendingSensitiveOtp}
                            className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline py-1.5 px-3 rounded-lg hover:bg-purple-500/10 transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resend OTP
                          </button>
                        </div>
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
                </div>
              </Card>
            </div>

            {/* ── CARD 3: Login credentials summary (1/3 width) ── */}
            <div className="lg:col-span-1 flex flex-col h-full">
              <Card className="h-full flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-teal-500" />
                    Your Login Credentials
                  </h3>
                  <div className="space-y-2 text-[11px] mt-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Customer ID</span>
                      <span className="font-mono font-bold text-purple-500">{profileData?.customerId || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Account Role</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Customer</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Registered Email</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate max-w-[120px]">
                        {profileData?.email || '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed pt-2">
                  You can login using your <strong>Customer ID</strong>, <strong>registered email</strong>, or <strong>phone number</strong> with your password.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
