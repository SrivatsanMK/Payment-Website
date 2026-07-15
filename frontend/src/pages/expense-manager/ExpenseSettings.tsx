import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { 
  Save, 
  Building2, 
  Upload
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export const ExpenseSettings: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  // Form states
  const [formData, setFormData] = useState({
    companyName: ''
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get(endpoints.settings.base);
      if (res.data.success) {
        setSettings(res.data.settings);
        setFormData({
          companyName: res.data.settings.companyName || ''
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


  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const data = {
      companyName: formData.companyName
    };

    try {
      const res = await api.put(endpoints.settings.base, data);
      if (res.data.success) {
        showToast('Settings updated successfully', 'success');
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      showToast('Failed to update settings', 'error');
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Expense Manager Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure branding and preferences for your expense reports.
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Settings Form */}
        <form onSubmit={handleSettingsSubmit} className="space-y-6">
          {/* Branding details */}
          <Card className="space-y-4 p-6">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary-500" />
              Company Profile & Branding
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-6 items-center">

              <div className="flex-1 w-full">
                <Input
                  label="Business Name"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company Name"
                  required
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={saving} className="flex gap-2 text-xs font-semibold py-2 px-6">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseSettings;
