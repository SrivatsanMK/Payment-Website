import React, { useEffect, useState, useCallback } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Tag,
  X,
  Check,
  Palette,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

const ALLOWED_UNITS = ['grams', 'kg', 'ml', 'liter'];

interface ProductItem {
  _id: string;
  name: string;
  colors: string[];
  unit: string;
  isActive: boolean;
}

interface ProductCategory {
  _id: string;
  name: string;
  isActive: boolean;
  items: ProductItem[];
}

// ─── Small inline color chip editor ──────────────────────────────────────────
const ColorChipEditor: React.FC<{
  colors: string[];
  onChange: (colors: string[]) => void;
}> = ({ colors, onChange }) => {
  const [draft, setDraft] = useState('');

  const addColor = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (colors.includes(trimmed)) return;
    onChange([...colors, trimmed]);
    setDraft('');
  };

  const removeColor = (c: string) => {
    onChange(colors.filter((col) => col !== c));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Colors <span className="text-slate-400 font-normal normal-case">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {colors.map((c) => (
          <span
            key={c}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
          >
            {c}
            <button type="button" onClick={() => removeColor(c)} className="hover:text-red-500 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {colors.length === 0 && (
          <span className="text-xs text-slate-400 italic">No colors added</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addColor(); }
          }}
          placeholder="e.g. Red, Soft Pink…"
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={addColor}
          className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const CategoryManagement: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();
  const { socket } = useSocket();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // ─ Category modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // ─ Delete category confirm
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCatLoading, setDeleteCatLoading] = useState(false);

  // ─ Item modals
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemParentCatId, setItemParentCatId] = useState<string>('');
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemColors, setItemColors] = useState<string[]>([]);
  const [itemUnit, setItemUnit] = useState('grams');
  const [itemSaving, setItemSaving] = useState(false);

  // ─ Delete item confirm
  const [deleteItemInfo, setDeleteItemInfo] = useState<{ catId: string; itemId: string; name: string } | null>(null);
  const [deleteItemLoading, setDeleteItemLoading] = useState(false);

  // ─── Data loading ─────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get(endpoints.categories.base);
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('DATA_UPDATED', fetchCategories);
    return () => { socket.off('DATA_UPDATED', fetchCategories); };
  }, [socket, fetchCategories]);

  // ─── Category actions ─────────────────────────────────────────────────────
  const openAddCategory = () => {
    setEditingCat(null);
    setCatName('');
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: ProductCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatModalOpen(true);
  };

  const handleCatSave = async () => {
    if (!catName.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    setCatSaving(true);
    try {
      if (editingCat) {
        await api.put(endpoints.categories.single(editingCat._id), { name: catName.trim() });
        showToast('Category renamed successfully', 'success');
      } else {
        await api.post(endpoints.categories.base, { name: catName.trim() });
        showToast('Category created successfully', 'success');
      }
      setCatModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatId) return;
    setDeleteCatLoading(true);
    try {
      await api.delete(endpoints.categories.single(deleteCatId));
      showToast('Category removed', 'success');
      setDeleteCatId(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove category', 'error');
    } finally {
      setDeleteCatLoading(false);
    }
  };

  // ─── Item actions ─────────────────────────────────────────────────────────
  const openAddItem = (catId: string) => {
    setItemParentCatId(catId);
    setEditingItem(null);
    setItemName('');
    setItemColors([]);
    setItemUnit('grams');
    setItemModalOpen(true);
  };

  const openEditItem = (catId: string, item: ProductItem) => {
    setItemParentCatId(catId);
    setEditingItem(item);
    setItemName(item.name);
    setItemColors([...item.colors]);
    setItemUnit(item.unit);
    setItemModalOpen(true);
  };

  const handleItemSave = async () => {
    if (!itemName.trim()) {
      showToast('Item name is required', 'error');
      return;
    }
    if (!itemUnit) {
      showToast('Unit is required', 'error');
      return;
    }
    setItemSaving(true);
    try {
      if (editingItem) {
        await api.put(endpoints.categories.item(itemParentCatId, editingItem._id), {
          name: itemName.trim(),
          colors: itemColors,
          unit: itemUnit,
        });
        showToast('Item updated successfully', 'success');
      } else {
        await api.post(endpoints.categories.items(itemParentCatId), {
          name: itemName.trim(),
          colors: itemColors,
          unit: itemUnit,
        });
        showToast('Item added successfully', 'success');
      }
      setItemModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save item', 'error');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemInfo) return;
    setDeleteItemLoading(true);
    try {
      await api.delete(endpoints.categories.item(deleteItemInfo.catId, deleteItemInfo.itemId));
      showToast('Item removed', 'success');
      setDeleteItemInfo(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove item', 'error');
    } finally {
      setDeleteItemLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <>
      <Card className="space-y-6 p-6">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              Category &amp; Product Management
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Manage categories and items available when creating invoices.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={openAddCategory}
            className="flex items-center gap-1.5 text-xs font-semibold py-2 px-4"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </Button>
        </div>

        {/* Category list */}
        {categories.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No categories yet. Click "Add Category" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => {
              const isExpanded = expandedCat === cat._id;
              return (
                <div
                  key={cat._id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                >
                  {/* Category header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/60 cursor-pointer select-none"
                    onClick={() => setExpandedCat(isExpanded ? null : cat._id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />
                      }
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{cat.name}</span>
                      <span className="text-xs text-slate-400">
                        ({cat.items.filter((i) => i.isActive !== false).length} items)
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Rename category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCatId(cat._id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Remove category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items panel */}
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-2 bg-white dark:bg-slate-900/30">
                      {cat.items.filter((i) => i.isActive !== false).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No items in this category.</p>
                      ) : (
                        cat.items
                          .filter((i) => i.isActive !== false)
                          .map((item) => (
                            <div
                              key={item._id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                    {item.unit}
                                  </span>
                                </div>
                                {item.colors && item.colors.length > 0 && (
                                  <div className="flex items-center gap-1 pl-5 flex-wrap">
                                    <Palette className="h-3 w-3 text-slate-300" />
                                    {item.colors.map((c) => (
                                      <span
                                        key={c}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                      >
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openEditItem(cat._id, item)}
                                  className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Edit item"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setDeleteItemInfo({ catId: cat._id, itemId: item._id, name: item.name })}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))
                      )}

                      <button
                        onClick={() => openAddItem(cat._id)}
                        className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 hover:text-purple-500 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Item
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Category Add/Edit Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCat ? 'Rename Category' : 'Add New Category'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Fruits, Herbs, Grains…"
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCatModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={catSaving} onClick={handleCatSave} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {editingCat ? 'Save Rename' : 'Create Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Category Confirm Modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!deleteCatId}
        onClose={() => setDeleteCatId(null)}
        title="Remove Category"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This will remove the category and all its items from the selection list.
            <br />
            <span className="text-xs text-slate-400 mt-1 block">
              Existing invoice records are not affected.
            </span>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteCatId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={deleteCatLoading}
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Item Add/Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Item Name"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Rose, Cabbage, Mango…"
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Unit <span className="text-red-400">*</span>
            </label>
            <select
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
              required
            >
              {ALLOWED_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <ColorChipEditor colors={itemColors} onChange={setItemColors} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={itemSaving} onClick={handleItemSave} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Item Confirm Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteItemInfo}
        onClose={() => setDeleteItemInfo(null)}
        title="Remove Item"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Remove <span className="font-semibold text-slate-800 dark:text-white">"{deleteItemInfo?.name}"</span> from the product list?
            <br />
            <span className="text-xs text-slate-400 mt-1 block">
              Existing invoice records are not affected.
            </span>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteItemInfo(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={deleteItemLoading}
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CategoryManagement;
