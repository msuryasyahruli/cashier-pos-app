import React, { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button, Input, Table, type Column } from "../components";
import { supabase } from "../services/supabaseClient";
import {
  Search,
  Plus,
  AlertTriangle,
  Package,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  type InventoryItem,
  type InventoryFormState,
  EMPTY_FORM,
  InventoryFormModal,
} from "../components/inventory";

export const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState<InventoryFormState>(EMPTY_FORM);

  // Overall stock metrics across entire inventory
  const [metricTotalSkus, setMetricTotalSkus] = useState<number>(0);
  const [metricLowStockCount, setMetricLowStockCount] = useState<number>(0);
  const [metricTotalUnits, setMetricTotalUnits] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, stock, low_stock_threshold");
      if (!error && data) {
        setMetricTotalSkus(data.length);
        const low = data.filter(
          (p: any) => p.stock <= (p.low_stock_threshold ?? 5),
        ).length;
        const total = data.reduce(
          (acc: number, p: any) => acc + (Number(p.stock) || 0),
          0,
        );
        setMetricLowStockCount(low);
        setMetricTotalUnits(total);
      }
    } catch (err) {
      console.error("Error fetching inventory metrics:", err);
    }
  }, []);

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
    setLoading(true);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    if (searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      query = query.or(
        `name.ilike.${term},sku.ilike.${term},category.ilike.${term}`,
      );
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error("Error fetching products:", error);
    } else if (data) {
      setInventory(data as InventoryItem[]);
      setTotalCount(count ?? data.length);
    }
    setLoading(false);
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

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

    const { error } = await supabase.from("products").insert([payload]);

    setSubmitting(false);

    if (error) {
      console.error("Error adding product:", error);
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
    };

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", editId);

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

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Error deleting product:", error);
      alert(`Failed to delete product: ${error.message}`);
    } else {
      fetchInventory();
      fetchMetrics();
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory & Stock
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage product catalog, prices, and stock threshold alerts
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
              Total SKUs
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
              placeholder="Search by SKU, name, or category..."
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
          emptyMessage="No inventories found"
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
        title="Add Product"
        submitLabel="Confirm Add"
        submittingText="Adding..."
        formData={newProduct}
        submitting={submitting}
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
        title="Edit Product"
        submitLabel="Save Changes"
        submittingText="Saving..."
        formData={editProduct}
        submitting={submitting}
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
