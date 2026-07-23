import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../components/ui/Toast';
import { LiquidGlassLogin } from '../../components/ui/LiquidGlassLogin';

export const AdminLogin: React.FC = () => {
  const { login } = useAdminAuth();
  const { showToast } = useToast();
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
    <LiquidGlassLogin
      title="Admin Portal"
      identifierLabel="Admin ID / Username"
      identifierPlaceholder="Enter Admin ID or Email"
      passwordLabel="Password"
      forgotPasswordLink="/admin/forgot-password"
      submitLabel="Sign In to Admin Portal"
      loading={loading}
      identifier={identifier}
      password={password}
      showPassword={showPassword}
      onIdentifierChange={setIdentifier}
      onPasswordChange={setPassword}
      onTogglePassword={() => setShowPassword(p => !p)}
      onSubmit={handleSubmit}
      accentColor="cyan"
    />
  );
};

export default AdminLogin;
