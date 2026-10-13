// Small DOM helpers for the control deck.
export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];
export function h(tag, attrs = {}, html = "") {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false || value === null) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  if (html) el.innerHTML = html;
  return el;
}
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function formatValue(value, c) {
  const digits = c.digits ?? (c.step && c.step < 1 ? Math.max(0, Math.ceil(-Math.log10(c.step))) : 0);
  const text = Math.abs(value) >= 1000 && digits === 0 ? Math.round(value).toLocaleString("en-US") : value.toFixed(digits);
  return `${text}${c.unit ? `<i>${esc(c.unit)}</i>` : ""}`;
}
// A ruler of ticks under a slider, like the plinth's ruler strip.
export function rulerTicks(min, max, step) {
  const span = max - min;
  const count = Math.min(40, Math.max(4, Math.round(span / step)));
  return Array.from({ length: count + 1 }, (_, i) => `<b style="left:${((i / count) * 100).toFixed(2)}%"${i % 5 === 0 ? ' class="mj"' : ""}></b>`).join("");
}
