import { useState } from "react";

export const RISK: Record<string, string> = {
  Low: "#74C69D",
  Moderate: "#F4B942",
  High: "#E76F00",
  Critical: "#9B2226",
};

export function Button({ v = "primary", className = "", ...props }: any) {
  const variants: Record<string, string> = {
    primary: "bg-g2 text-white hover:bg-g1",
    danger: "bg-red text-white hover:bg-[#7f1d1d]",
    ghost: "border border-line bg-white text-ink hover:border-g2 hover:bg-paper",
  };
  return <button {...props} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[v] || variants.ghost} ${className}`} />;
}

export const Card = ({ children, className = "" }: any) =>
  <section className={`rounded-card border border-line bg-white p-5 shadow-[0_2px_10px_rgba(31,41,55,0.04)] ${className}`}>{children}</section>;

export const Badge = ({ children, color = "#1D3557", dark = true, className = "" }: any) =>
  <span style={{ background: color, color: dark ? "#fff" : "#1F2937" }} className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold leading-none ${className}`}>{children}</span>;

export const RiskBadge = ({ level }: any) =>
  <Badge color={RISK[level] || "#647067"} dark={level === "High" || level === "Critical"}>{level || "Unknown"} risk</Badge>;

export const StatusBadge = ({ status }: any) =>
  <span className="inline-flex items-center rounded border border-line bg-paper px-2 py-1 text-xs font-semibold text-ink">{status}</span>;

export const FormField = ({ label, children, hint, error }: any) =>
  <label className="mb-4 block">
    <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs leading-relaxed text-mute">{hint}</span>}
    {error && <span className="mt-1 block text-sm text-red" role="alert">{error}</span>}
  </label>;

export const FileUploader = ({ onFile, label = "Upload a photo" }: any) =>
  <FormField label={label} hint="Image files only. Avoid including sensitive personal information.">
    <input type="file" accept="image/*" onChange={(event: any) => onFile(event.target.files?.[0])} className="file:mr-3 file:rounded file:border-0 file:bg-paper file:px-3 file:py-2 file:font-semibold file:text-g1" />
  </FormField>;

export const EmptyState = ({ children }: any) =>
  <div className="rounded-card border border-dashed border-line bg-white/70 p-6 text-center text-sm leading-relaxed text-mute">{children}</div>;

export const SkeletonLoader = () =>
  <div className="animate-pulse space-y-3" aria-label="Loading">
    <div className="h-4 w-2/3 rounded bg-line" />
    <div className="h-4 rounded bg-line" />
    <div className="h-4 w-1/2 rounded bg-line" />
  </div>;

export function Tabs({ tabs, children }: any) {
  const [index, setIndex] = useState(0);
  return <div>
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab: string, key: number) =>
        <button key={tab} role="tab" aria-selected={key === index} onClick={() => setIndex(key)} className={`min-h-[46px] whitespace-nowrap border-b-2 px-4 text-sm ${key === index ? "border-g2 font-bold text-g1" : "border-transparent text-mute hover:text-ink"}`}>{tab}</button>
      )}
    </div>
    <div className="pt-5">{children[index]}</div>
  </div>;
}

export const Drawer = ({ onClose, children }: any) =>
  <aside className="fixed inset-x-0 bottom-0 z-[1000] max-h-[72vh] overflow-auto rounded-t-xl border border-line bg-white p-5 shadow-[0_-8px_30px_rgba(31,41,55,0.15)] lg:static lg:max-h-none lg:rounded-none lg:rounded-l-xl lg:shadow-none">
    <button onClick={onClose} className="float-right min-h-[40px] rounded px-3 text-sm font-semibold text-mute hover:bg-paper hover:text-ink" aria-label="Close evidence panel">Close</button>
    {children}
  </aside>;

export function Table({ cols, rows, onRow, sortKey, sortDirection, onSort }: any) {
  return <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead><tr className="bg-paper text-xs uppercase tracking-wide text-mute">{cols.map((col: any) => <th key={col.h} className="px-3 py-3 font-semibold" aria-sort={col.sortKey && sortKey === col.sortKey ? sortDirection === "asc" ? "ascending" : "descending" : undefined}>{col.sortKey ? <button className="inline-flex min-h-[32px] items-center gap-1 text-left hover:text-ink" onClick={() => onSort?.(col.sortKey)} aria-label={`Sort by ${col.h}`}>{col.h}{sortKey === col.sortKey && <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>}</button> : col.h}</th>)}</tr></thead>
      <tbody>{rows.map((row: any, index: number) =>
        <tr key={index} onClick={() => onRow?.(row)} className="border-t border-line hover:bg-paper">
          {cols.map((col: any) => <td key={col.h} className="px-3 py-3 align-middle">{col.f(row)}</td>)}
        </tr>
      )}</tbody>
    </table>
  </div>;
}

export const Timeline = ({ items }: any) =>
  <ol className="grid grid-cols-3 gap-2">
    {items.map((item: any, index: number) =>
      <li key={index} className="min-w-0">
        <div className={`mb-2 h-1 rounded ${item[1] === "done" ? "bg-accent" : item[1] === "current" ? "bg-g2" : "bg-line"}`} />
        <div className={`text-xs font-semibold sm:text-sm ${item[1] === "current" ? "text-g1" : "text-mute"}`}>{item[0]}</div>
      </li>
    )}
  </ol>;

export const Meter = ({ v }: any) =>
  <div>
    <div className="h-2 overflow-hidden rounded bg-line" role="meter" aria-label="Detection confidence" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded bg-g2" style={{ width: `${v}%` }} />
    </div>
    <span className="mt-1 block font-mono text-xs text-mute">{v}% confidence</span>
  </div>;

export function NdviScale({ v }: any) {
  const p = Math.min(100, Math.max(0, (v + 1) * 50));
  return <div>
    <div className="relative h-3 rounded" style={{ background: "linear-gradient(90deg,#9B2226,#F4B942,#74C69D,#1B4332)" }}>
      <span className="absolute -top-1 h-5 w-1 bg-ink" style={{ left: `${p}%` }} />
    </div>
    <div className="flex justify-between font-mono text-xs text-mute"><span>-1</span><span>ΔNDVI {Number(v).toFixed(2)}</span><span>+1</span></div>
  </div>;
}

export const Disclaimer = () =>
  <p className="my-3 border-l-4 border-gov bg-[#F2F5F9] px-3 py-2 text-xs leading-relaxed text-mute">
    AI-assisted preliminary indication only. This is not a legal determination; official verification is required.
  </p>;

export function EvidencePanel({ d }: any) {
  if (!d) return <SkeletonLoader />;
  const gis = d.gis;
  return <div>
    <p className="text-xs font-bold uppercase tracking-wider text-mute">Preliminary satellite finding</p>
    <h3 className="mt-1 text-xl font-bold">{d.change_type}</h3>
    <div className="my-3 flex flex-wrap gap-2"><RiskBadge level={d.risk_level} /><StatusBadge status={d.status} /></div>
    <p className="mb-4 font-mono text-xs text-mute">CASE-{d.id} · {d.area_hectares} ha · score {d.risk_score}</p>
    <Meter v={d.confidence} />
    <h4 className="mt-5 font-bold">Why this was flagged</h4>
    <p className="mt-1 text-sm leading-relaxed text-mute">{d.why_flagged}</p>
    <div className="my-4"><NdviScale v={d.ndvi_difference} /></div>
    {gis && <><h4 className="font-bold">GIS context</h4><p className="mt-1 text-sm leading-relaxed text-mute">{gis.explanation}</p></>}
    <Disclaimer />
  </div>;
}
