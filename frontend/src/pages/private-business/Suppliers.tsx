import React, { useEffect, useState, useCallback } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { endpoints } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { Plus, Edit2, Trash2, Truck, Phone, Mail, MapPin, Search } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    marketLocation: '',
    gstNumber: '',
    notes: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoints.privateBusiness.suppliers.base);
      if (res.data.success) {
        setSuppliers(res.data.suppliers || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      showToast('Failed to load suppliers list', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      marketLocation: '',
      gstNumber: '',
      notes: '',
      isActive: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: any) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      marketLocation: sup.marketLocation || '',
      gstNumber: sup.gstNumber || '',
      notes: sup.notes || '',
      isActive: sup.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingSupplier) {
        const res = await api.put(endpoints.privateBusiness.suppliers.single(editingSupplier._id), form);
        if (res.data.success) {
          showToast('Supplier updated successfully', 'success');
          setModalOpen(false);
          fetchSuppliers();
        }
      } else {
        const res = await api.post(endpoints.privateBusiness.suppliers.base, form);
        if (res.data.success) {
          showToast('Supplier added successfully', 'success');
          setModalOpen(false);
          fetchSuppliers();
        }
      }
    } catch (err: any) {
      console.error('Failed to save supplier:', err);
      showToast(err.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete/deactivate this supplier?')) return;
    try {
      const res = await api.delete(endpoints.privateBusiness.suppliers.single(id));
      if (res.data.success) {
        showToast(res.data.message || 'Supplier deleted/deactivated', 'success');
        fetchSuppliers();
      }
    } catch (err: any) {
      console.error('Failed to delete supplier:', err);
      showToast(err.response?.data?.message || 'Failed to delete supplier', 'error');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (s.marketLocation && s.marketLocation.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-500" /> Supplier & Dealer Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain vegetable dealers, market locations, contact details, and procurement statistics.
          </p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="flex gap-2 text-xs font-bold py-2 px-4 shadow-lg shadow-teal-600/30">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by supplier name, contact person, or market location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </Card>

      {/* Suppliers Table */}
      <Card className="p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl whitespace-nowrap">Supplier / Dealer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Contact Person</th>
                  <th className="py-3 px-4 whitespace-nowrap">Market / Location</th>
                  <th className="py-3 px-4 whitespace-nowrap">Phone / Email</th>
                  <th className="py-3 px-4 whitespace-nowrap">Purchases</th>
                  <th className="py-3 px-4 whitespace-nowrap">Total Amount</th>
                  <th className="py-3 px-4 rounded-r-xl text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No suppliers found. Click <strong>+ Add Supplier</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                        {s.gstNumber && <span className="text-[10px] text-slate-400 font-mono">GST: {s.gstNumber}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{s.contactPerson || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                          <MapPin className="h-3 w-3" /> {s.marketLocation || 'General Market'}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-y-0.5 whitespace-nowrap">
                        {s.phone && <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono"><Phone className="h-3 w-3 text-slate-400" /> {s.phone}</div>}
                        {s.email && <div className="flex items-center gap-1 text-slate-500 text-[10px]"><Mail className="h-3 w-3 text-slate-400" /> {s.email}</div>}
                        {!s.phone && !s.email && <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                        {s.totalPurchases || 0} bills ({s.totalKG || 0} KG)
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        ₹{(s.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s._id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 text-xs">
          <Input
            label="Supplier / Dealer Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
            <Input
              label="Contact Person"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <Input
              label="Mobile Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
            <Input
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Market / Location"
              value={form.marketLocation}
              onChange={(e) => setForm({ ...form, marketLocation: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
            <Input
              label="GST Number (Optional)"
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;
