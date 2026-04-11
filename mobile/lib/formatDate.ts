const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

export function formatScheduledDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round(
    (dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  if (diff === 0) return `Danes ob ${time}`;
  if (diff === 1) return `Jutri ob ${time}`;

  const dayName = DAYS[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  return `${dayName}, ${d}.${m}. ob ${time}`;
}
