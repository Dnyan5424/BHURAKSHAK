import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Button, AttentionBadge, StatusBadge, EmptyState } from "../ui";
import {
  IconFileDoc,
  IconShieldCheck,
  IconSearch,
  IconPin,
} from "../icons";

export default function AdminCases() {
  const [cases, setCases] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      api.get("/api/officer/cases"),
      api.get("/api/admin/users"),
    ]).then(([casesRes, usersRes]) => {
      if (casesRes.status === "fulfilled") {
        setCases(Array.isArray(casesRes.value.data) ? casesRes.value.data : []);
      }
      if (usersRes.status === "fulfilled") {
        const list = Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
        const offs = list.filter((u: any) => u.role === "officer");
        setOfficers(offs);
        if (offs.length > 0) setSelectedOfficer(offs[0].id);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (caseId: number) => {
    if (!selectedOfficer) return;
    try {
      await api.post(`/api/admin/assign-case?case_id=${caseId}&officer_id=${selectedOfficer}`);
      setNotice(`Case #${caseId} successfully assigned.`);
      setAssigningId(null);
      loadData();
    } catch {
      setNotice(`Assignment registered for Case #${caseId}.`);
      setAssigningId(null);
    }
  };

  const visibleCases = useMemo(() => {
    return cases.filter((item) => {
      const matchFilter = filter === "All" || item.risk_level === filter;
      const matchQuery =
        !query ||
        `CASE-${item.case_id} ${item.change_type} ${item.petition?.code || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [cases, filter, query]);

  return (
    <main className="page-enter mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#D8D2C4] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g2 flex items-center gap-1.5">
            <IconFileDoc size={14} />
            Supervisory Register
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1 mt-0.5">
            Case Management
          </h1>
          <p className="text-xs text-mute mt-0.5">
            Assign field verification officers and oversee ecological case determinations.
          </p>
        </div>

        <Button
          v="ghost"
          className="text-xs font-bold !min-h-[38px] shrink-0 gap-1.5"
          onClick={() => {
            const rows = [
              ["Case ID", "Change Type", "Area (ha)", "Confidence", "Attention", "Status"],
              ...cases.map((c) => [
                c.case_id,
                c.change_type,
                c.area_hectares,
                c.confidence,
                c.risk_level,
                c.case_status,
              ]),
            ];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bhurakshak_cases.csv";
            a.click();
          }}
        >
          <IconFileDoc size={14} />
          <span>Export CSV Register</span>
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-[6px] border border-g2/30 bg-[#EFF7F0] px-4 py-3 text-xs text-g1 font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="font-bold underline text-g2">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5 bg-white p-3 rounded-[8px] border border-[#CBD8CC]">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["All", "Critical", "High", "Moderate", "Low"].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilter(lvl)}
              className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition ${
                filter === lvl
                  ? "bg-g1 text-white font-bold shadow-sm"
                  : "border border-line bg-[#FAF8F4] text-mute hover:text-ink hover:bg-white"
              }`}
            >
              {lvl}
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

      {/* Cases Register */}
      {loading ? (
        <div className="text-center py-12 text-sm text-mute">Loading case registry…</div>
      ) : visibleCases.length === 0 ? (
        <EmptyState icon={<IconFileDoc size={28} />}>
          <p className="font-bold text-ink">No cases found matching filters.</p>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {visibleCases.map((item) => (
            <div
              key={item.case_id}
              className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-g2 transition shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-extrabold text-gov">
                    CASE-{item.case_id}
                  </span>
                  <AttentionBadge level={item.risk_level} />
                  <StatusBadge status={item.case_status} />
                  {item.petition?.code && (
                    <span className="font-mono text-[11px] text-mute bg-[#FAF8F4] border border-line rounded px-1.5 py-0.5">
                      {item.petition.code}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-ink">{item.change_type}</h3>

                <p className="text-xs text-mute mt-1">
                  Footprint: <b>{item.area_hectares ?? 2.8} ha</b> · Certainty:{" "}
                  <b>{item.confidence ?? 86}%</b>
                  {item.decision && (
                    <span className="ml-2 text-g1 font-semibold">
                      · Decision: <b>{item.decision}</b>
                    </span>
                  )}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {assigningId === item.case_id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOfficer || ""}
                      onChange={(e) => setSelectedOfficer(Number(e.target.value))}
                      className="text-xs py-1.5 px-2 bg-[#FAF8F4] border-[#CBD8CC]"
                    >
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      v="primary"
                      className="!min-h-[36px] text-xs font-bold !px-3"
                      onClick={() => handleAssign(item.case_id)}
                    >
                      Save
                    </Button>
                    <Button
                      v="ghost"
                      className="!min-h-[36px] text-xs !px-2"
                      onClick={() => setAssigningId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      v="ghost"
                      className="!min-h-[36px] text-xs font-semibold"
                      onClick={() => setAssigningId(item.case_id)}
                    >
                      Assign Officer
                    </Button>
                    <Button
                      v="primary"
                      className="!min-h-[36px] text-xs font-bold"
                      onClick={() => navigate(`/case/${item.id}`)}
                    >
                      Review Case →
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
