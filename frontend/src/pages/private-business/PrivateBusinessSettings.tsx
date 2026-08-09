import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { endpoints } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Settings as SettingsIcon, Save, Building, User, Mail, Phone, MapPin } from 'lucide-react';

export const PrivateBusinessSettings: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: 'Private Business',
    ownerName: 'Owner',
    currency: 'INR',
    defaultUnit: 'KG',
    defaultPaymentMethod: 'Cash',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get(endpoints.privateBusiness.settings);
        if (res.data.success && res.data.settings) {
          setForm({
            businessName: res.data.settings.businessName || 'Private Business',
            ownerName: res.data.settings.ownerName || 'Owner',
            currency: res.data.settings.currency || 'INR',
            defaultUnit: res.data.settings.defaultUnit || 'KG',
            defaultPaymentMethod: res.data.settings.defaultPaymentMethod || 'Cash',
            address: res.data.settings.address || '',
            phone: res.data.settings.phone || '',
            email: res.data.settings.email || ''
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [api, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put(endpoints.privateBusiness.settings, form);
      if (res.data.success) {
        showToast('Workspace settings saved successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      showToast(err.response?.data?.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-teal-500" /> Private Business Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure workspace profile defaults, currency, measurement units, and owner contact details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
        <Card className="p-7 sm:p-8 space-y-7">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-4">
            <Building className="h-4.5 w-4.5 text-teal-500" /> Workspace Identity & Defaults
          </h3>

          <div className="pt-3 space-y-7">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Business Display Name"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                required
              />
              <Input
                label="Owner Name"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                required
              />
            </div>

            {/* Row 2 - Defaults */}
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 mb-2.5 pl-1">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    disabled
                    className="w-full px-4 py-3 text-sm font-bold rounded-xl border glass-input bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 mb-2.5 pl-1">Default Unit</label>
                  <select
                    value={form.defaultUnit}
                    onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium tracking-wide rounded-xl border glass-input text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="KG" className="bg-slate-900 text-white">KG</option>
                    <option value="Gram" className="bg-slate-900 text-white">Gram</option>
                    <option value="Bag" className="bg-slate-900 text-white">Bag</option>
                    <option value="Box" className="bg-slate-900 text-white">Box</option>
                    <option value="Crate" className="bg-slate-900 text-white">Crate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 mb-2.5 pl-1">Default Payment Method</label>
                  <select
                    value={form.defaultPaymentMethod}
                    onChange={(e) => setForm({ ...form, defaultPaymentMethod: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium tracking-wide rounded-xl border glass-input text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Cash" className="bg-slate-900 text-white">Cash</option>
                    <option value="UPI" className="bg-slate-900 text-white">UPI</option>
                    <option value="Bank Transfer" className="bg-slate-900 text-white">Bank Transfer</option>
                    <option value="Credit" className="bg-slate-900 text-white">Credit</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-7 sm:p-8 space-y-7">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-4">
            <User className="h-4.5 w-4.5 text-purple-500" /> Owner Contact Information
          </h3>

          <div className="pt-3 space-y-7">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Contact Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Contact Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Row 2 - Address */}
            <div className="pt-2">
              <Input
                label="Business Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving} className="flex gap-2 text-xs font-bold py-2.5 px-6 shadow-lg shadow-teal-600/30">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PrivateBusinessSettings;
