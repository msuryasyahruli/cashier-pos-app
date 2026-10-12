import React, { useEffect, useState } from "react";
import { Card, Badge, Button, Input, Table, type Column } from "../components";
import {
  Search,
  Download,
  Filter,
  ReceiptText,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  fetchTransactionDetailFromSupabase,
  type StoredTransactionDetail,
} from "../lib/transactionStorage";
import type { TransactionItem } from "../components/pos";
import {
  formatDate,
  exportTransactionsCSV,
  TransactionDetailModal,
} from "../components/transactions";

export const TransactionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Completed" | "Refunded" | "Pending"
  >("All");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [txDetail, setTxDetail] = useState<StoredTransactionDetail | null>(
    null,
  );

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
      if (isMounted) {
        setTxDetail(detail);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTx]);

  const fetchTransactions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
    } else if (data) {
      setTransactions(data as TransactionItem[]);
    }
    setLoading(false);
  };

  const handleRefund = async () => {
    if (!selectedTx) return;
    try {
      // Fetch details to restore stock
      const detail = await fetchTransactionDetailFromSupabase(
        selectedTx.order_number,
        selectedTx.id,
        selectedTx.items_count,
        selectedTx.total,
        selectedTx.discount_percent,
      );

      // Restore product stock if items are available
      if (detail && detail.items && detail.items.length > 0) {
        const restorePromises = detail.items.map(async (item) => {
          if (!item.name) return;
          // Find product by name to get current stock
          const { data: prods } = await supabase
            .from("products")
            .select("id, stock")
            .eq("name", item.name)
            .limit(1);

          if (prods && prods.length > 0) {
            const currentStock = prods[0].stock;
            const restoredStock = currentStock + item.quantity;
            await supabase
              .from("products")
              .update({ stock: restoredStock })
              .eq("id", prods[0].id);
          }
        });

        await Promise.all(restorePromises);
      }

      // Update transaction status to Refunded in Supabase
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "Refunded" })
        .eq("id", selectedTx.id);

      if (updateError) {
        console.error("Error updating transaction status:", updateError);
        alert(`Failed to refund: ${updateError.message}`);
        return;
      }

      // Refresh the list and close modal
      await fetchTransactions();
      setSelectedTx(null);
    } catch (e) {
      console.error("Unexpected error during refund:", e);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cashier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.payment_method?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Metrics calculation
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const todaySales = transactions
    .filter((tx) => {
      if (tx.status !== "Completed") return false;
      const txDate = new Date(tx.created_at);
      return !isNaN(txDate.getTime()) && isSameDay(txDate, new Date());
    })
    .reduce((acc, tx) => acc + (Number(tx.total) || 0), 0);

  const completedCount = transactions.filter(
    (i) => i.status === "Completed",
  ).length;

  const avgTicket =
    completedCount > 0
      ? transactions
          .filter((i) => i.status === "Completed")
          .reduce((acc, tx) => acc + (Number(tx.total) || 0), 0) /
        completedCount
      : 0;

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ledger of completed register checkouts and digital
            receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTransactionsCSV(filtered)}
            icon={<Download size={15} />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Today's Gross Volume
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ${todaySales.toFixed(2)}
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
              {completedCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              out of {transactions.length} total
            </span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Average Ticket Size
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ${avgTicket.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              per order
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
              placeholder="Search by Order ID, Cashier, or Payment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter size={14} className="text-slate-400 mr-1 shrink-0" />
            {(["All", "Completed", "Refunded", "Pending"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
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
          data={filtered}
          columns={columns}
          loading={loading}
          onRowClick={(tx) => setSelectedTx(tx)}
          emptyMessage={
            <div className="py-2">
              <ReceiptText size={32} className="mx-auto text-slate-300 mb-2" />
              No transactions match your criteria
            </div>
          }
        />
      </Card>

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        selectedTx={selectedTx}
        txDetail={txDetail}
        onClose={() => setSelectedTx(null)}
        onRefund={handleRefund}
      />
    </div>
  );
};
