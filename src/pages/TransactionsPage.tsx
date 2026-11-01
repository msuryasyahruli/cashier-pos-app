import React, { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Input, Table, type Column } from "../components";
import {
  Search,
  Download,
  Filter,
  ReceiptText,
  CreditCard,
  Banknote,
  Smartphone,
  Store,
  Plus,
} from "lucide-react";
import {
  fetchTransactionDetailFromSupabase,
  type StoredTransactionDetail,
} from "../services/transactionStorage";
import {
  fetchTransactionsByStore,
  fetchTransactionMetrics,
} from "../services/transactionService";
import { supabase } from "../services/supabaseClient";
import type { TransactionItem } from "../components/pos";
import {
  formatDate,
  exportTransactionsCSV,
  TransactionDetailModal,
} from "../components/transactions";
import { useStore } from "../context/StoreContext";
import { CreateStoreModal } from "../components/store/CreateStoreModal";

export const TransactionsPage: React.FC = () => {
  const { currentStore } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Completed" | "Refunded" | "Pending"
  >("All");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [exportDate, setExportDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [exporting, setExporting] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [txDetail, setTxDetail] = useState<StoredTransactionDetail | null>(
    null,
  );
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);

  // Store-scoped metrics
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    yesterdaySales: 0,
    completedCount: 0,
  });

  const fetchMetrics = useCallback(async () => {
    if (!currentStore?.id) {
      setMetrics({ todaySales: 0, yesterdaySales: 0, completedCount: 0 });
      return;
    }
    const m = await fetchTransactionMetrics(currentStore.id);
    setMetrics(m);
  }, [currentStore?.id]);

  const columns: Column<TransactionItem>[] = [
    {
      header: "Order ID",
      key: "order_number",
      className: "font-semibold text-slate-900 flex items-center gap-2",
      accessor: (tx) => (
        <>
          <ReceiptText size={15} className="text-slate-400" />
          {tx.order_number}
        </>
      ),
    },
    {
      header: "Date & Time",
      key: "created_at",
      className: "text-slate-500 font-mono",
      accessor: (tx) => formatDate(tx.created_at),
    },
    {
      header: "Cashier",
      key: "cashier",
      className: "font-medium",
      accessor: "cashier",
    },
    {
      header: "Items",
      key: "items_count",
      accessor: (tx) => `${tx.items_count} items`,
    },
    {
      header: "Payment",
      key: "payment_method",
      className: "text-slate-600",
      accessor: (tx) => (
        <span className="inline-flex items-center gap-1.5">
          {tx.payment_method === "Cash" ? (
            <Banknote size={14} className="text-emerald-500" />
          ) : tx.payment_method === "Credit Card" ? (
            <CreditCard size={14} className="text-indigo-500" />
          ) : (
            <Smartphone size={14} className="text-amber-500" />
          )}
          {tx.payment_method}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      accessor: (tx) => (
        <Badge
          variant={
            tx.status === "Completed"
              ? "success"
              : tx.status === "Refunded"
                ? "danger"
                : "warning"
          }
          size="sm"
        >
          {tx.status}
        </Badge>
      ),
    },
    {
      header: "Total",
      key: "total",
      align: "right",
      className: "font-bold text-slate-900 font-mono",
      accessor: (tx) => `$${(Number(tx.total) || 0).toFixed(2)}`,
    },
  ];

  // Load detail when a transaction is selected
  useEffect(() => {
    if (!selectedTx) {
      setTxDetail(null);
      return;
    }
    let isMounted = true;
    fetchTransactionDetailFromSupabase(
      selectedTx.order_number,
      selectedTx.id,
      selectedTx.items_count,
      selectedTx.total,
      selectedTx.discount_percent,
    ).then((detail) => {
      if (isMounted) setTxDetail(detail);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedTx]);

  const fetchTransactions = useCallback(async () => {
    if (!currentStore?.id) {
      setTransactions([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, count, error } = await fetchTransactionsByStore(
      currentStore.id,
      {
        page: currentPage,
        pageSize,
        search: searchTerm,
        statusFilter,
      },
    );

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data);
      setTotalCount(count);
    }
    setLoading(false);
  }, [currentStore?.id, currentPage, pageSize, statusFilter, searchTerm]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (
    status: "All" | "Completed" | "Refunded" | "Pending",
  ) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!currentStore?.id || !exportDate) return;

    setExporting(true);
    const { data, error } = await fetchTransactionsByStore(currentStore.id, {
      dateFilter: exportDate,
      fetchAll: true,
      pageSize: 1000,
      search: searchTerm,
      statusFilter,
    });

    if (error) {
      console.error("Error fetching transactions for export:", error);
      alert("Unable to export transactions for the selected day.");
    } else if (data.length === 0) {
      alert("No transactions found for the selected day.");
    } else {
      exportTransactionsCSV(data, exportDate, currentStore.name);
    }
    setExporting(false);
  };

  const handleRefund = async () => {
    if (!selectedTx) return;
    try {
      const detail = await fetchTransactionDetailFromSupabase(
        selectedTx.order_number,
        selectedTx.id,
        selectedTx.items_count,
        selectedTx.total,
        selectedTx.discount_percent,
      );

      if (detail?.items?.length > 0) {
        const restorePromises = detail.items.map(async (item) => {
          if (!item.name) return;
          const { data: prods } = await supabase
            .from("products")
            .select("id, stock")
            .eq("name", item.name)
            .limit(1);

          if (prods && prods.length > 0) {
            const restoredStock = prods[0].stock + item.quantity;
            await supabase
              .from("products")
              .update({ stock: restoredStock })
              .eq("id", prods[0].id);
          }
        });
        await Promise.all(restorePromises);
      }

      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "Refunded" })
        .eq("id", selectedTx.id);

      if (updateError) {
        console.error("Error updating transaction status:", updateError);
        alert(`Failed to refund: ${updateError.message}`);
        return;
      }

      await fetchTransactions();
      await fetchMetrics();
      setSelectedTx(null);
    } catch (e) {
      console.error("Unexpected error during refund:", e);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const revenueChange =
    metrics.yesterdaySales > 0
      ? ((metrics.todaySales - metrics.yesterdaySales) /
          metrics.yesterdaySales) *
        100
      : metrics.todaySales > 0
        ? null
        : 0;

  // No store set up yet
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
              Please set up or select a store to view transaction history and
              sales reports.
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sales & Transactions
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
            Transaction ledger for{" "}
            <span className="font-semibold text-slate-700">
              {currentStore.name}
            </span>{" "}
            ({currentStore.branch_code || "MAIN-01"})
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <Input
            label="Sales day"
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
            className="min-w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || !exportDate}
            icon={<Download size={15} />}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Today's Gross Volume ({currentStore.name})
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ${metrics.todaySales.toFixed(2)}
            </span>
            <Badge variant="success" size="sm">
              Live
            </Badge>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Completed Orders
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {metrics.completedCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              out of {totalCount} total
            </span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Revenue vs Yesterday
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-extrabold font-mono ${
                revenueChange === null || revenueChange >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {revenueChange === null
                ? "New"
                : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Yesterday: ${metrics.yesterdaySales.toFixed(2)}
            </span>
          </div>
        </Card>
      </div>

      {/* Table & Filters Card */}
      <Card className="space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="w-full sm:w-80">
            <Input
              placeholder={`Search in ${currentStore.name}...`}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter size={14} className="text-slate-400 mr-1 shrink-0" />
            {(["All", "Completed", "Refunded", "Pending"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    statusFilter === status
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <Table
          data={transactions}
          columns={columns}
          loading={loading}
          onRowClick={(tx) => setSelectedTx(tx)}
          emptyMessage={
            <div className="py-2">
              <ReceiptText size={32} className="mx-auto text-slate-300 mb-2" />
              No transactions found for {currentStore.name}
            </div>
          }
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

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        selectedTx={selectedTx}
        txDetail={txDetail}
        storeName={currentStore.name}
        receiptFooterNote={currentStore.receipt_footer_note}
        onClose={() => setSelectedTx(null)}
        onRefund={handleRefund}
      />
    </div>
  );
};
