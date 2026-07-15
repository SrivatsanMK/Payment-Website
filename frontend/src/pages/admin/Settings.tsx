import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import { 
  Save, 
  Database, 
  Building2, 
  Upload, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input, { Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export const Settings: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);


  // Form states
  const [formData, setFormData] = useState({
    companyName: '',
    upiId: '',
    backupFrequency: 'weekly',
    backupEmail: '',
    supportPhone: ''
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get(endpoints.settings.base);
      if (res.data.success) {
        setSettings(res.data.settings);
        setFormData({
          companyName: res.data.settings.companyName || '',
          upiId: res.data.settings.upiId || '',
          backupFrequency: res.data.settings.backupFrequency || 'weekly',
          backupEmail: res.data.settings.backupEmail || '',
          supportPhone: res.data.settings.supportPhone || ''
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
    setSaving(true);
    
    const data = {
      companyName: formData.companyName,
      upiId: formData.upiId,
      backupFrequency: formData.backupFrequency,
      backupEmail: formData.backupEmail,
      supportPhone: formData.supportPhone
    };

    try {
      const res = await api.put(endpoints.settings.base, data);
      if (res.data.success) {
        showToast('Configuration settings updated successfully', 'success');
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      showToast('Failed to update configuration settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const triggerManualBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post(endpoints.settings.backup);
      if (res.data.success) {
        showToast(`Database backup saved successfully! Path: ${res.data.filePath}`, 'success');
      }
    } catch (err) {
      showToast('Failed to trigger database backup', 'error');
    } finally {
      setBackupLoading(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Global Config Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure branding, UPI payment targets, support lines and database backup triggers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            {/* Branding details */}
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary-500" />
                Company Profile & Branding
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-100 dark:border-slate-850 pb-4">
                <div className="flex-1 w-full space-y-4">
                  <Input
                    label="Business Name"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Apex Machinery & Hardware"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Target merchant UPI ID"
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="merchant@okaxis"
                  required
                />
                <Input
                  label="Support Contact Phone"
                  type="text"
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                  placeholder="+91 99887 76655"
                />
              </div>
            </Card>

            {/* Backups Configuration */}
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-2">
                <Database className="h-4 w-4 text-primary-500" />
                Automatic System Backups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Scheduled Backup Frequency"
                  value={formData.backupFrequency}
                  onChange={(e) => setFormData({ ...formData, backupFrequency: e.target.value })}
                  options={[
                    { value: 'daily', label: 'Daily Backup' },
                    { value: 'weekly', label: 'Weekly Backup' },
                    { value: 'monthly', label: 'Monthly Backup' }
                  ]}
                />
                <Input
                  label="Target Email for Backup ZIPs"
                  type="email"
                  value={formData.backupEmail}
                  onChange={(e) => setFormData({ ...formData, backupEmail: e.target.value })}
                  placeholder="backups@company.com"
                />
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" loading={saving} className="flex gap-2 text-xs font-semibold py-2 px-6">
                <Save className="h-4 w-4" />
                Save Global Settings
              </Button>
            </div>
          </form>
        </div>

        {/* Database Utility Sidecard */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              Database Operations
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Manually trigger an instant JSON dump backup of all collections. Dumps are stored in the server filesystem.
            </p>

            <div className="pt-2">
              <Button
                onClick={triggerManualBackup}
                loading={backupLoading}
                variant="outline"
                className="w-full text-xs font-semibold py-2.5 flex gap-1.5 border-slate-300 dark:border-slate-805"
              >
                <Database className="h-4 w-4" />
                Run Database Backup
              </Button>
            </div>

            <div className="flex gap-2 items-start border-t border-slate-100 dark:border-slate-800 pt-4 text-[10px] text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-500 dark:text-slate-350 block">Frequency schedule active</strong>
                Weekly automated cron jobs dump collections and log history events safely.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
