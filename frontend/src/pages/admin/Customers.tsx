import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  UserCheck, 
  UserX, 
  Eye, 
  Lock, 
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Plus,
  Minus
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export const Customers: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);
  const [qiDiscount, setQiDiscount] = useState<number>(0);
  const [qiCgst, setQiCgst] = useState<number>(9);
  const [qiSgst, setQiSgst] = useState<number>(9);
  const [qiProducts, setQiProducts] = useState<{ weightValue: number; weightUnit: string; quantity: number; price: number }[]>([
    { weightValue: 100, weightUnit: 'grams', quantity: 1, price: 0 }
  ]);

  // Selected customer data
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerMetrics, setCustomerMetrics] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstNumber: '',
    password: ''
  });

  const [newPasswordData, setNewPasswordData] = useState({
    password: '',
    forceReset: true
  });

  const [formErrors, setFormErrors] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.customers.base, {
        params: {
          page,
          search,
          status: statusFilter,
          limit: 10
        }
      });
      if (res.data.success) {
        setCustomers(res.data.customers);
        setTotalPages(res.data.pages);
        setTotalItems(res.data.total);
      }
    } catch (error) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    const handleDataUpdated = () => {
      fetchCustomers();
    };

    socket.on('DATA_UPDATED', handleDataUpdated);

    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket, page, statusFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Open Create Customer
  const openCreateModal = () => {
    setFormData({ name: '', email: '', phone: '', address: '', gstNumber: '', password: '' });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  // Open Edit Customer
  const openEditModal = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      gstNumber: customer.gstNumber || '',
      password: '' // empty for edit
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Open Customer Details (includes financial metrics)
  const openDetailModal = async (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerMetrics(null);
    setIsDetailModalOpen(true);
    
    try {
      const res = await api.get(endpoints.customers.single(customer._id));
      if (res.data.success) {
        setCustomerMetrics(res.data.metrics);
      }
    } catch (error) {
      showToast('Failed to load customer details metrics', 'error');
    }
  };

  // Open Reset Password
  const openPasswordModal = (customer: any) => {
    setSelectedCustomer(customer);
    setNewPasswordData({ password: '', forceReset: true });
    setIsPasswordModalOpen(true);
  };

  // Validate form
  const validateForm = (isEdit = false) => {
    const errors: any = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email format is invalid';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required';
    } else if (formData.phone.trim().length < 10) {
      errors.phone = 'Phone must be at least 10 digits';
    }
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!isEdit && !formData.password) {
      errors.password = 'Password is required';
    } else if (!isEdit && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Create Customer submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setActionLoading(true);
    try {
      const res = await api.post(endpoints.customers.base, formData);
      if (res.data.success) {
        showToast('Customer created successfully', 'success');
        setIsCreateModalOpen(false);
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create customer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Customer submit
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setActionLoading(true);
    try {
      const res = await api.put(endpoints.customers.single(selectedCustomer._id), formData);
      if (res.data.success) {
        showToast('Customer updated successfully', 'success');
        setIsEditModalOpen(false);
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update customer', 'error');
    } finally {
      setActionLoading(false);
    }
  };


  // Force Password Reset Submit
  const handleForceResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordData.password || newPasswordData.password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.put(endpoints.customers.resetPassword(selectedCustomer._id), {
        newPassword: newPasswordData.password,
        forceReset: newPasswordData.forceReset
      });
      if (res.data.success) {
        showToast(res.data.message || 'Password updated successfully', 'success');
        setIsPasswordModalOpen(false);
      }
    } catch (err: any) {
      showToast('Failed to reset customer password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Quick Invoice
  const openQuickInvoiceModal = (customer: any) => {
    setSelectedCustomer(customer);
    setQiDiscount(0);
    setQiCgst(9);
    setQiSgst(9);
    setQiProducts([{ weightValue: 100, weightUnit: 'grams', quantity: 1, price: 0 }]);
    setIsQuickInvoiceOpen(true);
  };

  // Product row helpers
  const addQiRow = () => setQiProducts(p => [...p, { weightValue: 100, weightUnit: 'grams', quantity: 1, price: 0 }]);
  const removeQiRow = (idx: number) => { if (qiProducts.length > 1) setQiProducts(p => p.filter((_, i) => i !== idx)); };
  const handleQiChange = (idx: number, field: string, value: any) => {
    const updated = [...qiProducts] as any;
    if (field === 'weightValue') updated[idx].weightValue = parseInt(value) || 0;
    if (field === 'weightUnit') updated[idx].weightUnit = value;
    if (field === 'quantity') updated[idx].quantity = parseInt(value) || 0;
    if (field === 'price') updated[idx].price = parseFloat(value) || 0;
    setQiProducts(updated);
  };

  // Running totals
  const calcQiTotals = () => {
    let subtotal = 0;
    qiProducts.forEach(p => { subtotal += p.price * p.quantity; });
    const afterDiscount = Math.max(0, subtotal - qiDiscount);
    const cgstAmt = afterDiscount * (qiCgst / 100);
    const sgstAmt = afterDiscount * (qiSgst / 100);
    const grand = afterDiscount + cgstAmt + sgstAmt;
    return { subtotal, afterDiscount, cgstAmt, sgstAmt, grand };
  };

  // Submit Quick Invoice
  const handleQuickInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empty = qiProducts.some(p => p.weightValue <= 0 || p.price <= 0 || p.quantity <= 0);
    if (empty) {
      showToast('Fill in all product rows with valid quantities and prices', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const mappedProducts = qiProducts.map(p => ({
        name: `${p.weightValue} ${p.weightUnit}`,
        quantity: p.quantity,
        price: p.price
      }));
      const res = await api.post(endpoints.invoices.base, {
        customerId: selectedCustomer._id,
        products: mappedProducts,
        discount: qiDiscount,
        gst: qiCgst + qiSgst
      });
      if (res.data.success) {
        showToast(`Invoice created successfully for ${selectedCustomer.name}`, 'success');
        setIsQuickInvoiceOpen(false);
        fetchCustomers();
      }
    } catch (err: any) {
      showToast('Failed to create invoice', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (customer: any) => {
    if (!window.confirm(`Are you absolutely sure you want to delete customer ${customer.name}? This will also delete completed records.`)) return;

    try {
      const res = await api.delete(endpoints.customers.single(customer._id));
      if (res.data.success) {
        showToast('Customer deleted successfully', 'success');
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete customer. Ensure no pending dues exist.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Customer Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register new clients, edit billing info, review balances or freeze accounts.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex gap-2 text-xs font-semibold py-2">
          <UserPlus className="h-4 w-4" />
          Create Customer
        </Button>
      </div>

      {/* Search & Status Filters */}
      <Card className="py-4 px-5">
        <form onSubmit={handleSearchSubmit} className="flex gap-4 items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, name, email, phone..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <Button type="submit" variant="secondary" className="px-5 text-xs py-2">
            Apply
          </Button>
        </form>
      </Card>

      {/* Customers Table */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table headers={['Customer ID', 'Client Name', 'Email & Phone', 'Actions']}>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-400">
                  No customers found matching the search criteria.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {c.customerId}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-[11px] text-slate-500">
                    <div>{c.email}</div>
                    <div className="mt-0.5 text-slate-400">{c.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(c)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openQuickInvoiceModal(c)}
                        className="p-1.5 text-slate-500 hover:text-primary-650 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Log Purchase Invoice"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Info"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openPasswordModal(c)}
                        className="p-1.5 text-slate-500 hover:text-amber-650 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-[11px] text-slate-400 font-medium">
                Showing {customers.length} of {totalItems} clients
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="py-1 px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  className="py-1 px-3"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* CREATE CUSTOMER MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Register New Customer">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Customer Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            placeholder="John Doe"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              placeholder="john@example.com"
              required
            />
            <Input
              label="Phone Number"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              placeholder="9876543210"
              required
            />
          </div>
          <Input
            label="Full Address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={formErrors.address}
            placeholder="Shop 5, Market Complex, Delhi"
            required
          />
          <Input
            label="Initial Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
            placeholder="Set secure password"
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT CUSTOMER MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modify Customer Details">
        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          <Input
            label="Customer Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              required
            />
            <Input
              label="Phone Number"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              required
            />
          </div>
          <Input
            label="Full Address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={formErrors.address}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Update Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* PASSWORD RESET MODAL */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={`Force Password Reset: ${selectedCustomer?.name}`}>
        <form onSubmit={handleForceResetPassword} className="space-y-4">
          <Input
            label="New Hashed Password"
            type="password"
            value={newPasswordData.password}
            onChange={(e) => setNewPasswordData({ ...newPasswordData, password: e.target.value })}
            placeholder="Min 8 characters"
            required
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 select-none">
            <input
              type="checkbox"
              checked={newPasswordData.forceReset}
              onChange={(e) => setNewPasswordData({ ...newPasswordData, forceReset: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Force customer to change password on their next log in.
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={actionLoading}>
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* CUSTOMER DETAIL VIEW MODAL */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Client Profile Details" size="lg">
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Top Identity bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 text-primary-600 font-extrabold text-2xl overflow-hidden flex-shrink-0">
                {selectedCustomer.profilePicture ? (
                  <img src={`http://${window.location.hostname}:5000${selectedCustomer.profilePicture}`} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  selectedCustomer.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {selectedCustomer.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Client ID: {selectedCustomer.customerId}
                </p>
              </div>
            </div>
            {/* Profile info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</span>
                <p className="font-semibold text-slate-750 dark:text-slate-350">{selectedCustomer.email}</p>
              </div>
              <div className="space-y-1 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</span>
                <p className="font-semibold text-slate-750 dark:text-slate-350">{selectedCustomer.phone}</p>
              </div>
              <div className="space-y-1 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg sm:col-span-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Full Address</span>
                <p className="font-semibold text-slate-750 dark:text-slate-350">{selectedCustomer.address}</p>
              </div>
            </div>

            {/* Financial Aggregate Metrics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Financial Summary
              </h4>
              {!customerMetrics ? (
                <div className="flex py-6 justify-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center space-y-1 bg-white dark:bg-slate-900/10">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Total Purchases</span>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-slate-150">
                      ₹{(customerMetrics.totalPurchased || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] text-slate-400">{customerMetrics.totalInvoices || 0} invoices</div>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center space-y-1 bg-white dark:bg-slate-900/10">
                    <span className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Settled Amount</span>
                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{(customerMetrics.totalPaid || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] text-slate-400">{customerMetrics.completedPaymentsCount || 0} bills paid</div>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center space-y-1 bg-white dark:bg-slate-900/10">
                    <span className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Due Balance</span>
                    <div className="text-sm font-extrabold text-rose-600 dark:text-rose-455">
                      ₹{(customerMetrics.remainingBalance || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] text-slate-400">{customerMetrics.pendingPaymentsCount || 0} unpaid bills</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE INVOICE MODAL — full product builder matching Invoices page */}
      <Modal isOpen={isQuickInvoiceOpen} onClose={() => setIsQuickInvoiceOpen(false)} title={`Generate New Invoice — ${selectedCustomer?.name}`} size="lg">
        <form onSubmit={handleQuickInvoiceSubmit} className="space-y-4">

          {/* Products & Scope Items */}
          <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Products &amp; Scope Items</span>
              <Button type="button" variant="outline" size="sm" onClick={addQiRow} className="py-1 px-2.5 flex gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {qiProducts.map((prod, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end border-b border-dashed border-slate-100 dark:border-slate-800 sm:border-0 pb-3 sm:pb-0">
                  {/* Packets Number */}
                  <div className="w-full sm:w-28">
                    <Input
                      label={idx === 0 ? 'Packets Number' : ''}
                      type="number"
                      value={prod.quantity || ''}
                      onChange={(e) => handleQiChange(idx, 'quantity', e.target.value)}
                      placeholder="e.g. 500"
                      min="1"
                      required
                    />
                  </div>

                  {/* Quantity Per Packet */}
                  <div className="flex-1 w-full">
                    <div className="flex flex-col space-y-1.5 w-full">
                      {idx === 0 && (
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Quantity Per Packet
                        </label>
                      )}
                      <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all bg-white dark:bg-slate-900 h-10">
                        <input
                          type="number"
                          value={prod.weightValue || ''}
                          onChange={(e) => handleQiChange(idx, 'weightValue', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-transparent border-0 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-0"
                          style={{ MozAppearance: 'textfield', appearance: 'textfield', WebkitAppearance: 'none' } as React.CSSProperties}
                          placeholder="e.g. 100"
                          min="1"
                          required
                        />
                        <select
                          value={prod.weightUnit}
                          onChange={(e) => handleQiChange(idx, 'weightUnit', e.target.value)}
                          className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-850 border-l border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        >
                          <option value="grams">grams</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="w-full sm:w-32">
                    <Input
                      label={idx === 0 ? 'Price' : ''}
                      type="number"
                      value={prod.price || ''}
                      onChange={(e) => handleQiChange(idx, 'price', e.target.value)}
                      placeholder="e.g. 10"
                      min="0"
                      required
                    />
                  </div>

                  {/* Remove Row */}
                  <button
                    type="button"
                    onClick={() => removeQiRow(idx)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg mb-0.5 disabled:opacity-30"
                    disabled={qiProducts.length === 1}
                    title="Remove row"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Discount & GST */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Flat Discount (₹)"
              type="number"
              value={qiDiscount}
              onChange={(e) => setQiDiscount(parseFloat(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="CGST (%)"
              type="number"
              value={qiCgst}
              onChange={(e) => setQiCgst(parseFloat(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="SGST (%)"
              type="number"
              value={qiSgst}
              onChange={(e) => setQiSgst(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>

          {/* Running Totals */}
          {(() => {
            const { subtotal, afterDiscount, cgstAmt, sgstAmt, grand } = calcQiTotals();
            return (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col items-end text-xs space-y-1.5">
                <div className="flex justify-between w-64 text-slate-500">
                  <span>Items Subtotal:</span>
                  <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {qiDiscount > 0 && (
                  <div className="flex justify-between w-64 text-red-500">
                    <span>Discount deduction:</span>
                    <span>-₹{qiDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-slate-500">
                  <span>CGST ({qiCgst}%):</span>
                  <span>₹{cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between w-64 text-slate-500">
                  <span>SGST ({qiSgst}%):</span>
                  <span>₹{sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between w-64 font-bold text-sm text-slate-800 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Final Amount:</span>
                  <span>₹{grand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })()}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsQuickInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Generate &amp; Issue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
