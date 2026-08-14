import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import { 
  Save, 
  Building2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export const Settings: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states — Business Name, Support Contact Phone, Gmail Address
  const [formData, setFormData] = useState({
    companyName: '',
    supportPhone: '',
    gmailAddress: ''
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get(endpoints.settings.base);
      if (res.data.success) {
        setSettings(res.data.settings);
        setFormData({
          companyName: res.data.settings.companyName || '',
          supportPhone: res.data.settings.supportPhone || '',
          gmailAddress: res.data.settings.gmailAddress || res.data.settings.email || 'greenglidelogistics@gmail.com'
        });
      }
    } catch (err) {
      showToast('Failed to load company configuration settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchSettings();
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.gmailAddress && !emailRegex.test(formData.gmailAddress.trim())) {
      showToast('Please enter a valid Gmail / Email address', 'error');
      return;
    }

    setSaving(true);
    
    const data = {
      companyName: formData.companyName.trim(),
      supportPhone: formData.supportPhone.trim(),
      gmailAddress: formData.gmailAddress.trim()
    };

    try {
      const res = await api.put(endpoints.settings.base, data);
      if (res.data.success) {
        showToast('Configuration settings updated successfully', 'success');
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update configuration settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Global Config Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure company branding, payment routing, and customer support details.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        {/* Branding details */}
        <Card className="space-y-6 p-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              Company Profile &amp; Branding
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Core company identification and customer care contact details.
            </p>
          </div>
          
          <div className="space-y-4">
            <Input
              label="Business Name"
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Green Glide Logistics"
              required
            />

            <Input
              label="Support Contact Phone"
              type="text"
              value={formData.supportPhone}
              onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
              placeholder="+91 98765 43210"
            />

            <Input
              label="Gmail Address"
              type="email"
              value={formData.gmailAddress}
              onChange={(e) => setFormData({ ...formData, gmailAddress: e.target.value })}
              placeholder="greenglidelogistics@gmail.com"
              required
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="submit" loading={saving} className="flex items-center gap-2 text-xs font-semibold py-2.5 px-6">
              <Save className="h-4 w-4" />
              Save Global Settings
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default Settings;
