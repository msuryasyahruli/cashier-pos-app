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

export const exportTransactionsCSV = (data: any[]) => {
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
    `"${tx.order_number}"`,
    `"${tx.created_at}"`,
    `"${tx.cashier}"`,
    tx.items_count,
    `"${tx.payment_method}"`,
    `"${tx.status}"`,
    tx.total.toFixed(2),
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `transactions_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
