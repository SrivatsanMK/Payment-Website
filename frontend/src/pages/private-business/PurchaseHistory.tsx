import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { endpoints } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import {
  Search,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const PurchaseHistory: React.FC = () => {
  const api = useAxios();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filter Master Lists
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [vegetablesList, setVegetablesList] = useState<any[]>([]);

  // Filter State
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [vegetableFilter, setVegetableFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPurchases = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', '10');
      if (search.trim()) params.append('search', search.trim());
      if (supplierFilter) params.append('supplier', supplierFilter);
      if (vegetableFilter) params.append('vegetable', vegetableFilter);
      if (sortBy) params.append('sortBy', sortBy);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`${endpoints.privateBusiness.purchases.base}?${params.toString()}`);
      if (res.data.success) {
        setPurchases(res.data.purchases || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
      showToast('Failed to load purchase history', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, search, supplierFilter, vegetableFilter, sortBy, startDate, endDate, showToast]);

  useEffect(() => {
    fetchPurchases(1);
  }, [fetchPurchases]);

  // Load Filter Dropdowns
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [supRes, vegRes] = await Promise.all([
          api.get(endpoints.privateBusiness.suppliers.base),
          api.get(endpoints.privateBusiness.vegetables.base)
        ]);
        if (supRes.data.success) setSuppliersList(supRes.data.suppliers || []);
        if (vegRes.data.success) setVegetablesList(vegRes.data.vegetables || []);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    };
    loadFilters();
  }, [api]);

  // View Handler
  const handleView = (purchase: any) => {
    setSelectedPurchase(purchase);
    setViewModalOpen(true);
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      setActionLoading(true);
      const res = await api.delete(endpoints.privateBusiness.purchases.single(deletingId));
      if (res.data.success) {
        showToast('Purchase record deleted successfully', 'success');
        setDeleteModalOpen(false);
        setDeletingId(null);
        fetchPurchases(pagination.page);
      }
    } catch (err: any) {
      console.error('Failed to delete purchase:', err);
      showToast(err.response?.data?.message || 'Failed to delete purchase', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vegetable Purchase History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, view, filter, and track past vegetable procurement records.
          </p>
        </div>
        <Button
          onClick={() => navigate('/admin/private-business/purchases/add')}
          variant="primary"
          className="flex gap-2 text-xs font-bold py-2 px-4 shadow-lg shadow-teal-600/30"
        >
          <Plus className="h-4 w-4" /> Add New Purchase
        </Button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, supplier, vegetable, bill #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Supplier Filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Suppliers</option>
            {suppliersList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          {/* Vegetable Filter */}
          <select
            value={vegetableFilter}
            onChange={(e) => setVegetableFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Vegetables</option>
            {vegetablesList.map((v) => (
              <option key={v._id} value={v._id}>{v.name}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="amount_high">Sort: Highest Amount</option>
            <option value="amount_low">Sort: Lowest Amount</option>
          </select>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/10 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-500">Dates:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-[11px] rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-[11px] rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {(search || supplierFilter || vegetableFilter || startDate || endDate) && (
            <Button
              onClick={() => {
                setSearch('');
                setSupplierFilter('');
                setVegetableFilter('');
                setStartDate('');
                setEndDate('');
              }}
              variant="ghost"
              size="sm"
              className="text-[11px] text-red-500 py-1"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* ── PURCHASES TABLE ─────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-xs">
                <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl whitespace-nowrap">Purchase ID</th>
                    <th className="py-3 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3 px-4 whitespace-nowrap">Supplier</th>
                    <th className="py-3 px-4 whitespace-nowrap">Vegetables</th>
                    <th className="py-3 px-4 whitespace-nowrap">Grand Total</th>
                    <th className="py-3 px-4 rounded-r-xl text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No purchase records matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => {
                      const totalQty = (p.items || []).reduce((acc: number, i: any) => acc + i.quantity, 0);

                      return (
                        <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">{p.purchaseId}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {new Date(p.purchaseDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{p.supplierName}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <span className="font-bold">{p.items?.length || 0} items</span> ({totalQty} KG)
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            ₹{(p.grandTotal || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(p)}
                                title="View Details"
                                className="p-1.5 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingId(p._id);
                                  setDeleteModalOpen(true);
                                }}
                                title="Delete Purchase"
                                className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4 text-xs text-slate-500">
                <span>
                  Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} records)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => fetchPurchases(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    variant="outline"
                    size="sm"
                    className="p-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => fetchPurchases(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    variant="outline"
                    size="sm"
                    className="p-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── VIEW PURCHASE MODAL ─────────────────────────────────────────────── */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Purchase Details — ${selectedPurchase?.purchaseId || ''}`}
        size="lg"
      >
        {selectedPurchase && (
          <div className="space-y-6 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Purchase Date</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-GB')}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Supplier</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedPurchase.supplierName}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Bill Number</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedPurchase.billNumber || 'N/A'}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Vehicle Number</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedPurchase.vehicleNumber || 'N/A'}</div>
              </div>
            </div>

            {/* Item Table */}
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Vegetable Items</h4>
              <table className="w-full text-left border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Vegetable</th>
                    <th className="p-2.5">Quantity</th>
                    <th className="p-2.5">Rate / Unit</th>
                    <th className="p-2.5 text-right">Item Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(selectedPurchase.items || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{item.vegetableName}</td>
                      <td className="p-2.5">{item.quantity} {item.unit}</td>
                      <td className="p-2.5">₹{item.ratePerUnit} / {item.unit}</td>
                      <td className="p-2.5 text-right font-extrabold text-teal-600 dark:text-teal-400">
                        ₹{(item.itemTotal || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase">Grand Total Amount:</span>
              <span className="text-lg font-black text-teal-600 dark:text-teal-400">₹{(selectedPurchase.grandTotal || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Purchase Record"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this purchase record? This action cannot be undone and will update dashboard analytics.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={handleConfirmDelete}>
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseHistory;
