// Shared display formatting for report pages.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** USD with thousands separators and no cents — "$1,234,567". */
export function formatUsd(v: number | null | undefined): string {
  return v != null ? USD.format(v) : "Not published";
}
