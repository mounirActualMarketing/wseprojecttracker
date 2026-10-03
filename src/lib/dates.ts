export const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const shiftISO = (iso: string, n: number) => toISO(addDays(toDate(iso), n));

export const diffDays = (a: Date, b: Date) =>
  Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86400000,
  );

export const todayISO = () => toISO(new Date());

export const fmtShort = (iso: string) =>
  toDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const fmtLong = (iso: string) =>
  toDate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

// Monday-based start of week
export const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
