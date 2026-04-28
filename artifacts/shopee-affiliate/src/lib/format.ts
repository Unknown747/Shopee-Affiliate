export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "jt";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "rb";
  }
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export function getDiscountPercent(price: number, priceBeforeDisc: number): number {
  if (!priceBeforeDisc || priceBeforeDisc <= price) return 0;
  return Math.round(((priceBeforeDisc - price) / priceBeforeDisc) * 100);
}
