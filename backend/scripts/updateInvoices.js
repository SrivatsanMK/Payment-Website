const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'admin', 'Invoices.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add flower options
const flowerOptionsCode = `
const flowerOptions: Record<string, string[]> = {
  "Chrysanthemum": ["Yellow", "White", "Purple"],
  "Button Rose": ["vibrant red", "soft pink", "pure white", "sunny yellow", "cheerful orange"],
  "Lily": ["white", "yellow", "orange", "pink", "red", "purple"],
  "Marigold": ["yellow", "orange"]
};
`;
content = content.replace(/export const Invoices: React\.FC = \(\) => {/, flowerOptionsCode + '\nexport const Invoices: React.FC = () => {');

// 2. Replace state definitions
const stateReplacements = `
  const [discount, setDiscount] = useState<number | string>(0);
  const [cgst, setCgst] = useState<number | string>(''); // Support empty
  const [sgst, setSgst] = useState<number | string>(''); // Support empty
  const [productsList, setProductsList] = useState<{ productName: string; productColor: string; weightValue: string; weightUnit: string; quantity: string; price: string }[]>([
    { productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }
  ]);
`;
content = content.replace(/  const \[discount, setDiscount\] = useState<number>\(0\);[\s\S]*?\{ weightValue: 100, weightUnit: 'grams', quantity: 1, price: 0 \}\n  \]\);/, stateReplacements.trim());

// 3. Replace product list functions
const productListFunctionsCode = `
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
`;
content = content.replace(/  const addProductRow = \(\) => \{[\s\S]*?setProductsList\(updated\);\n  \};/, productListFunctionsCode.trim());

// 4. Replace calculateTotal
const calculateTotalCode = `
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
`;
content = content.replace(/  const calculateTotal = \(\) => \{[\s\S]*?return \{ subtotal, grand \};\n  \};/, calculateTotalCode.trim());

// 5. Replace openCreateModal resets
const openCreateModalCode = `
  const openCreateModal = () => {
    setSelectedCustId(customers[0]?._id || '');
    setDiscount(0);
    setCgst('');
    setSgst('');
    setProductsList([{ productName: '', productColor: '', weightValue: '100', weightUnit: 'grams', quantity: '', price: '' }]);
    setIsCreateOpen(true);
  };
`;
content = content.replace(/  const openCreateModal = \(\) => \{[\s\S]*?setIsCreateOpen\(true\);\n  \};/, openCreateModalCode.trim());

// 6. Replace handleCreateSubmit
const handleCreateSubmitCode = `
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
        name: \`\${p.productName} (\${p.productColor}) - \${p.weightValue} \${p.weightUnit}\`,
        quantity: parseInt(p.quantity) || 0,
        price: parseFloat(p.price) || 0
      }));

      const { cgstVal, sgstVal, discountVal } = calculateTotal();

      const res = await api.post(endpoints.invoices.base, {
        customerId: selectedCustId,
        products: mappedProducts,
        discount: discountVal,
        gst: cgstVal + sgstVal
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
`;
content = content.replace(/  const handleCreateSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?setActionLoading\(false\);\n    \}\n  \};/, handleCreateSubmitCode.trim());

// 7. Replace Products Builder UI
const productsBuilderUI = `
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
`;
content = content.replace(/          \{\/\* Products Builder Section \*\/\}[\s\S]*?<\/div>\n          <\/div>/, productsBuilderUI.trim());

// 8. Replace Taxes & Summaries UI
const taxesUI = `
          {/* Taxes & Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Flat Discount (₹)"
              type="number"
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
`;
content = content.replace(/          \{\/\* Taxes & Summaries \*\/\}[\s\S]*?<\/div>\n          <\/div>/, taxesUI.trim());

// 9. Fix print view headers
const printViewUI = `
              {/* Items List */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <Table headers={['Product Details', 'Packets Count', 'Price/Packet', 'Subtotal']}>
                  {selectedInvoice.products.map((p: any, i: number) => (
                    <tr key={i} className="text-xs">
                      <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-250">{p.name}</td>
                      <td className="px-6 py-3 text-slate-500">{p.quantity}</td>
                      <td className="px-6 py-3 text-slate-500">₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-3 font-bold text-slate-800 dark:text-slate-200">₹{(p.price * p.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </Table>
              </div>
`;
content = content.replace(/              \{\/\* Items List \*\/\}[\s\S]*?<\/div>\n              <\/div>/, printViewUI.trim());

// 10. Update the edit form inputs (decimals, string values)
const editFormUI = `
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Adjust Discount (₹)"
              type="number"
              step="0.01"
              value={editForm.discount}
              onChange={(e) => setEditForm({ ...editForm, discount: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) } as any)}
            />
            <Input
              label="Adjust CGST (%)"
              type="number"
              step="0.01"
              value={editForm.cgst}
              onChange={(e) => setEditForm({ ...editForm, cgst: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) } as any)}
            />
            <Input
              label="Adjust SGST (%)"
              type="number"
              step="0.01"
              value={editForm.sgst}
              onChange={(e) => setEditForm({ ...editForm, sgst: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) } as any)}
            />
          </div>
`;
content = content.replace(/          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">[\s\S]*?<\/div>/, editFormUI.trim());


fs.writeFileSync(filePath, content);
console.log('Update Complete.');
