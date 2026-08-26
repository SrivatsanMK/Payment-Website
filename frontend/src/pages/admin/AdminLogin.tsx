import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../components/ui/Toast';
import { CinematicLogin } from '../../components/ui/CinematicLogin';

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
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      showToast('Please enter your Admin ID and password', 'error');
      return;
    }


    setLoading(true);
    try {
      const res = await login({ identifier: cleanId, password });
      const role = res.user.role;
      showToast('Admin login successful', 'success');

      if (role === 'ADMIN_1') {
        localStorage.removeItem('adminProfile');
        navigate('/admin/profile-selection');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      showToast(err || 'Invalid admin credentials. Please check your Admin ID.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CinematicLogin
      title="Admin Portal"
      identifierLabel="Admin ID"
      identifierPlaceholder="Enter Your Admin ID"
      passwordLabel="Password"
      forgotPasswordLink="/admin/forgot-password"
      forgotAdminIdLink="/admin/forgot-admin-id"
      submitLabel="Sign In"
      loading={loading}
      identifier={identifier}
      password={password}
      showPassword={showPassword}
      onIdentifierChange={setIdentifier}
      onPasswordChange={setPassword}
      onTogglePassword={() => setShowPassword(p => !p)}
      onSubmit={handleSubmit}
    />
  );
};

export default AdminLogin;
