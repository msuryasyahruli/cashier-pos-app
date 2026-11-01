import React, { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button, Input, Table, type Column } from "../components";
import {
  Search,
  Plus,
  AlertTriangle,
  Package,
  Trash2,
  Pencil,
  Store,
} from "lucide-react";
import {
  type InventoryItem,
  type InventoryFormState,
  EMPTY_FORM,
  InventoryFormModal,
} from "../components/inventory";
import { useStore } from "../context/StoreContext";
import {
  fetchProductsByStore,
  fetchStoreMetrics,
  addProductToStore,
  updateProductInStore,
  deleteProductFromStore,
} from "../services/productService";
import {
  fetchCategoriesByStore,
  getCategoryNames,
  type StoreCategory,
} from "../services/categoryService";
import { CreateStoreModal } from "../components/store/CreateStoreModal";

export const InventoryPage: React.FC = () => {
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [newProduct, setNewProduct] = useState<InventoryFormState>(EMPTY_FORM);

  // Stock metrics for the currently accessed store
  const [metricTotalSkus, setMetricTotalSkus] = useState<number>(0);
  const [metricLowStockCount, setMetricLowStockCount] = useState<number>(0);
  const [metricTotalUnits, setMetricTotalUnits] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    if (!currentStore?.id) {
      setMetricTotalSkus(0);
      setMetricLowStockCount(0);
      setMetricTotalUnits(0);
      return;
    }
    const metrics = await fetchStoreMetrics(currentStore.id);
    setMetricTotalSkus(metrics.totalSkus);
    setMetricLowStockCount(metrics.lowStockCount);
    setMetricTotalUnits(metrics.totalUnits);
  }, [currentStore?.id]);

  const fetchCategories = useCallback(async () => {
    if (!currentStore?.id) {
      setCategories([]);
      return;
    }
    const { data } = await fetchCategoriesByStore(currentStore.id);
    setCategories(data);
  }, [currentStore?.id]);

  const columns: Column<InventoryItem>[] = [
    {
      header: "SKU",
      key: "sku",
      className: "font-mono font-medium text-slate-500",
      accessor: "sku",
    },
    {
      header: "Product Name",
      key: "name",
      className: "font-semibold text-slate-900",
      accessor: "name",
    },
    {
      header: "Category",
      key: "category",
      accessor: (item) => (
        <Badge variant="neutral" size="sm">
          {item.category}
        </Badge>
      ),
    },
    {
      header: "Price",
      key: "price",
      className: "font-semibold",
      accessor: (item) => `$${item.price.toFixed(2)}`,
    },
    {
      header: "Stock Level",
      key: "stock",
      className: "font-bold text-slate-800",
      accessor: (item) => `${item.stock} units`,
    },
    {
      header: "Status",
      key: "status",
      accessor: (item) => {
        const isOos = item.stock === 0;
        const isLow = item.stock <= item.low_stock_threshold;
        return isOos ? (
          <Badge variant="danger" size="sm" className="gap-1">
            <AlertTriangle size={12} /> Out of Stock
          </Badge>
        ) : isLow ? (
          <Badge variant="warning" size="sm" className="gap-1">
            <AlertTriangle size={12} /> Low Stock
          </Badge>
        ) : (
          <Badge variant="success" size="sm">
            Available
          </Badge>
        );
      },
    },
    {
      header: "Actions",
      key: "actions",
      className: "flex gap-2",
      accessor: (item) => (
        <>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={15} />}
            onClick={() => openEditModal(item)}
          />
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={15} />}
            onClick={() => handleDeleteProduct(item.id)}
          />
        </>
      ),
    },
  ];

  const [submitting, setSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>("");
  const [editProduct, setEditProduct] =
    useState<InventoryFormState>(EMPTY_FORM);

  const fetchInventory = useCallback(async () => {
    if (!currentStore?.id) {
      setInventory([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, count, error } = await fetchProductsByStore(currentStore.id, {
      page: currentPage,
      pageSize,
      search: searchTerm,
    });

    if (error) {
      console.error("Error fetching store products:", error);
    } else {
      setInventory(data);
      setTotalCount(count);
    }
    setLoading(false);
  }, [currentStore?.id, currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset to page 1 whenever searchTerm or pageSize changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleAddProduct = async () => {
    if (
      !currentStore?.id ||
      !newProduct.sku ||
      !newProduct.name ||
      !newProduct.category ||
      !newProduct.price
    ) {
      return;
    }

    setSubmitting(true);
    const payload = {
      sku: newProduct.sku,
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price) || 0,
      stock: parseInt(newProduct.stock, 10) || 0,
      low_stock_threshold: parseInt(newProduct.low_stock_threshold, 10) || 5,
      barcode: newProduct.barcode ? parseInt(newProduct.barcode, 10) : 0,
    };

    const { error } = await addProductToStore(currentStore.id, payload);

    setSubmitting(false);

    if (error) {
      console.error("Error adding product to store:", error);
      alert(`Failed to add product: ${error.message}`);
    } else {
      setIsAddOpen(false);
      setNewProduct(EMPTY_FORM);
      fetchInventory();
      fetchMetrics();
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setEditId(item.id);
    setEditProduct({
      sku: item.sku || "",
      name: item.name || "",
      category: item.category || "",
      price: item.price ? item.price.toString() : "",
      stock: item.stock ? item.stock.toString() : "",
      low_stock_threshold: item.low_stock_threshold
        ? item.low_stock_threshold.toString()
        : "",
      barcode: item.barcode ? item.barcode.toString() : "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (
      !editId ||
      !editProduct.sku ||
      !editProduct.name ||
      !editProduct.category ||
      !editProduct.price
    ) {
      return;
    }

    setSubmitting(true);
    const payload = {
      sku: editProduct.sku,
      name: editProduct.name,
      category: editProduct.category,
      price: parseFloat(editProduct.price) || 0,
      stock: parseInt(editProduct.stock, 10) || 0,
      low_stock_threshold: parseInt(editProduct.low_stock_threshold, 10) || 5,
      barcode: editProduct.barcode ? parseInt(editProduct.barcode, 10) : 0,
    };

    const { error } = await updateProductInStore(editId, payload);

    setSubmitting(false);

    if (error) {
      console.error("Error updating product:", error);
      alert(`Failed to update product: ${error.message}`);
    } else {
      setIsEditOpen(false);
      setEditProduct(EMPTY_FORM);
      setEditId("");
      fetchInventory();
      fetchMetrics();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await deleteProductFromStore(id);

    if (error) {
      console.error("Error deleting product:", error);
      alert(`Failed to delete product: ${error.message}`);
    } else {
      fetchInventory();
      fetchMetrics();
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // If no store is selected or set up yet
  if (!currentStore) {
    return (
      <div className="flex-1 p-6 bg-slate-50 overflow-y-auto flex items-center justify-center">
        <Card className="max-w-md w-full text-center space-y-4 py-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Store size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              No Store Selected
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Please set up or select a store to start managing products,
              prices, and stock inventory.
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsCreateStoreOpen(true)}
            className="mx-auto"
          >
            Set Up Your Store
          </Button>

          <CreateStoreModal
            isOpen={isCreateStoreOpen}
            onClose={() => setIsCreateStoreOpen(false)}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Inventory & Stock
            </h1>
            <Badge
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              {currentStore.name}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Displaying products for store:{" "}
            <span className="font-semibold text-slate-700">
              {currentStore.name}
            </span>{" "}
            ({currentStore.branch_code || "MAIN-01"})
          </p>
        </div>

        <Button
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => setIsAddOpen(true)}
        >
          Add Product
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total SKUs ({currentStore.name})
            </span>
            <p className="text-2xl font-extrabold text-slate-900 font-mono">
              {metricTotalSkus}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Low Stock Alerts
            </span>
            <p className="text-2xl font-extrabold text-amber-600 font-mono">
              {metricLowStockCount}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Units in Stock
            </span>
            <p className="text-2xl font-extrabold text-slate-900 font-mono">
              {metricTotalUnits}
            </p>
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="w-full sm:w-80">
            <Input
              placeholder={`Search in ${currentStore.name}...`}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
        </div>

        <Table
          data={inventory}
          columns={columns}
          loading={loading}
          emptyMessage={`No products found in ${currentStore.name}`}
          pagination={{
            currentPage,
            totalPages,
            totalItems: totalCount,
            pageSize,
            pageSizeOptions: [10, 20, 50],
            onPageChange: (p) => setCurrentPage(p),
            onPageSizeChange: handlePageSizeChange,
            disabled: loading,
          }}
        />
      </Card>

      {/* Add Product Modal */}
      <InventoryFormModal
        isOpen={isAddOpen}
        title={`Add Product to ${currentStore.name}`}
        submitLabel="Confirm Add"
        submittingText="Adding..."
        formData={newProduct}
        submitting={submitting}
        categories={getCategoryNames(categories)}
        onClose={() => {
          setIsAddOpen(false);
          setNewProduct(EMPTY_FORM);
        }}
        onSubmit={handleAddProduct}
        onChangeField={(field, val) =>
          setNewProduct((prev) => ({ ...prev, [field]: val }))
        }
      />

      {/* Edit Product Modal */}
      <InventoryFormModal
        isOpen={isEditOpen}
        title={`Edit ${editProduct.name}`}
        submitLabel="Save Changes"
        submittingText="Saving..."
        formData={editProduct}
        submitting={submitting}
        categories={getCategoryNames(categories)}
        onClose={() => {
          setIsEditOpen(false);
          setEditProduct(EMPTY_FORM);
          setEditId("");
        }}
        onSubmit={handleUpdateProduct}
        onChangeField={(field, val) =>
          setEditProduct((prev) => ({ ...prev, [field]: val }))
        }
      />
    </div>
  );
};
