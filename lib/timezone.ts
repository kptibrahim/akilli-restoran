// Timezone yardımcı fonksiyonlar — Intl.DateTimeFormat ile timezone-aware format
// dayjs(date).tz(tz).format(...) ile eşdeğer, sıfır bağımlılık

export const TIMEZONE_SECENEKLERI = [
  { value: "Europe/Istanbul",     label: "🇹🇷 Türkiye" },
  { value: "Asia/Dubai",          label: "🇦🇪 BAE / Dubai" },
  { value: "Europe/London",       label: "🇬🇧 İngiltere" },
  { value: "Europe/Berlin",       label: "🇩🇪 Almanya" },
  { value: "Europe/Paris",        label: "🇫🇷 Fransa" },
  { value: "Europe/Madrid",       label: "🇪🇸 İspanya" },
  { value: "Europe/Rome",         label: "🇮🇹 İtalya" },
  { value: "Europe/Moscow",       label: "🇷🇺 Rusya" },
  { value: "America/New_York",    label: "🇺🇸 ABD Doğu" },
  { value: "America/Los_Angeles", label: "🇺🇸 ABD Batı" },
] as const;

export type TimezoneValue = typeof TIMEZONE_SECENEKLERI[number]["value"];

export const DEFAULT_TZ = "Europe/Istanbul";

function fixIso(s: string): string {
  return s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s) ? s : s + "Z";
}

/** Tam tarih ve saat — dayjs(date).tz(tz).format("DD.MM.YYYY HH:mm") */
export function tzDateTime(isoStr: string, tz: string): string {
  if (!isoStr) return "";
  return new Date(fixIso(isoStr)).toLocaleString("tr-TR", { timeZone: tz });
}

/** Sadece saat — dayjs(date).tz(tz).format("HH:mm") */
export function tzTime(isoStr: string, tz: string): string {
  if (!isoStr) return "";
  return new Date(fixIso(isoStr)).toLocaleTimeString("tr-TR", {
    hour: "2-digit", minute: "2-digit", timeZone: tz,
  });
}

/** Tarihe göre gruplama için YYYY-MM-DD key — timezone'a göre */
export function tzDateKey(isoStr: string, tz: string): string {
  if (!isoStr) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(fixIso(isoStr)));
}

/** Okunabilir tarih — dayjs(date).tz(tz).format("D MMMM YYYY") */
export function tzDateLabel(isoStr: string, tz: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!isoStr) return "";
  return new Date(fixIso(isoStr)).toLocaleDateString("tr-TR", { timeZone: tz, ...opts });
}
