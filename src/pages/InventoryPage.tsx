import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Input, Table, type Column } from "../components";
import { supabase } from "../lib/supabaseClient";
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
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState<InventoryFormState>(EMPTY_FORM);

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
        const isLow = item.stock <= item.low_stock_threshold;
        return isLow ? (
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
  const [editProduct, setEditProduct] = useState<InventoryFormState>(EMPTY_FORM);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
    } else if (data) {
      setInventory(data as InventoryItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

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
    }
  };

  const filtered = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const lowStockItems = inventory.filter(
    (i) => i.stock <= i.low_stock_threshold,
  );
  const totalStock = inventory.reduce((acc, i) => acc + i.stock, 0);

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto space-y-6">
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
              {inventory.length}
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
              {lowStockItems.length}
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
              {totalStock}
            </p>
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by SKU or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
        </div>

        <Table
          data={filtered}
          columns={columns}
          loading={loading}
          emptyMessage="No inventories found"
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
