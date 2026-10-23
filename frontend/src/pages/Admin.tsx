import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, role } from "../api";
import MapView from "../MapView";
import { Button, Card, EmptyState, RiskBadge, SkeletonLoader, StatusBadge, Table, RISK } from "../ui";
import SatelliteIntelligence from "./SatelliteIntelligence";

export default function Admin() {
  const [summary, setSummary] = useState<any>();
  const [detections, setDetections] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [sortKey, setSortKey] = useState("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const refreshDashboard = () => {
    api.get("/api/admin/dashboard").then(response => setSummary(response.data)).catch(() => setError("Administrator summary could not be refreshed."));
    api.get("/api/change-detections").then(response => setDetections(response.data)).catch(() => setError("Case register could not be refreshed."));
  };

  useEffect(() => {
    if (role() !== "admin") return;
    api.get("/api/admin/dashboard").then(response => setSummary(response.data)).catch(() => setError("Administrator summary is unavailable. Check the backend connection and retry."));
    api.get("/api/change-detections").then(response => setDetections(response.data)).catch(() => setError("Case register is unavailable. Check the backend connection and retry."));
  }, []);

  if (role() !== "admin") return <Navigate to="/login" />;

  const visibleDetections = detections.filter(item =>
    (riskFilter === "All" || item.risk_level === riskFilter) &&
    `CASE-${item.id} ${item.change_type}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const riskOrder: Record<string, number> = { Low: 0, Moderate: 1, High: 2, Critical: 3 };
  const orderedDetections = visibleDetections.slice().sort((a, b) => {
    const aValue = sortKey === "risk_level" ? riskOrder[a.risk_level] : a[sortKey];
    const bValue = sortKey === "risk_level" ? riskOrder[b.risk_level] : b[sortKey];
    const comparison = typeof aValue === "string" ? aValue.localeCompare(bValue) : Number(aValue) - Number(bValue);
    return sortDirection === "asc" ? comparison : -comparison;
  });
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(orderedDetections.length / pageSize));
  const pageRows = orderedDetections.slice((page - 1) * pageSize, page * pageSize);
  const sortCases = (key: string) => {
    if (sortKey === key) setSortDirection(current => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
    setPage(1);
  };

  const exportCsv = () => {
    const rows = [["id", "type", "area_ha", "confidence", "risk", "status"], ...visibleDetections.map(item => [item.id, item.change_type, item.area_hectares, item.confidence, item.risk_level, item.status])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cases.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!summary && !error) return <main className="mx-auto max-w-[1440px] p-5"><SkeletonLoader /></main>;

  return <main className="page-enter mx-auto max-w-[1600px] p-4 sm:p-5">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-gov">Administrative overview</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Monitoring dashboard</h1><p className="mt-1 text-sm text-mute">Case activity and review progress for platform administrators.</p></div>
      <span className="inline-flex items-center gap-2 border border-line bg-white px-3 py-2 text-xs font-bold text-mute"><i className="h-2 w-2 rounded-full bg-accent" />Current case records</span>
    </div>

    {error && <div className="mb-4 flex items-center justify-between gap-3 border border-red/30 bg-[#FFF5F3] px-4 py-3 text-sm text-red" role="alert"><span>{error}</span><button className="font-semibold underline" onClick={() => { setError(""); api.get("/api/admin/dashboard").then(response => setSummary(response.data)).catch(() => setError("Administrator summary is still unavailable.")); api.get("/api/change-detections").then(response => setDetections(response.data)).catch(() => setError("Case register is still unavailable.")); }}>Retry</button></div>}

    {summary && <>
      <SatelliteIntelligence onCreated={refreshDashboard} />
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[["Petitions", summary.petitions, "Citizen reports received"], ["Detected changes", summary.detections, "Preliminary signals"], ["Open cases", summary.open_cases, "Awaiting review"], ["Area flagged", `${summary.total_hectares} ha`, "Across current detections"]].map(([title, value, note]) =>
          <Card key={title} className="border-t-2 border-t-gov p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-mute">{title}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-ink sm:text-3xl">{value}</p>
            <p className="mt-1 text-xs text-mute">{note}</p>
          </Card>
        )}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-3 flex items-start justify-between gap-2"><div><h2 className="text-lg font-bold">Cases by preliminary risk</h2><p className="mt-1 text-xs text-mute">Current recorded case count; not an enforcement statistic.</p></div></div>
          <div className="h-56" role="img" aria-label="Bar chart of recorded cases by preliminary risk level">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(summary.by_risk || {}).map(([name, count]) => ({ name, count }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Cases" radius={[3, 3, 0, 0]}>{Object.keys(summary.by_risk || {}).map(name => <Cell key={name} fill={RISK[name]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="min-h-[260px] overflow-hidden rounded-xl border border-line bg-white shadow-sm"><MapView dets={detections} /></div>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4">
          <div><h2 className="text-lg font-bold">Case register</h2><p className="mt-1 text-xs text-mute">{visibleDetections.length} records shown</p></div>
          <Button v="ghost" className="!min-h-[40px] text-sm" onClick={exportCsv} disabled={!visibleDetections.length}>Export filtered CSV</Button>
        </div>
        <div className="grid gap-3 border-b border-line bg-[#FCFCFA] p-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-xs font-semibold text-mute">Search cases</span><input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Case ID or change type" /></label>
          <label><span className="mb-1 block text-xs font-semibold text-mute">Filter by risk level</span><select value={riskFilter} onChange={event => { setRiskFilter(event.target.value); setPage(1); }}>{["All", "Low", "Moderate", "High", "Critical"].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        {orderedDetections.length ? <>
          <Table rows={pageRows} sortKey={sortKey} sortDirection={sortDirection} onSort={sortCases} cols={[
            { h: "Case", sortKey: "id", f: (item: any) => <Link className="font-mono font-semibold text-gov underline-offset-2 hover:underline" to={`/case/${item.id}`}>CASE-{item.id}</Link> },
            { h: "Change", sortKey: "change_type", f: (item: any) => item.change_type },
            { h: "Area", sortKey: "area_hectares", f: (item: any) => <span className="font-mono">{item.area_hectares} ha</span> },
            { h: "Confidence", sortKey: "confidence", f: (item: any) => <span className="font-mono">{item.confidence}%</span> },
            { h: "Risk", sortKey: "risk_level", f: (item: any) => <RiskBadge level={item.risk_level} /> },
            { h: "Status", sortKey: "status", f: (item: any) => <StatusBadge status={item.status} /> },
          ]} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-3 text-sm">
            <span className="text-xs text-mute">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, orderedDetections.length)} of {orderedDetections.length}</span>
            <div className="flex items-center gap-2"><Button v="ghost" className="!min-h-[36px] !px-3 text-xs" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</Button><span className="font-mono text-xs text-mute">Page {page} of {pageCount}</span><Button v="ghost" className="!min-h-[36px] !px-3 text-xs" disabled={page >= pageCount} onClick={() => setPage(current => current + 1)}>Next</Button></div>
          </div>
        </> : <div className="p-4"><EmptyState>No cases match these filters.</EmptyState></div>}
      </Card>
      <p className="mt-3 text-xs text-mute">Counts reflect records currently stored in this environment. Seeded cases are synthetic; uploaded imagery and evidence remain associated with their source metadata.</p>
    </>}
  </main>;
}
