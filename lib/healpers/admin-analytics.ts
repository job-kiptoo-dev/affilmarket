
function fmtK(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(1)}k`;
  return `KSh ${n.toFixed(0)}`;
}
function pct(n: number, d = 1) { return `${n.toFixed(d)}%`; }
function delta(cur: number, prev: number) {
  if (prev === 0) return { val: cur > 0 ? 100 : 0, positive: true };
  const d = ((cur - prev) / prev) * 100;
  return { val: Math.abs(d), positive: d >= 0 };
}
function shortDate(s: string) {
  if (s.length === 7) {
    const m = parseInt(s.split("-")[1]) - 1;
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m];
  }
  const d = new Date(s + "T12:00:00Z");
  return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}
function fmtHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}


