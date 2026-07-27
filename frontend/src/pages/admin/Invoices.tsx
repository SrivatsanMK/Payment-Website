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


const flowerOptions: Record<string, string[]> = {
  "Chrysanthemum": ["Yellow", "White", "Purple"],
  "Button Rose": ["vibrant red", "soft pink", "pure white", "sunny yellow", "cheerful orange"],
  "Lily": ["white", "yellow", "orange", "pink", "red", "purple"],
  "Marigold": ["yellow", "orange"]
};

export const Invoices: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
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
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [discount, setDiscount] = useState<number | string>(0);
  const [cgst, setCgst] = useState<number | string>(9); // Support empty
  const [sgst, setSgst] = useState<number | string>(9); // Support empty
  const [productsList, setProductsList] = useState<{ productName: string; productColor: string; weightValue: string; weightUnit: string; quantity: string; price: string }[]>([
    { productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }
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
        setTotalPages(res.data.pages);
        setTotalItems(res.data.total);
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
      const res = await api.get(endpoints.customers.base, { params: { limit: 100 } });
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, dateFilter]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchInvoices();
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket, page, dateFilter, search, startDate, endDate]);

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  // Products List functions
  const addProductRow = () => {
    setProductsList([...productsList, { productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }]);
  };

  const removeProductRow = (idx: number) => {
    if (productsList.length === 1) return;
    setProductsList(productsList.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx: number, field: string, value: string) => {
    const updated = [...productsList];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productName') {
      updated[idx].productColor = ''; // Reset color when product changes
    }
    setProductsList(updated);
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
    setSelectedCustId(customers[0]?._id || '');
    setDiscount(0);
    setCgst(9);
    setSgst(9);
    setProductsList([{ productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }]);
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

    // Check if empty rows exist
    const emptyRow = productsList.some(p => !p.productName || !p.productColor || !p.quantity || !p.weightValue || !p.price);
    if (emptyRow) {
      showToast('Fill in all product fields completely', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const mappedProducts = productsList.map(p => ({
        name: `${p.productName} (${p.productColor}) - ${p.weightValue} ${p.weightUnit}`,
        quantity: parseInt(p.quantity) || 0,
        price: parseFloat(p.price) || 0
      }));

      const { cgstVal, sgstVal, discountVal } = calculateTotal();

      const formData = new FormData();
      formData.append('customerId', selectedCustId);
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
        <Card className="p-0 overflow-hidden">
          <Table headers={['Invoice No', 'Customer ID & Name', 'Issue Date', 'Total', 'Paid', 'Due Balance', 'Actions']}>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-xs text-slate-400">
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
                    <div>{inv.customer?.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{inv.customer?.customerId}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-400 font-semibold">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-855 dark:text-slate-150">
                    ₹{inv.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-emerald-650 dark:text-emerald-400">
                    ₹{inv.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-rose-600 dark:text-rose-400">
                    ₹{inv.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {inv.remainingAmount > 0 && (
                        <button
                          onClick={() => handleMarkPaid(inv)}
                          disabled={isMarkingPaid === inv._id}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Mark as Paid & Email Customer"
                        >
                          {isMarkingPaid === inv._id ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        disabled={downloadingInvoice === inv._id}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Download Invoice PDF"
                      >
                        {downloadingInvoice === inv._id ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openViewModal(inv)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Preview & Print"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(inv)}
                        className="p-1.5 text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Update Dues"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-colors"
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

      {/* CREATE INVOICE MODAL (WITH PRODUCTS BUILDER) */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Generate New Invoice" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Billing Customer
            </label>
            <select
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
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
                  {/* Top row: Item Name, Color */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Item Name
                      </label>
                      <select
                        value={prod.productName}
                        onChange={(e) => handleProductChange(idx, 'productName', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                        required
                      >
                        <option value="" disabled>Select Item</option>
                        {Object.keys(flowerOptions).map(flower => (
                          <option key={flower} value={flower}>{flower}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Item Color
                      </label>
                      <select
                        value={prod.productColor}
                        onChange={(e) => handleProductChange(idx, 'productColor', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                        required
                        disabled={!prod.productName}
                      >
                        <option value="" disabled>Select Color</option>
                        {(flowerOptions[prod.productName] || []).map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bottom row: Packets Number, Quantity Per Packet, Price, Remove */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="w-full sm:w-28">
                      <Input
                        label="Packets Number"
                        type="number"
                        value={prod.quantity}
                        onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                        placeholder="e.g. 5"
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
                            placeholder="e.g. 100"
                            min="1"
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            required
                          />
                          <select
                            value={prod.weightUnit}
                            onChange={(e) => handleProductChange(idx, 'weightUnit', e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-850 border-l border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                          >
                            <option value="grams">grams</option>
                            <option value="kg">kg</option>
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
                        placeholder="e.g. 10"
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
              <span className="font-semibold text-slate-700 dark:text-slate-350">₹{calculateTotal().subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>Discount deduction:</span>
              <span className="font-semibold text-red-500">-₹{calculateTotal().discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>CGST ({calculateTotal().cgstVal}%):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-350">
                ₹{(Math.max(0, calculateTotal().subtotal - calculateTotal().discountVal) * (calculateTotal().cgstVal / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>SGST ({calculateTotal().sgstVal}%):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-350">
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
                      <span className="text-slate-600 font-medium">Place of Supply :</span>
                      <span className="font-bold text-slate-900">Tamil Nadu (33)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address / Contact Strip */}
              <div className="text-center text-[11px] text-slate-600 border-b border-slate-300 pb-2">
                📍 123 Greenway Avenue, Coimbatore, Tamil Nadu 641001, India &nbsp;|&nbsp; 📞 +91 98765 43210 &nbsp;|&nbsp; ✉️ info@greenglide.com &nbsp;|&nbsp; 🌐 www.greenglide.com
              </div>

              {/* BILL TO / SHIP TO / TRANSPORT CARDS */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* BILL TO */}
                <div className="border border-slate-300 rounded overflow-hidden bg-white">
                  <div className="bg-[#002D62] text-white font-bold px-3 py-1.5 flex items-center gap-1.5 uppercase text-[11px]">
                    👤 BILL TO
                  </div>
                  <div className="p-2.5 space-y-1">
                    <div className="font-bold text-sm text-slate-900">{selectedInvoice.customer?.name || 'Customer'}</div>
                    <div className="text-slate-600">{selectedInvoice.customer?.address || 'Coimbatore, Tamil Nadu 641001, India'}</div>
                    <div className="text-slate-600">Phone: {selectedInvoice.customer?.phone || '+91 90000 00000'}</div>
                    <div className="text-slate-600">GSTIN: {selectedInvoice.customer?.gstNumber || '33AAAAA0000A1Z5'}</div>
                  </div>
                </div>

                {/* SHIP TO */}
                <div className="border border-slate-300 rounded overflow-hidden bg-white">
                  <div className="bg-[#002D62] text-white font-bold px-3 py-1.5 flex items-center gap-1.5 uppercase text-[11px]">
                    🚛 SHIP TO
                  </div>
                  <div className="p-2.5 space-y-1">
                    <div className="font-bold text-sm text-slate-900">{selectedInvoice.customer?.name || 'Customer'}</div>
                    <div className="text-slate-600">{selectedInvoice.customer?.address || 'Coimbatore, Tamil Nadu 641001, India'}</div>
                    <div className="text-slate-600">Phone: {selectedInvoice.customer?.phone || '+91 90000 00000'}</div>
                  </div>
                </div>

                {/* TRANSPORT INFO */}
                <div className="border border-slate-300 rounded overflow-hidden bg-white p-3 space-y-2">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">📄 Transport Mode :</span>
                    <span className="font-bold text-slate-900">Road</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">📅 Vehicle No. :</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.vehicleNo || 'TN 38 AB 1234'}</span>
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

              {/* FOOTER & SIGNATORY */}
              <div className="pt-4 border-t-2 border-emerald-600 mt-4 flex justify-between items-end">
                <div className="text-left">
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#002D62]">Thank You For Your Business!</div>
                    <div className="text-[10px] text-slate-500">We appreciate your trust and look forward to serving you again.</div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-1">
                  <div className="font-bold text-[#002D62] text-xs">For Green Glide Logistics</div>
                  <img src="/signature.png" alt="Authorized Signature" className="h-10 object-contain my-1" />
                  <div className="text-xs text-slate-600 border-t border-slate-300 pt-1 w-36 text-center">Authorized Signatory</div>
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
