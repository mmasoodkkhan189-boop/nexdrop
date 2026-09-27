export const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "handed_over", label: "Handed over to our delivery partner" },
  { value: "on_the_way", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
] as const;

export const ALL_ORDER_STATUSES = [
  { value: "sent", label: "Sent to customer" },
  { value: "pending", label: "Pending" },
  { value: "handed_over", label: "Handed over to our delivery partner" },
  { value: "on_the_way", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
] as const;

export const ORDER_STATUS_CONFIG = [
  { value: "sent", label: "Sent to customer", color: "#0369A1", bg: "#E0F2FE", dot: "#0284C7", desc: "Awaiting customer to grab order" },
  { value: "pending", label: "Pending", color: "#B45309", bg: "#FEF3C7", dot: "#F59E0B", desc: "Order grabbed & in queue" },
  { value: "handed_over", label: "Handed over", color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6", desc: "Given to delivery partner" },
  { value: "on_the_way", label: "On the way", color: "#6D28D9", bg: "#EDE9FE", dot: "#8B5CF6", desc: "In transit to destination" },
  { value: "delivered", label: "Delivered", color: "#047857", bg: "#D1FAE5", dot: "#10B981", desc: "Successfully delivered" },
  { value: "completed", label: "Completed", color: "#0F766E", bg: "#CCFBF1", dot: "#0D9488", desc: "Commission & payment released" },
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number]["value"] | "sent";

export function orderStatusLabel(status: string) {
  if (status === "sent") return "Sent to customer";
  return ORDER_STATUSES.find((item) => item.value === status)?.label || status;
}

export function getOrderStatusConfig(status: string) {
  return ORDER_STATUS_CONFIG.find(s => s.value === status) || {
    value: status,
    label: orderStatusLabel(status),
    color: "#475569",
    bg: "#F1F5F9",
    dot: "#94A3B8",
    desc: "Order status"
  };
}



