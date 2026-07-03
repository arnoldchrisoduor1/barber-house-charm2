export function formatKES(amount: number): string {
  return `KES ${Number(amount ?? 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m?.slice(0, 2) ?? "00"} ${ampm}`;
}

export function formatPhone(phone: string): string {
  if (phone.startsWith("+254")) return phone;
  if (phone.startsWith("0")) return `+254${phone.slice(1)}`;
  return `+254${phone}`;
}
