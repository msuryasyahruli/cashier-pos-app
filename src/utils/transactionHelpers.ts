export const formatDate = (timestamp: string) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${timeStr}`;
};

const escapeCsvCell = (value: unknown): string => {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const exportTransactionsCSV = (
  data: any[],
  exportDate?: string,
  storeName?: string,
) => {
  if (data.length === 0) return;

  const headers = [
    "Order ID",
    "Date & Time",
    "Cashier",
    "Items Count",
    "Payment Method",
    "Status",
    "Total ($)",
  ];
  const rows = data.map((tx) => [
    escapeCsvCell(tx.order_number),
    escapeCsvCell(tx.created_at),
    escapeCsvCell(tx.cashier),
    Number(tx.items_count) || 0,
    escapeCsvCell(tx.payment_method),
    escapeCsvCell(tx.status),
    (Number(tx.total) || 0).toFixed(2),
  ]);

  const totalItems = data.reduce(
    (sum, tx) => sum + (Number(tx.items_count) || 0),
    0,
  );
  const totalSales = data.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const summaryRows = [
    [],
    ["Summary", "Value"],
    ["Store Name", escapeCsvCell(storeName || "")],
    ["Total Transactions", data.length],
    ["Total Items", totalItems],
    ["Total Sales ($)", totalSales.toFixed(2)],
  ];

  const csvContent = [
    headers.join(","),
    ...rows.map((e) => e.join(",")),
    ...summaryRows.map((e) => e.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `transactions_${String(storeName || "store")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "") || "store"}_${exportDate || new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
