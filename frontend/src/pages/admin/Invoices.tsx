import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import {
  Search,
  FilePlus,
  Trash2,
  Edit2,
  Printer,
  Plus,
  Minus,
  Mail,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
  CheckCircle,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { generateInvoicePdf } from '../../utils/pdfGenerator';
import { numberToWords } from '../../utils/numberToWords';

// Always load the logo fresh from public folder (no module cache)
const LOGO_URL = `/invoice-logo.png?v=${Date.now()}`;


// Admin name display helper
const formatAdminName = (adminObj: any): string => {
  if (!adminObj) return 'Unknown';
  if (typeof adminObj === 'string') {
    if (adminObj.toLowerCase().includes('srivatsan')) return 'Akash';
    return adminObj;
  }
  const role = adminObj.role;
  if (role === 'ADMIN_1') return 'Akash';
  if (role === 'ADMIN_2') return 'Hrithik';
  
  const name = adminObj.displayName || adminObj.username || '';
  if (name.toLowerCase().includes('srivatsan')) return 'Akash';
  return name || (role === 'ADMIN_1' ? 'Akash' : 'Hrithik');
};

export const Invoices: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal triggers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form states (Create)
  const [selectedCustId, setSelectedCustId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transportMode, setTransportMode] = useState('Road');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [discount, setDiscount] = useState<number | string>(0);
  const [cgst, setCgst] = useState<number | string>(9); // Support empty
  const [sgst, setSgst] = useState<number | string>(9); // Support empty
  const [productsList, setProductsList] = useState<{ category: string; productName: string; productColor: string; weightValue: string; weightUnit: string; quantity: string; price: string }[]>([
    { category: '', productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }
  ]);

  // Form states (Edit)
  const [editForm, setEditForm] = useState({
    discount: 0,
    cgst: 9,
    sgst: 9,
    paidAmount: 0
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

  // Load Invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.invoices.base, {
        params: {
          page,
          search,
          dateFilter,
          startDate,
          endDate,
          limit: 10
        }
      });
      if (res.data.success) {
        setInvoices(res.data.invoices);
        setTotalPages(res.data.pages || 1);
        setTotalItems(res.data.total || 0);
      }
    } catch (err) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Customers list for selector
  const fetchAllCustomers = async () => {
    try {
      const res = await api.get(endpoints.customers.base, { params: { limit: 1000 } });
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load categories for dropdown
  const fetchCategories = async () => {
    try {
      const res = await api.get(endpoints.categories.base);
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, dateFilter, search, startDate, endDate]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchInvoices();
      fetchCategories(); // Refresh categories if admin changes them
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket, page, dateFilter, search, startDate, endDate]);

  useEffect(() => {
    fetchAllCustomers();
    fetchCategories();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  // Products List functions
  const addProductRow = () => {
    setProductsList([...productsList, { category: '', productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }]);
  };

  const removeProductRow = (idx: number) => {
    if (productsList.length === 1) return;
    setProductsList(productsList.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx: number, field: string, value: string) => {
    const updated = [...productsList];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'category') {
      updated[idx].productName = '';   // Reset item when category changes
      updated[idx].productColor = '';  // Reset color when category changes
      // Auto-set unit from first item of new category (if available)
      const cat = categories.find((c: any) => c.name === value);
      updated[idx].weightUnit = (cat?.items?.[0]?.unit) || 'grams';
    }
    if (field === 'productName') {
      updated[idx].productColor = ''; // Reset color when product changes
      // Auto-set unit from selected item
      const cat = categories.find((c: any) => c.name === updated[idx].category);
      const item = cat?.items?.find((i: any) => i.name === value);
      if (item?.unit) updated[idx].weightUnit = item.unit;
    }
    setProductsList(updated);
  };

  // Helper: get colors for the selected item
  const getItemColors = (categoryName: string, itemName: string): string[] => {
    const cat = categories.find((c: any) => c.name === categoryName);
    if (!cat) return [];
    const item = cat.items?.find((i: any) => i.name === itemName);
    return item?.colors || [];
  };

  // Helper: get items for a category
  const getCategoryItems = (categoryName: string): any[] => {
    const cat = categories.find((c: any) => c.name === categoryName);
    return cat?.items || [];
  };

  // Running calculations
  const calculateTotal = () => {
    let subtotal = 0;
    productsList.forEach(p => {
      subtotal += (parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0);
    });
    const discountVal = parseFloat(discount as string) || 0;
    const cgstVal = parseFloat(cgst as string) || 0;
    const sgstVal = parseFloat(sgst as string) || 0;

    const afterDiscount = Math.max(0, subtotal - discountVal);
    const gstRate = cgstVal + sgstVal;
    const gstValue = afterDiscount * (gstRate / 100);
    const grand = afterDiscount + gstValue;
    return { subtotal, grand, discountVal, cgstVal, sgstVal };
  };

  const openCreateModal = () => {
    const firstCust = customers[0];
    setSelectedCustId(firstCust?._id || '');
    setDeliveryAddress(firstCust?.address || '');
    setVehicleNumber('');
    setTransportMode('Road');
    setDiscount(0);
    setCgst(9);
    setSgst(9);
    setProductsList([{ category: '', productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }]);
    setQrCodeFile(null);
    setIsCreateOpen(true);
  };

  // Submit Create Invoice
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId) {
      showToast('Please Select a customer', 'error');
      return;
    }

    // Check if empty rows exist (color is optional)
    const emptyRow = productsList.some(p => {
      if (!p.category || !p.productName || !p.quantity || !p.weightValue || !p.price) return true;
      return false;
    });
    if (emptyRow) {
      showToast('Fill in all product fields completely', 'error');
      return;
    }

    // Check if vehicle number format is valid (optional field, but if entered must match format)
    if (vehicleNumber.trim()) {
      const vehicleRegex = /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/;
      if (!vehicleRegex.test(vehicleNumber.trim().toUpperCase())) {
        showToast('Enter a valid vehicle number in the format LL 00 L 0000 or LL 00 LL 0000.', 'error');
        return;
      }
    }

    setActionLoading(true);
    try {
      const mappedProducts = productsList.map(p => ({
        name: p.productColor
          ? `${p.productName} (${p.productColor}) - ${p.weightValue} ${p.weightUnit}`
          : `${p.productName} - ${p.weightValue} ${p.weightUnit}`,
        quantity: parseInt(p.quantity) || 0,
        price: parseFloat(p.price) || 0
      }));

      const { cgstVal, sgstVal, discountVal } = calculateTotal();

      const formData = new FormData();
      formData.append('customerId', selectedCustId);
      formData.append('deliveryAddress', deliveryAddress.trim());
      formData.append('shippedAddress', deliveryAddress.trim());
      formData.append('vehicleNumber', vehicleNumber.trim().toUpperCase());
      formData.append('transportMode', transportMode.trim() || 'Road');
      formData.append('products', JSON.stringify(mappedProducts));
      formData.append('discount', discountVal.toString());
      formData.append('gst', (cgstVal + sgstVal).toString());
      if (qrCodeFile) {
        formData.append('qrCodeImage', qrCodeFile);
      }

      const res = await api.post(endpoints.invoices.base, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Invoice generated successfully', 'success');
        setIsCreateOpen(false);
        fetchInvoices();
      }
    } catch (err: any) {
      showToast('Failed to create invoice', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setEditForm({
      discount: invoice.discount,
      cgst: (invoice.gst || 18) / 2,
      sgst: (invoice.gst || 18) / 2,
      paidAmount: invoice.paidAmount
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.put(endpoints.invoices.single(selectedInvoice._id), {
        discount: editForm.discount,
        gst: editForm.cgst + editForm.sgst,
        paidAmount: editForm.paidAmount
      });
      if (res.data.success) {
        showToast('Invoice updated successfully', 'success');
        setIsEditOpen(false);
        fetchInvoices();
      }
    } catch (err: any) {
      showToast('Failed to update invoice', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (invoice: any) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This will also delete corresponding sales history.`)) return;

    try {
      const res = await api.delete(endpoints.invoices.single(invoice._id));
      if (res.data.success) {
        showToast('Invoice deleted', 'success');
        fetchInvoices();
      }
    } catch (err: any) {
      showToast('Failed to delete invoice', 'error');
    }
  };

  const handleDownloadInvoice = async (invoice: any) => {
    setDownloadingInvoice(invoice._id);
    try {
      const settingsRes = await api.get('/settings');
      const settings = settingsRes.data.settings || {};
      const doc = await generateInvoicePdf(invoice, settings);
      doc.save(`invoice_${invoice.invoiceNumber}.pdf`);
      showToast(`Invoice ${invoice.invoiceNumber} downloaded successfully`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to download invoice', 'error');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleMarkPaid = async (invoice: any) => {
    if (!window.confirm(`Mark invoice ${invoice.invoiceNumber} as fully paid and email customer?`)) return;

    setIsMarkingPaid(invoice._id);
    try {
      let settings = {};
      try {
        const settingsRes = await api.get('/settings');
        settings = settingsRes.data.settings || {};
      } catch (e) {
        console.warn('Settings fetch warning:', e);
      }

      let base64Pdf = '';
      try {
        const doc = await generateInvoicePdf(invoice, settings);
        base64Pdf = doc.output('datauristring');
      } catch (pdfErr) {
        console.error('PDF Generation warning:', pdfErr);
      }

      const res = await api.put(endpoints.invoices.markPaid(invoice._id), {
        invoicePdf: base64Pdf
      });

      if (res.data.success) {
        showToast(`Invoice ${invoice.invoiceNumber} marked as paid`, 'success');
        fetchInvoices();
      }
    } catch (err: any) {
      console.error('Mark paid error:', err);
      const msg = err?.response?.data?.message || 'Failed to mark invoice as paid';
      showToast(msg, 'error');
    } finally {
      setIsMarkingPaid(null);
    }
  };

  const openViewModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Invoice Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Create invoices, track customer payment statuses, and print billing records.
          </p>
        </div>
        <Button onClick={openCreateModal} variant="primary" className="flex gap-2 text-xs font-bold py-2.5 px-4 shadow-lg shadow-primary-600/30">
          <FilePlus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Filters */}
      <Card className="py-4 px-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2 space-y-1">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Search</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice # or customer name..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>



          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date Period</span>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="">Any Time</option>
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="secondary" className="w-full text-xs py-2">
              Apply Filters
            </Button>
          </div>
        </form>

        {dateFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button onClick={fetchInvoices} variant="outline" className="h-fit self-end text-xs py-2">
              Apply Range
            </Button>
          </div>
        )}
      </Card>

      {/* Invoices List */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <Card className="p-0 overflow-hidden" scrollable>
          <Table headers={['Invoice No', 'Customer ID & Name', 'Issue Date', 'Total', 'Paid', 'Due Balance', 'Created By', 'Approved By', 'Actions']} minWidth="min-w-[1050px]">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-xs text-slate-400">
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    <div>{inv.customer?.name}</div>
                    <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-300 mt-0.5">{inv.customer?.customerId}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                    ₹{inv.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    ₹{inv.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    ₹{inv.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {inv.createdBy ? formatAdminName(inv.createdBy) : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {inv.approvedBy ? formatAdminName(inv.approvedBy) : (inv.remainingAmount === 0 ? 'Not Recorded' : 'Pending')}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {inv.remainingAmount > 0 && (
                        <button
                          onClick={() => handleMarkPaid(inv)}
                          disabled={isMarkingPaid === inv._id}
                          className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors disabled:opacity-50"
                          title="Mark as Paid & Email Customer"
                        >
                          {isMarkingPaid === inv._id ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        disabled={downloadingInvoice === inv._id}
                        className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors disabled:opacity-50"
                        title="Download Invoice PDF"
                      >
                        {downloadingInvoice === inv._id ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openViewModal(inv)}
                        className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Preview & Print"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(inv)}
                        className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Update Dues"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Delete Invoice"
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
                Showing {invoices.length} of {totalItems} invoices
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
                <span className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
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

      {/* CREATE INVOICE MODAL (WITH PRODUCTS BUILDER) */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Generate New Invoice" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Billing Customer
            </label>
            <select
              value={selectedCustId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCustId(newId);
                const cust = customers.find(c => c._id === newId);
                if (cust) {
                  setDeliveryAddress(cust.address || '');
                }
              }}
              className="w-full px-4 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              required
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.customerId})
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Address & Vehicle Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Delivery Address"
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter delivery address"
            />
            <Input
              label="Vehicle Number"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            />
          </div>

          {/* Products Builder Section */}
          <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Products & Scope Items</span>
              <Button type="button" variant="outline" size="sm" onClick={addProductRow} className="py-1 px-2.5 flex gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {productsList.map((prod, idx) => (
                <div key={idx} className="flex flex-col border-b border-dashed border-slate-200 dark:border-slate-700 pb-4 last:border-0 last:pb-0 gap-3">
                  {/* Row 1: Category + Item Name + Item Color (conditional) */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start">

                    {/* Category Selector */}
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Category
                      </label>
                      <select
                        value={prod.category}
                        onChange={(e) => handleProductChange(idx, 'category', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                        required
                      >
                        <option value="" disabled>Select Category</option>
                        {categories.map((cat: any) => (
                          <option key={cat._id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Item Name — depends on selected category */}
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Item Name
                      </label>
                      <select
                        value={prod.productName}
                        onChange={(e) => handleProductChange(idx, 'productName', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none disabled:opacity-50"
                        required
                        disabled={!prod.category}
                      >
                        <option value="" disabled>Select Item</option>
                        {getCategoryItems(prod.category).map((item: any) => (
                          <option key={item._id} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Item Color — only shown when the selected item has colors configured */}
                    {getItemColors(prod.category, prod.productName).length > 0 && (
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Item Color
                        </label>
                        <select
                          value={prod.productColor}
                          onChange={(e) => handleProductChange(idx, 'productColor', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none disabled:opacity-50"
                          disabled={!prod.productName}
                        >
                          <option value="">Select Color (optional)</option>
                          {getItemColors(prod.category, prod.productName).map((color: string) => (
                            <option key={color} value={color}>{color}</option>
                          ))}
                        </select>
                      </div>
                    )}

                  </div>

                  {/* Bottom row: Packets Number, Quantity Per Packet, Price, Remove */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="w-full sm:w-28">
                      <Input
                        label="Packets Number"
                        type="number"
                        value={prod.quantity}
                        onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                        min="1"
                        required
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex flex-col space-y-1.5 w-full">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          quantity per packet
                        </label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all bg-white dark:bg-slate-900 h-10">
                          <input
                            type="number"
                            value={prod.weightValue}
                            onChange={(e) => handleProductChange(idx, 'weightValue', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-transparent border-0 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-0"
                            style={{ MozAppearance: 'textfield', appearance: 'textfield', WebkitAppearance: 'none' } as React.CSSProperties}
                            min="1"
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            required
                          />
                          <select
                            value={prod.weightUnit}
                            onChange={(e) => handleProductChange(idx, 'weightUnit', e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                          >
                            <option value="grams">grams</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="liter">liter</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-32">
                      <Input
                        label="Price"
                        type="number"
                        value={prod.price}
                        onChange={(e) => handleProductChange(idx, 'price', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProductRow(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg mb-0.5 disabled:opacity-30"
                      disabled={productsList.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Taxes & Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Flat Discount (₹)"
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => {
                const val = e.target.value;
                setDiscount(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
              }}
            />
            <Input
              label="CGST (%)"
              type="number"
              step="0.01"
              value={cgst}
              onChange={(e) => {
                const val = e.target.value;
                setCgst(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
              }}
            />
            <Input
              label="SGST (%)"
              type="number"
              step="0.01"
              value={sgst}
              onChange={(e) => {
                const val = e.target.value;
                setSgst(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Upload QR Code (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setQrCodeFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="text-[10px] text-slate-400 mt-1">If uploaded, this image will be shown to the customer for payment scanning.</p>
          </div>

          {/* Running Totals display */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col items-end text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-slate-500">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">₹{calculateTotal().subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>Discount deduction:</span>
              <span className="font-semibold text-red-500">-₹{calculateTotal().discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>CGST ({calculateTotal().cgstVal}%):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                ₹{(Math.max(0, calculateTotal().subtotal - calculateTotal().discountVal) * (calculateTotal().cgstVal / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>SGST ({calculateTotal().sgstVal}%):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                ₹{(Math.max(0, calculateTotal().subtotal - calculateTotal().discountVal) * (calculateTotal().sgstVal / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between w-64 text-sm font-bold border-t border-slate-100 dark:border-slate-800 pt-2 text-slate-800 dark:text-slate-100">
              <span>Grand Final Amount:</span>
              <span className="text-primary-650 dark:text-primary-400">₹{calculateTotal().grand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Generate & Issue
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT INVOICE MODAL (FOR ADJUSTMENTS) */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Adjust Invoice Dues: ${selectedInvoice?.invoiceNumber}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Flat Discount (₹)"
              type="number"
              step="0.01"
              value={editForm.discount}
              onChange={(e) => setEditForm({ ...editForm, discount: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) } as any)}
            />
            <Input
              label="CGST (%)"
              type="number"
              step="0.01"
              value={editForm.cgst}
              onChange={(e) => setEditForm({ ...editForm, cgst: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) } as any)}
            />
            <Input
              label="SGST (%)"
              type="number"
              step="0.01"
              value={editForm.sgst}
              onChange={(e) => setEditForm({ ...editForm, sgst: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) } as any)}
            />
          </div>
          <Input
            label="Total Amount Already Paid (₹)"
            type="number"
            value={editForm.paidAmount}
            onChange={(e) => setEditForm({ ...editForm, paidAmount: parseFloat(e.target.value) || 0 })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Save Adjustments
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAILED PRINTABLE PREVIEW MODAL MATCHING REFERENCE TAX INVOICE */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Tax Invoice Preview & Print" size="xl">
        {selectedInvoice && (
          <div className="space-y-6 print-card bg-white text-slate-900 p-6 rounded-2xl border border-slate-200">
            {/* Printable Container */}
            <div id="printable-tax-invoice" className="space-y-4 text-slate-900 bg-white">

              {/* Header: Logo & Title */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src={LOGO_URL} alt="Green Glide Logistics" className="h-44 sm:h-52 w-auto object-contain drop-shadow-md" />
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-[#002D62] tracking-wider uppercase">TAX INVOICE</h2>

                  {/* Meta Table Box */}
                  <div className="mt-2 border border-slate-300 text-xs rounded overflow-hidden w-64 ml-auto">
                    <div className="flex justify-between border-b border-slate-200 px-3 py-1 bg-slate-50">
                      <span className="text-slate-600 font-medium">Invoice No. :</span>
                      <span className="font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 px-3 py-1">
                      <span className="text-slate-600 font-medium">Invoice Date :</span>
                      <span className="font-bold text-slate-900">{new Date(selectedInvoice.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 px-3 py-1 bg-slate-50">
                      <span className="text-slate-600 font-medium">Due Date :</span>
                      <span className="font-bold text-slate-900">
                        {new Date(new Date(selectedInvoice.createdAt).setDate(new Date(selectedInvoice.createdAt).getDate() + 30)).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-1">
                      <span className="text-slate-600 font-medium">Delivery Address :</span>
                      <span className="font-bold text-slate-900 truncate max-w-[150px]">{selectedInvoice.deliveryAddress || selectedInvoice.shippedAddress || selectedInvoice.customer?.address || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address / Contact Strip */}
              <div className="text-center text-[11px] text-slate-600 border-b border-slate-300 pb-2">
                📍 45 Sundaram Street, R. S. Puram, Coimbatore 641001 &nbsp;|&nbsp; 📞 +91 98765 43210 &nbsp;|&nbsp; ✉️ greenglidelogistics@gmail.com
              </div>

              {/* BILL TO / TRANSPORT CARDS (SHIP TO REMOVED) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                {/* BILL TO */}
                <div className="md:col-span-8 border border-slate-300 rounded overflow-hidden bg-white">
                  <div className="bg-[#002D62] text-white font-bold px-3 py-1.5 flex items-center gap-1.5 uppercase text-[11px]">
                    👤 BILL TO
                  </div>
                  <div className="p-2.5 space-y-1">
                    <div className="font-bold text-sm text-slate-900">{selectedInvoice.customer?.name || 'Customer'}</div>
                    <div className="text-slate-600">{selectedInvoice.customer?.address || 'Coimbatore, Tamil Nadu 641001, India'}</div>
                    <div className="text-slate-600">Phone: {selectedInvoice.customer?.phone || '+91 90000 00000'}</div>
                  </div>
                </div>

                {/* TRANSPORT INFO */}
                <div className="md:col-span-4 border border-slate-300 rounded overflow-hidden bg-white p-3 space-y-2 flex flex-col justify-center">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">📄 Transport Mode :</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.transportMode || 'Road'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">📅 Vehicle No. :</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.vehicleNumber || selectedInvoice.vehicleNo || '-'}</span>
                  </div>
                </div>
              </div>

              {/* PRODUCTS TABLE */}
              <div className="border border-slate-300 rounded overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#002D62] text-white font-bold uppercase text-[11px]">
                      <th className="p-2 text-center border-r border-blue-900 w-8">#</th>
                      <th className="p-2 border-r border-blue-900">Description of Goods</th>
                      <th className="p-2 text-center border-r border-blue-900 w-20">HSN / SAC</th>
                      <th className="p-2 text-right border-r border-blue-900 w-20">Quantity</th>
                      <th className="p-2 text-right border-r border-blue-900 w-24">Unit Price (₹)</th>
                      <th className="p-2 text-right border-r border-blue-900 w-24">Discount (₹)</th>
                      <th className="p-2 text-center border-r border-blue-900 w-20">GST (%)</th>
                      <th className="p-2 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedInvoice.products.map((p: any, i: number) => {
                      const lineTotal = p.price * p.quantity;
                      const discPerItem = (selectedInvoice.discount || 0) / (selectedInvoice.products.length || 1);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center border-r border-slate-200 font-medium">{i + 1}</td>
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{p.name}</td>
                          <td className="p-2.5 text-center border-r border-slate-200 font-medium">{p.hsn || '0603'}</td>
                          <td className="p-2.5 text-right border-r border-slate-200 font-medium">{p.quantity.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right border-r border-slate-200 font-medium">{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-2.5 text-right border-r border-slate-200 font-medium">{discPerItem > 0 ? discPerItem.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                          <td className="p-2.5 text-center border-r border-slate-200 font-medium">{selectedInvoice.gst || 0}%</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM SUMMARY SECTION */}
              <div className="grid grid-cols-12 gap-3 text-xs pt-2">
                {/* Left Column: Words & Terms */}
                <div className="col-span-7 space-y-3">
                  {/* Amount in Words */}
                  <div className="border border-slate-300 rounded p-2.5 bg-slate-50/50">
                    <div className="font-bold text-[#002D62] text-[11px] uppercase mb-1 flex items-center gap-1">
                      💸 Amount in Words
                    </div>
                    <div className="font-semibold text-slate-900 text-[11px]">
                      {numberToWords(selectedInvoice.finalAmount)}
                    </div>
                  </div>

                  {/* Notes / Terms & Conditions */}
                  <div className="border border-slate-300 rounded p-2.5 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-[#002D62] text-[11px] uppercase flex items-center gap-1">
                      📋 Notes / Terms &amp; Conditions
                    </div>
                    <ol className="list-decimal list-inside text-slate-600 text-[10.5px] space-y-0.5 pl-1">
                      <li>Goods once sold will not be taken back.</li>
                      <li>Please make payment within the due date.</li>
                      <li>Subject to Coimbatore Jurisdiction.</li>
                    </ol>
                  </div>

                  {/* Admin Audit Information (Admin Only) */}
                  <div className="border border-indigo-200 rounded p-2.5 bg-indigo-50/40 space-y-1.5 no-print">
                    <div className="font-bold text-[#002D62] text-[11px] uppercase flex items-center justify-between border-b border-indigo-200 pb-1">
                      <span>🛡️ Admin Record Audit</span>
                      <span className="text-[9.5px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">Admin Only</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="font-bold text-slate-600">Created By:</span>
                      <span className="font-bold text-indigo-700">
                        {selectedInvoice.createdBy ? formatAdminName(selectedInvoice.createdBy) : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] border-t border-indigo-100 pt-1">
                      <span className="font-bold text-slate-600">Approved By:</span>
                      <span className="font-bold text-emerald-700">
                        {selectedInvoice.approvedBy ? formatAdminName(selectedInvoice.approvedBy) : (selectedInvoice.remainingAmount === 0 ? 'Not Recorded' : 'Pending')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Totals Table */}
                <div className="col-span-5 border border-slate-300 rounded overflow-hidden bg-white">
                  {(() => {
                    let sub = 0;
                    selectedInvoice.products.forEach((p: any) => sub += p.price * p.quantity);
                    const afterDis = Math.max(0, sub - selectedInvoice.discount);
                    const tax = afterDis * (selectedInvoice.gst / 100);
                    const cgstAmt = tax / 2;
                    const sgstAmt = tax / 2;
                    return (
                      <div className="divide-y divide-slate-200">
                        <div className="flex justify-between p-2">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-bold text-slate-900">₹ {sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {selectedInvoice.discount > 0 && (
                          <div className="flex justify-between p-2 bg-red-50/50">
                            <span className="text-slate-600">Discount</span>
                            <span className="font-bold text-red-600">- ₹ {selectedInvoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between p-2">
                          <span className="text-slate-600">CGST ({selectedInvoice.gst / 2}%)</span>
                          <span className="font-bold text-slate-900">₹ {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between p-2">
                          <span className="text-slate-600">SGST ({selectedInvoice.gst / 2}%)</span>
                          <span className="font-bold text-slate-900">₹ {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between p-2.5 bg-emerald-100 text-[#002D62] font-black text-sm">
                          <span>Grand Total</span>
                          <span>₹ {selectedInvoice.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* FOOTER & SYSTEM-GENERATED NOTICE (SIGNATURE REMOVED) */}
              <div className="pt-4 border-t-2 border-emerald-600 mt-4 flex justify-between items-end">
                <div className="text-left">
                  <div className="text-sm font-bold text-[#002D62]">Thank You For Your Business!</div>
                  <div className="text-[10px] text-slate-500">We appreciate your trust and look forward to serving you again.</div>
                </div>
                <div className="text-right flex flex-col items-end space-y-1">
                  <div className="font-bold text-[#002D62] text-xs">For Green Glide Logistics</div>
                  <div className="text-[11px] text-slate-600 mt-1">This is a system-generated document. No signature is required</div>
                </div>
              </div>

            </div>

            {/* Actions (Close / Download / Print) */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 no-print">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close Preview
              </Button>
              <Button
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="flex gap-2 bg-[#002D62] text-white"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={() => window.print()} className="flex gap-2">
                <Printer className="h-4 w-4" />
                Print Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Invoices;
