import React, { useEffect, useState, useCallback } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { endpoints } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { Plus, Edit2, Trash2, ShoppingBag, Search } from 'lucide-react';

export const Vegetables: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [vegetables, setVegetables] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVeg, setEditingVeg] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'General',
    defaultUnit: 'KG',
    notes: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVegetables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoints.privateBusiness.vegetables.base);
      if (res.data.success) {
        setVegetables(res.data.vegetables || []);
      }
    } catch (err) {
      console.error('Failed to load vegetables:', err);
      showToast('Failed to load vegetables list', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => {
    fetchVegetables();
  }, [fetchVegetables]);

  const handleOpenAdd = () => {
    setEditingVeg(null);
    setForm({ name: '', category: 'General', defaultUnit: 'KG', notes: '', isActive: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (veg: any) => {
    setEditingVeg(veg);
    setForm({
      name: veg.name,
      category: veg.category || 'General',
      defaultUnit: veg.defaultUnit || 'KG',
      notes: veg.notes || '',
      isActive: veg.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Vegetable name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingVeg) {
        const res = await api.put(endpoints.privateBusiness.vegetables.single(editingVeg._id), form);
        if (res.data.success) {
          showToast('Vegetable updated successfully', 'success');
          setModalOpen(false);
          fetchVegetables();
        }
      } else {
        const res = await api.post(endpoints.privateBusiness.vegetables.base, form);
        if (res.data.success) {
          showToast('Vegetable added successfully', 'success');
          setModalOpen(false);
          fetchVegetables();
        }
      }
    } catch (err: any) {
      console.error('Failed to save vegetable:', err);
      showToast(err.response?.data?.message || 'Failed to save vegetable', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete/deactivate this vegetable?')) return;
    try {
      const res = await api.delete(endpoints.privateBusiness.vegetables.single(id));
      if (res.data.success) {
        showToast(res.data.message || 'Vegetable deleted/deactivated', 'success');
        fetchVegetables();
      }
    } catch (err: any) {
      console.error('Failed to delete vegetable:', err);
      showToast(err.response?.data?.message || 'Failed to delete vegetable', 'error');
    }
  };

  const filteredVegetables = vegetables.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-teal-500" /> Vegetable Master Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain master list of vegetables, default measurement units, and categories.
          </p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="flex gap-2 text-xs font-bold py-2 px-4 shadow-lg shadow-teal-600/30">
          <Plus className="h-4 w-4" /> Add Vegetable
        </Button>
      </div>

      {/* Search Filter */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vegetables by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </Card>

      {/* Vegetables List Table */}
      <Card className="p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl whitespace-nowrap">Vegetable Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Default Unit</th>
                  <th className="py-3 px-4 whitespace-nowrap">Notes</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 rounded-r-xl text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {filteredVegetables.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No vegetables found. Click <strong>+ Add Vegetable</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredVegetables.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{v.name}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {v.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{v.defaultUnit || 'KG'}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate whitespace-nowrap">{v.notes || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-400'}`}>
                          {v.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v._id)}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingVeg ? 'Edit Vegetable' : 'Add New Vegetable'}>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 text-xs">
          <Input
            label="Vegetable Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              { value: 'General', label: 'General' },
              { value: 'Leafy Vegetables', label: 'Leafy Vegetables' },
              { value: 'Root Vegetables', label: 'Root Vegetables' },
              { value: 'Fruit Vegetables', label: 'Fruit Vegetables' },
              { value: 'Bulbs', label: 'Bulbs' },
              { value: 'Other', label: 'Other' }
            ]}
          />

          <Select
            label="Default Unit"
            value={form.defaultUnit}
            onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
            options={[
              { value: 'KG', label: 'KG' },
              { value: 'Gram', label: 'Gram' },
              { value: 'Bag', label: 'Bag' },
              { value: 'Box', label: 'Box' },
              { value: 'Crate', label: 'Crate' }
            ]}
          />

          <Input
            label="Optional Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="vegActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="vegActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Active in Add Purchase form
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingVeg ? 'Update Vegetable' : 'Save Vegetable'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vegetables;
