import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { CinematicLogin } from '../components/ui/CinematicLogin';

export const Login: React.FC = () => {
  const { login } = useAuth();
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
      showToast('Please enter your Customer ID and password', 'error');
      return;
    }

    if (cleanId.includes('@')) {
      showToast('Email login is disabled. Please enter your assigned Customer ID (e.g. CUST-10001).', 'error');
      return;
    }

    if (/^\+?\d{10,15}$/.test(cleanId)) {
      showToast('Phone number login is disabled. Please enter your assigned Customer ID (e.g. CUST-10001).', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ identifier: cleanId, password });
      showToast('Welcome back!', 'success');

      if (res.user.forcedPasswordReset) {
        navigate('/profile', { state: { forcedReset: true } });
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      showToast(
        err || 'Invalid credentials. Please check your Customer ID and password.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CinematicLogin
      title="Customer Portal"
      identifierLabel="Customer ID"
      identifierPlaceholder="Enter Your Customer ID (e.g. CUST-10001)"
      passwordLabel="Password"
      forgotPasswordLink="/forgot-password"
      forgotCustomerIdLink="/forgot-customer-id"
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

export default Login;
