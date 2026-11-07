import React, { useState, useEffect } from "react";
import { Card, Button, Input, ConfirmationModal } from "../components";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Store,
  Plus,
  Tags,
  Pencil,
  Trash2,
} from "lucide-react";
import { useStoreSettings } from "../hooks";
import { CreateStoreModal } from "../components/store/CreateStoreModal";
import { CategoryCreateModal } from "../components/inventory";
import {
  fetchCategoriesByStore,
  createCategoryForStore,
  updateCategoryForStore,
  deleteCategoryForStore,
  type StoreCategory,
} from "../services/categoryService";

export const SettingsPage: React.FC = () => {
  const {
    store,
    stores,
    loading,
    saving,
    error,
    success,
    updateStore,
    createStore,
    selectStore,
  } = useStoreSettings();

  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(
    null,
  );
  const [deleteCategory, setDeleteCategory] = useState<StoreCategory | null>(null);
  const [deleteCategorySubmitting, setDeleteCategorySubmitting] = useState(false);

  // Store form state
  const [name, setName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [receiptFooterNote, setReceiptFooterNote] = useState("");
  const [defaultSalesTaxRate, setDefaultSalesTaxRate] = useState("");

  // New store form state (when setting up initial store)
  const [newStoreName, setNewStoreName] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newReceiptFooter, setNewReceiptFooter] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("5.0");

  // Sync store state
  useEffect(() => {
    if (store) {
      setName(store.name ?? "");
      setBranchCode(store.branch_code ?? "");
      setReceiptFooterNote(store.receipt_footer_note ?? "");
      setDefaultSalesTaxRate(
        store.default_sales_tax_rate != null
          ? String(store.default_sales_tax_rate)
          : "5.0",
      );
    }
  }, [store]);

  useEffect(() => {
    if (!store?.id) {
      setCategories([]);
      return;
    }
    fetchCategoriesByStore(store.id).then(({ data }) => setCategories(data));
  }, [store?.id]);

  const handleSaveStore = async () => {
    await updateStore({
      name,
      branch_code: branchCode,
      receipt_footer_note: receiptFooterNote,
      default_sales_tax_rate: parseFloat(defaultSalesTaxRate) || 0,
    });
  };

  const handleCreateInitialStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    await createStore({
      name: newStoreName.trim(),
      branch_code: newBranchCode.trim() || undefined,
      receipt_footer_note: newReceiptFooter.trim() || undefined,
      default_sales_tax_rate: parseFloat(newTaxRate) || 0,
    });
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: StoreCategory) => {
    if (!category.store_id || category.store_id !== store?.id) return;
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (categoryName: string) => {
    if (!store?.id) return;
    setCategorySubmitting(true);
    const result = editingCategory
      ? await updateCategoryForStore(editingCategory.id, store.id, categoryName)
      : await createCategoryForStore(store.id, categoryName);
    setCategorySubmitting(false);
    if (result.error) {
      alert(
        `Failed to ${editingCategory ? "update" : "create"} category: ${result.error.message}`,
      );
      return;
    }
    if (result.data) {
      const updatedCategory = result.data;
      setCategories((previous) =>
        editingCategory
          ? previous.map((category) =>
              category.id === updatedCategory.id ? updatedCategory : category,
            )
          : [...previous, updatedCategory],
      );
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (category: StoreCategory) => {
    if (!store?.id || !category.store_id || category.store_id !== store.id)
      return;
    setDeleteCategorySubmitting(true);
    const { error } = await deleteCategoryForStore(category.id, store.id);
    setDeleteCategorySubmitting(false);
    if (error) {
      alert(`Failed to delete category: ${error.message}`);
      return;
    }
    setCategories((previous) =>
      previous.filter((item) => item.id !== category.id),
    );
    setDeleteCategory(null);
  };

  const isLoading = loading;

  // Loading skeleton
  if (isLoading && !store && stores.length === 0) {
    return (
      <div className="flex-1 p-8 bg-slate-50 overflow-y-auto flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-y-auto space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Store Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage store details, categories, and cashier terminal preferences.
        </p>
      </div>

      {/* Store status messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Store Information Section */}
      {store ? (
        <>
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tags size={14} className="text-indigo-500" />
                Store Categories
              </h2>
              <Button
                size="sm"
                variant="outline"
                icon={<Plus size={14} />}
                onClick={openCreateCategory}
              >
                New Category
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500">
                No categories have been created for this store yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((category) => {
                  const isStoreOwned = category.store_id === store.id;
                  return (
                    <div
                      key={`${category.store_id || "legacy"}-${category.id}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {category.name}
                        </p>
                        {!isStoreOwned && (
                          <p className="text-[10px] text-slate-400">
                            Legacy category
                          </p>
                        )}
                      </div>
                      {isStoreOwned && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={14} />}
                            onClick={() => openEditCategory(category)}
                            aria-label={`Edit ${category.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={14} />}
                            onClick={() => setDeleteCategory(category)}
                            aria-label={`Delete ${category.name}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Store size={14} className="text-indigo-500" />
                Store Information
              </h2>

              {/* Multi-store selector & Add Store button */}
              <div className="flex items-center gap-2">
                {stores.length > 1 && (
                  <select
                    value={store.id}
                    onChange={(e) => selectStore(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.branch_code || "MAIN-01"})
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={14} />}
                  onClick={() => setIsCreateStoreModalOpen(true)}
                >
                  Add Another Store
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Coffee Shop"
              />
              <Input
                label="Store Branch Code"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g. STR-01"
              />
              <Input
                label="Receipt Footer Note"
                value={receiptFooterNote}
                onChange={(e) => setReceiptFooterNote(e.target.value)}
                placeholder="e.g. Thank you for visiting!"
              />
              <Input
                label="Default Sales Tax Rate (%)"
                value={defaultSalesTaxRate}
                onChange={(e) => setDefaultSalesTaxRate(e.target.value)}
                type="number"
                placeholder="e.g. 5.0"
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Hardware & Peripherals
            </h2>
            <div className="space-y-3 text-xs text-slate-700">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Automatically trigger cash drawer open on cash checkout
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Auto-print paper receipt upon successful card transaction
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enable sound feedback on barcode scan</span>
              </label>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              icon={
                saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )
              }
              onClick={handleSaveStore}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Store Settings"}
            </Button>
          </div>
        </>
      ) : (
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Store size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Set Up Your Store
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                You haven't set up a store yet. Create one now to begin managing
                products and taking orders.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateInitialStore} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store Name *"
                placeholder="e.g. My Cafe & Bakery"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                required
              />
              <Input
                label="Branch Code"
                placeholder="e.g. STR-01"
                value={newBranchCode}
                onChange={(e) => setNewBranchCode(e.target.value)}
              />
              <Input
                label="Default Sales Tax Rate (%)"
                type="number"
                placeholder="e.g. 5.0"
                value={newTaxRate}
                onChange={(e) => setNewTaxRate(e.target.value)}
              />
              <Input
                label="Receipt Footer Note"
                placeholder="e.g. Thank you for your visit!"
                value={newReceiptFooter}
                onChange={(e) => setNewReceiptFooter(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !newStoreName.trim()}
                icon={
                  saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )
                }
              >
                {saving ? "Creating..." : "Create Store"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <CreateStoreModal
        isOpen={isCreateStoreModalOpen}
        onClose={() => setIsCreateStoreModalOpen(false)}
      />

      {store && (
        <CategoryCreateModal
          isOpen={isCategoryModalOpen}
          storeName={store.name}
          submitting={categorySubmitting}
          initialName={editingCategory?.name || ""}
          mode={editingCategory ? "edit" : "create"}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSubmit={handleCategorySubmit}
        />
      )}

      <ConfirmationModal
        isOpen={deleteCategory !== null}
        title="Delete Category"
        message={
          deleteCategory
            ? `Delete “${deleteCategory.name}”? Products using it will keep their category text.`
            : ""
        }
        confirmLabel="Delete Category"
        loading={deleteCategorySubmitting}
        onClose={() => {
          if (!deleteCategorySubmitting) setDeleteCategory(null);
        }}
        onConfirm={async () => {
          if (deleteCategory) await handleDeleteCategory(deleteCategory);
        }}
      />
    </div>
  );
};
