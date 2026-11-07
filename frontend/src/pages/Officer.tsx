import { useEffect, useState, useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, role } from "../api";
import { Button, AttentionBadge, StatusBadge, EmptyState } from "../ui";
import {
  IconShieldCheck,
  IconSearch,
  IconMapSheet,
  IconFileDoc,
  IconPin,
  TopoLinesGraphic,
} from "../icons";

export default function Officer() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [frequency, setFrequency] = useState({ frequency_minutes: 60, enabled: true });
  const [savingFrequency, setSavingFrequency] = useState(false);
  const navigate = useNavigate();

  const currentRole = role();

  const loadCases = () => {
    setLoading(true);
    setError("");
    api
      .get("/api/officer/cases")
      .then((res) => {
        setCases(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setError("Could not load officer case queue. Please check connection.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentRole === "officer" || currentRole === "admin") {
      loadCases();
      api.get("/api/officer/alerts").then((res) => setAlerts(Array.isArray(res.data) ? res.data : [])).catch(() => {});
      api.get("/api/automatic-review").then((res) => setFrequency(res.data)).catch(() => {});
    }
  }, [currentRole]);

  if (!currentRole || currentRole === "citizen") {
    return <Navigate to="/login" />;
  }

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchFilter =
        filter === "All" ||
        item.risk_level === filter ||
        (filter === "Pending" && !item.decision);
      const matchQuery =
        !query ||
        `CASE-${item.case_id} ${item.change_type} ${item.petition?.code || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [cases, filter, query]);

  const pendingCount = cases.filter((c) => !c.decision).length;
  const criticalCount = cases.filter(
    (c) => c.risk_level === "Critical" || c.risk_level === "High"
  ).length;

  const saveFrequency = async () => {
    setSavingFrequency(true);
    setError("");
    try {
      await api.put("/api/automatic-review", frequency);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not save the acquisition schedule.");
    } finally {
      setSavingFrequency(false);
    }
  };

  return (
    <main className="page-enter mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#D8D2C4] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gov flex items-center gap-1.5">
            <IconShieldCheck size={14} />
            Field Verification Register
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1 mt-0.5">
            Officer Case Queue
          </h1>
          <p className="text-xs text-mute mt-0.5">
            Inspect remote sensing detections and record on-ground enforcement decisions.
          </p>
        </div>

        {/* Counter Indicators */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-[6px] border border-[#CBD8CC] bg-white px-3 py-1 font-semibold text-ink">
            Assigned: <b>{cases.length}</b>
          </span>
          <span className="rounded-[6px] border border-[#EED7B3] bg-[#FCF4E7] px-3 py-1 font-semibold text-[#8A5314]">
            Pending Decision: <b>{pendingCount}</b>
          </span>
          <span className="rounded-[6px] border border-[#F0BCBC] bg-[#FBE8E8] px-3 py-1 font-semibold text-red">
            Critical/High: <b>{criticalCount}</b>
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-red/30 bg-[#FFF5F3] px-4 py-3 text-xs text-red font-medium">
          {error}
        </div>
      )}
      {alerts.length > 0 && (
        <div className="mb-4 rounded-[8px] border border-[#EED7B3] bg-[#FFF9ED] px-4 py-3">
          <p className="text-xs font-extrabold text-[#8A5314]">New automatic review alerts ({alerts.length})</p>
          <p className="mt-1 text-xs text-mute">{alerts[0].message}</p>
        </div>
      )}
      <section className="mb-5 rounded-[8px] border border-[#CBD8CC] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink">Automatic real-satellite fetch</h2>
            <p className="text-xs text-mute">Provider discovery runs once daily after 06:00 IST. This setting controls review checks.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-mute">
              Review interval
              <select
                value={frequency.frequency_minutes}
                onChange={(e) => setFrequency({ ...frequency, frequency_minutes: Number(e.target.value) })}
                className="mt-1 block min-h-[36px] text-sm"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={60}>Every hour</option>
                <option value={360}>Every 6 hours</option>
                <option value={1440}>Once a day</option>
              </select>
            </label>
            <label className="flex min-h-[36px] items-center gap-2 px-2 text-xs font-semibold text-ink">
              <input type="checkbox" checked={frequency.enabled} onChange={(e) => setFrequency({ ...frequency, enabled: e.target.checked })} />
              Enabled
            </label>
            <Button disabled={savingFrequency} onClick={saveFrequency}>{savingFrequency ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5 bg-white p-3 rounded-[8px] border border-[#CBD8CC]">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["All", "Pending", "Critical", "High", "Moderate", "Low"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? "bg-gov text-white font-bold shadow-sm"
                  : "border border-line bg-[#FAF8F4] text-mute hover:text-ink hover:bg-white"
              }`}
            >
              {f === "Pending" ? "Awaiting Decision" : f}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="search"
            placeholder="Search case # or type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs !min-h-[36px]"
          />
        </div>
      </div>

      {/* Cases Queue List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-mute">Loading case register…</div>
      ) : filteredCases.length === 0 ? (
        <EmptyState icon={<IconFileDoc size={28} />}>
          <p className="font-bold text-ink">No cases matching this criteria.</p>
          <p className="text-xs text-mute mt-1">Adjust filters or search parameters above.</p>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((item) => {
            const hasDecision = Boolean(item.decision);
            return (
              <div
                key={item.case_id}
                className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 sm:p-5 hover:border-g2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-extrabold text-gov">
                      CASE-{item.case_id}
                    </span>
                    <AttentionBadge level={item.risk_level} />
                    <StatusBadge status={item.case_status} />
                    {item.petition?.code && (
                      <span className="text-[11px] font-mono text-mute bg-[#FAF8F4] border border-line rounded px-1.5 py-0.5">
                        {item.petition.code}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-ink">
                    {item.activity_type || item.change_type}
                  </h3>

                  <p className="text-xs text-mute mt-1">
                    Disturbed Area: <b>{item.area_hectares ?? 2.8} ha</b> · Algorithm Confidence:{" "}
                    <b>{item.confidence ?? 86}%</b>
                  </p>

                  {item.petition?.description && (
                    <p className="text-xs text-[#475569] mt-2 line-clamp-1 italic bg-[#FAF8F4] p-2 rounded border border-[#E2DDCF]">
                      Citizen observation: "{item.petition.description}"
                    </p>
                  )}

                  {hasDecision && (
                    <div className="mt-2 text-xs text-g1 font-semibold flex items-center gap-1.5">
                      <span className="text-g2">✓</span> Decision Recorded: <b>{item.decision}</b>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex sm:flex-col gap-2">
                  <Button
                    v={hasDecision ? "ghost" : "primary"}
                    className="!min-h-[40px] text-xs font-bold w-full sm:w-auto"
                    onClick={() => navigate(`/case/${item.id}`)}
                  >
                    {hasDecision ? "Review Dossier →" : "Review & Decide →"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
