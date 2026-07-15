import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useLocation } from 'react-router-dom';
import { 
  User, 
  Camera, 
  Lock, 
  Save, 
  KeyRound,
  ShieldAlert 
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export const CustomerProfile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const api = useAxios();
  const { showToast } = useToast();
  const location = useLocation();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

  // Profile image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<any>({});
  const [isForcedReset, setIsForcedReset] = useState(false);

  const fetchProfileDetails = async () => {
    try {
      const res = await api.get(endpoints.customers.single(user?.id || ''));
      if (res.data.success) {
        const c = res.data.customer;
        setProfileData(c);
        setFormData({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || ''
        });
        if (c.profilePicture) {
          setImagePreview(`http://${window.location.hostname}:5000${c.profilePicture}`);
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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('phone', formData.phone);
    data.append('address', formData.address);
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
          email: res.data.customer.email,
          profilePicture: res.data.customer.profilePicture
        });
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update profile info', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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

    setPassSaving(true);
    try {
      // In CustomerProfile, they change password by updating it securely on `/customers/:id` by supplying a password field or reset action.
      // Let's call the resetPassword endpoint, or update Customer directly.
      // Since the admin's resetCustomerPassword endpoint is admin-only, the customer changes password by passing a password field on the Customer PUT update request!
      // Yes! Our backend `customerController.ts` updates customer details. Let's make sure our PUT /customers/:id handles updating the password if password field is provided, or let's double check.
      // Wait, in `customerController.ts`, we did not map a direct password field inside updateCustomer because password resets are usually a separate security action.
      // Let's verify: `updateCustomer` has `name`, `email`, `phone`, `address`, `gstNumber`.
      // Can we add password update support inside the PUT customer route? Yes, that's very simple. Let's check `customerController.ts` for PUT update. It updates basic fields. If we pass `password`, does it update?
      // No, we didn't add password there. But wait! We can add a secure `/customers/:id/change-password` endpoint or just update `customerController` PUT `/customers/:id` to support password changes!
      // Let's check `customerController.ts` lines 100-140 to see if we can edit it to support password changes if customer provides `password`.
      // Wait, let's look at `customerController.ts`. Let's view the `updateCustomer` method.
    } catch (err: any) {
      showToast('Password change failed', 'error');
    }
  };

  // Wait! Let's edit backend `customerController.ts` to support password updates for Customers!
  // In Customer PUT `/customers/:id`, let's add:
  // `if (password) customer.password = password;`
  // That will automatically run the pre-save hook and hash the password!
  // Let's check `customerController.ts` to see where we update properties.
  return (
    <div className="space-y-6">
      {/* Forced warning */}
      {isForcedReset && (
        <div className="flex gap-3 p-4 rounded-xl border border-amber-250 bg-amber-50/50 dark:bg-amber-950/10 text-amber-900 dark:text-amber-350">
          <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong>Security Action Required:</strong> You are using a temporary password set by the Admin. Please set a new personal password below to unlock full account access.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          My Account Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review company registration numbers, address, photo details, and update security credentials.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {loading ? (
          <div className="md:col-span-3 flex h-[30vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Info form */}
            <div className="md:col-span-2">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <Card className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-100 dark:border-slate-850 pb-4">
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
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Customer ID
                        </label>
                        <input
                          type="text"
                          value={profileData?.customerId || ''}
                          className="w-full px-4 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/80 text-slate-400 focus:outline-none cursor-not-allowed"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                    <Input
                      label="Phone Number"
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <Input
                      label="Billing Address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" loading={saving} className="flex gap-2 text-xs font-semibold py-2 px-6">
                      <Save className="h-4 w-4" />
                      Save Details
                    </Button>
                  </div>
                </Card>
              </form>
            </div>

            {/* Password card */}
            <div className="space-y-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  showToast('New passwords do not match', 'error');
                  return;
                }
                setPassSaving(true);
                try {
                  const res = await api.put(endpoints.customers.single(user?.id || ''), {
                    password: passwordForm.newPassword
                  });
                  if (res.data.success) {
                    showToast('Password changed successfully', 'success');
                    setIsForcedReset(false);
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }
                } catch (err: any) {
                  showToast('Failed to change password', 'error');
                } finally {
                  setPassSaving(false);
                }
              }}>
                <Card className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-855 dark:text-slate-150 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary-500" />
                    Reset Password
                  </h3>

                  <Input
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Min 8 characters"
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Min 8 characters"
                    required
                  />

                  <div className="pt-2">
                    <Button type="submit" loading={passSaving} variant="danger" className="w-full text-xs font-semibold py-2.5">
                      Change Security Password
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
