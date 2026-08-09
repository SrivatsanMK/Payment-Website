import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { endpoints } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import { Calendar } from 'lucide-react';

interface VegetableOption {
  _id: string;
  name: string;
  category?: string;
  defaultUnit?: string;
}

interface SupplierOption {
  _id: string;
  name: string;
  phone?: string;
}

interface PurchaseItemRow {
  vegetableId: string;
  quantity: string;
  unit: string;
  ratePerUnit: string;
}

export const AddPurchase: React.FC = () => {
  const api = useAxios();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);

  // Master Data
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [vegetables, setVegetables] = useState<VegetableOption[]>([]);

  // Header Details
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseTime, setPurchaseTime] = useState(
    new Date().toTimeString().split(' ')[0].slice(0, 5)
  );
  const [supplierId, setSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Items List
  const [items, setItems] = useState<PurchaseItemRow[]>([
    { vegetableId: '', quantity: '', unit: 'KG', ratePerUnit: '' }
  ]);

  // Load active Vegetables and Suppliers
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [supRes, vegRes] = await Promise.all([
          api.get(`${endpoints.privateBusiness.suppliers.base}`),
          api.get(`${endpoints.privateBusiness.vegetables.base}?activeOnly=true`)
        ]);

        if (supRes.data.success) {
          const activeSup = (supRes.data.suppliers || []).filter((s: any) => s.isActive);
          setSuppliers(activeSup);
          if (activeSup.length > 0) setSupplierId(activeSup[0]._id);
        }

        if (vegRes.data.success) {
          const vegs = vegRes.data.vegetables || [];
          setVegetables(vegs);
          if (vegs.length > 0) {
            setItems([{ vegetableId: vegs[0]._id, quantity: '', unit: vegs[0].defaultUnit || 'KG', ratePerUnit: '' }]);
          }
        }
      } catch (err) {
        console.error('Failed to load master data:', err);
        showToast('Failed to load suppliers or vegetables list', 'error');
      }
    };

    loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Item row changes
  const handleItemChange = (index: number, field: keyof PurchaseItemRow, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    // Auto update unit when vegetable changes
    if (field === 'vegetableId') {
      const selectedVeg = vegetables.find((v) => v._id === value);
      if (selectedVeg) {
        updated[index].unit = selectedVeg.defaultUnit || 'KG';
      }
    }

    setItems(updated);
  };

  const addRow = () => {
    const defaultVegId = vegetables[0]?._id || '';
    const defaultUnit = vegetables[0]?.defaultUnit || 'KG';
    setItems([...items, { vegetableId: defaultVegId, quantity: '', unit: defaultUnit, ratePerUnit: '' }]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const vegetableSubtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.ratePerUnit) || 0;
    return sum + qty * rate;
  }, 0);

  const grandTotal = vegetableSubtotal;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (!supplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }

    const invalidRow = items.some((i) => !i.vegetableId || !(parseFloat(i.quantity) > 0) || !(parseFloat(i.ratePerUnit) >= 0));
    if (invalidRow) {
      showToast('Please fill in valid quantity and rate for all vegetable items', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        purchaseDate,
        purchaseTime,
        supplierId,
        items: items.map((i) => ({
          vegetableId: i.vegetableId,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          ratePerUnit: parseFloat(i.ratePerUnit)
        })),
        charges: {
          transportation: 0,
          loadingUnloading: 0,
          commission: 0,
          other: 0
        },
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        paidAmount: grandTotal,
        billNumber,
        vehicleNumber,
        notes
      };

      const res = await api.post(endpoints.privateBusiness.purchases.base, payload);
      if (res.data.success) {
        showToast('Purchase entry saved successfully!', 'success');
        if (addAnother) {
          // Reset items
          if (vegetables.length > 0) {
            setItems([{ vegetableId: vegetables[0]._id, quantity: '', unit: vegetables[0].defaultUnit || 'KG', ratePerUnit: '' }]);
          }
          setBillNumber('');
          setNotes('');
        } else {
          navigate('/admin/private-business/purchases');
        }
      }
    } catch (err: any) {
      console.error('Failed to create purchase:', err);
      showToast(err.response?.data?.message || 'Failed to save purchase entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Record Vegetable Purchase
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter wholesale procurement details, vegetables, rates, quantities, and supplier information.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/admin/private-business/purchases')}
          className="text-xs self-start sm:self-auto"
        >
          ← Back to Purchase History
        </Button>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* ── SECTION 1: HEADER INFO ─────────────────────────────────────────── */}
        <Card className="p-7 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-teal-500" /> Header Information
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Transaction & Supplier Metadata</span>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-7 text-xs">
            {/* Row 1 */}
            <div className="lg:col-span-3">
              <Input
                label="Purchase Date *"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="lg:col-span-3">
              <Input
                label="Purchase Time *"
                type="time"
                value={purchaseTime}
                onChange={(e) => setPurchaseTime(e.target.value)}
                required
              />
            </div>

            <div className="lg:col-span-6">
              <Select
                label="Supplier / Dealer *"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={suppliers.map((s) => ({
                  value: s._id,
                  label: `${s.name} ${s.phone ? `(${s.phone})` : ''}`
                }))}
                required
              />
            </div>

            {/* Row 2 */}
            <div className="lg:col-span-3">
              <Input
                label="Bill / Invoice Number"
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </div>

            <div className="lg:col-span-3">
              <Input
                label="Vehicle / Transport No"
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </div>

            <div className="lg:col-span-6">
              <Input
                label="Notes / Remarks"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── SECTION 2: MULTI-ITEM VEGETABLES TABLE ──────────────────────────── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Vegetable Purchase Items
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-xs py-1"
            >
              + Add Vegetable
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((row, index) => {
              const itemTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.ratePerUnit) || 0);

              return (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5"
                >
                  {/* Vegetable Dropdown */}
                  <div className="sm:col-span-5">
                    <Select
                      label={`Vegetable #${index + 1} *`}
                      value={row.vegetableId}
                      onChange={(e) => handleItemChange(index, 'vegetableId', e.target.value)}
                      options={vegetables.map((v) => ({
                        value: v._id,
                        label: `${v.name} ${v.category ? `(${v.category})` : ''}`
                      }))}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <Input
                      label="Quantity *"
                      type="number"
                      value={row.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>

                  {/* Unit */}
                  <div className="sm:col-span-2">
                    <Select
                      label="Unit"
                      value={row.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      options={[
                        { value: 'KG', label: 'KG' },
                        { value: 'Grams', label: 'Grams' },
                        { value: 'Bunch', label: 'Bunch' },
                        { value: 'Box', label: 'Box' },
                        { value: 'Bag', label: 'Bag' },
                        { value: 'Pieces', label: 'Pieces' }
                      ]}
                    />
                  </div>

                  {/* Rate / Unit */}
                  <div className="sm:col-span-2">
                    <Input
                      label={`Rate / ${row.unit} (₹) *`}
                      type="number"
                      value={row.ratePerUnit}
                      onChange={(e) => handleItemChange(index, 'ratePerUnit', e.target.value)}
                    />
                  </div>

                  {/* Row Total & Delete */}
                  <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2 pb-2">
                    <span className="sm:hidden text-xs font-bold text-slate-500">Total:</span>
                    <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">
                      ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-500/10 transition-colors ml-1"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-white/10 pt-3 flex justify-end">
            <div className="text-right">
              <span className="text-xs text-slate-500 font-bold uppercase">Vegetable Subtotal:</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white ml-3">
                ₹{vegetableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        {/* ── SECTION 3: GRAND TOTAL SUMMARY ────────────────────────────────────── */}
        <Card className="p-6 bg-teal-500/5 dark:bg-teal-950/10 border border-teal-500/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Purchase Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total wholesale bill amount calculated for all vegetable items.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
              Grand Total Amount
            </span>
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </Card>

        {/* ── ACTION BUTTONS ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/private-business/purchases')}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            loading={loading}
            onClick={(e) => handleSubmit(e, true)}
          >
            Save & Add Another
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="px-8"
          >
            Save Purchase
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddPurchase;
