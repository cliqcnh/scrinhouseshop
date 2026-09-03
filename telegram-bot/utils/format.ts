export function formatGHS(amount: number): string {
  return `GH₵${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return "024XXXXXXX";
  return phone.slice(0, 3) + "XXXX" + phone.slice(-3);
}
