import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, API, download, role } from "../api";
import MapView from "../MapView";
import { Button, Card, EmptyState, EvidencePanel, FileUploader, FormField, RiskBadge, StatusBadge } from "../ui";

const DECISIONS = ["Legal / Permitted Change", "Potential Violation", "False Positive", "Needs More Evidence", "Closed"];
const riskOrder: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };

export default function Officer() {
  const [cases, setCases] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>();
  const [caseEvidence, setCaseEvidence] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [view, setView] = useState("after");
  const [form, setForm] = useState<any>({ decision: DECISIONS[3], remarks: "", permit_reference: "", recommended_action: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectCase = (item: any) => {
    setSelected(item);
    setForm({
      decision: item?.decision || DECISIONS[3],
      remarks: item?.remarks || "",
      permit_reference: item?.permit_reference || "",
      recommended_action: item?.recommended_action || "",
    });
    setError("");
  };

  const loadCases = () => api.get("/api/officer/cases").then(response => {
    setCases(response.data);
    const current = response.data.find((item: any) => item.case_id === selected?.case_id) || response.data[0];
    if (current) selectCase(current);
  }).catch(() => setError("Unable to load the officer case queue. Please try again."));

  useEffect(() => {
    if (!role()) return;
    loadCases();
    api.get("/api/scenes").then(response => setScenes(response.data)).catch(() => setError("Satellite scene metadata is temporarily unavailable."));
  }, []);

  useEffect(() => {
    if (!selected?.case_id) { setCaseEvidence([]); return; }
    api.get(`/api/admin/cases/${selected.case_id}/evidence`)
      .then(response => setCaseEvidence(response.data))
      .catch(() => setError("Could not load collected evidence for this case."));
  }, [selected?.case_id]);

  const visibleCases = useMemo(() => cases
    .filter(item => riskFilter === "All" || item.risk_level === riskFilter)
    .sort((a, b) => (riskOrder[a.risk_level] ?? 4) - (riskOrder[b.risk_level] ?? 4)), [cases, riskFilter]);

  if (!role() || role() === "citizen") return <Navigate to="/login" />;
  const scene = scenes.find(item => item.image_type === view);
  const setField = (key: string) => (event: any) => setForm((current: any) => ({ ...current, [key]: event.target.value }));
  const needsPermit = form.decision === DECISIONS[0];
  const needsAction = form.decision === DECISIONS[1];
  const canSave = Boolean(selected && form.remarks.trim() && (!needsPermit || form.permit_reference.trim()) && (!needsAction || form.recommended_action.trim()));

  async function saveDecision() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/api/officer/cases/${selected.case_id}/decision`, form);
      setMessage("Decision saved and recorded.");
      setConfirmOpen(false);
      await loadCases();
    } catch (saveError: any) {
      setError(saveError.response?.data?.detail || "Could not save the decision. Please review the required fields and try again.");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFieldPhoto(file: File) {
    if (!file || !selected) return;
    setError("");
    try {
      const data = new FormData();
      data.append("f", file);
      await api.post(`/api/officer/cases/${selected.case_id}/field-report`, data);
      setMessage("Field photo uploaded.");
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.detail || "Could not upload the field photo.");
    }
  }

  return <main className="page-enter mx-auto max-w-[1600px] p-4 sm:p-5">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-gov">Officer workspace</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Verification queue</h1><p className="mt-1 text-sm text-mute">Review evidence and record reasoned, accountable case decisions.</p></div>
      <div className="flex gap-2 text-xs"><span className="rounded border border-line bg-white px-3 py-2 text-mute">Assigned <b className="ml-1 text-ink">{cases.length}</b></span><span className="rounded border border-[#F4B942] bg-[#FFF9E9] px-3 py-2 text-[#6B4B00]">High priority <b className="ml-1">{cases.filter(item => ["High", "Critical"].includes(item.risk_level)).length}</b></span></div>
    </div>

    {error && <div className="mb-4 flex items-center justify-between gap-2 rounded border border-red/30 bg-[#FFF5F3] px-3 py-2 text-sm text-red" role="alert"><span>{error}</span><button className="font-semibold underline" onClick={() => setError("")}>Dismiss</button></div>}
    {message && <div className="mb-4 rounded border border-g2/30 bg-[#EFF7F0] px-3 py-2 text-sm text-g1" role="status">{message}</div>}

    <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-line p-4">
          <div className="flex items-center justify-between"><h2 className="font-bold text-ink">Priority queue</h2><span className="font-mono text-xs text-mute">{visibleCases.length}</span></div>
          <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-mute">Filter by risk</span><select value={riskFilter} onChange={event => setRiskFilter(event.target.value)}>{["All", "Critical", "High", "Moderate", "Low"].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="max-h-[42vh] space-y-2 overflow-y-auto bg-[#FCFCFA] p-3 xl:max-h-[calc(100vh-300px)]">
          {visibleCases.length === 0 ? <EmptyState>No cases in this queue.</EmptyState> : visibleCases.map(item =>
            <button key={item.case_id} onClick={() => selectCase(item)} aria-pressed={selected?.case_id === item.case_id} className={`w-full rounded-lg border bg-white p-3 text-left transition hover:border-gov hover:shadow-sm ${selected?.case_id === item.case_id ? "border-gov ring-1 ring-gov/20" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-mute">CASE-{item.case_id}</span><RiskBadge level={item.risk_level} /></div>
              <p className="mt-2 text-sm font-bold text-ink">{item.change_type}</p>
              <p className="mt-1 text-xs text-mute">Risk score {item.risk_score}</p>
              <div className="mt-2"><StatusBadge status={item.case_status} /></div>
            </button>
          )}
        </div>
      </aside>

      {selected ? <>
        <section className="space-y-4">
          <div className="relative h-[340px] overflow-hidden rounded-xl border border-line bg-white sm:h-[420px]">
            <div className="absolute right-3 top-3 z-[500] flex gap-1 rounded-md border border-line bg-white p-1 shadow-sm">
              {["before", "after"].map(value => <Button key={value} v={view === value ? "primary" : "ghost"} className="!min-h-[36px] capitalize !px-3 text-xs" onClick={() => setView(value)} aria-pressed={view === value}>{value}</Button>)}
            </div>
            <MapView dets={[selected]} selected={selected.id} overlay={scene && { url: API + scene.preview, bounds: scene.bounds }} />
          </div>
          <Card><EvidencePanel d={selected} />
            {selected.petition && <div className="mt-4 border-t border-line pt-4 text-sm"><p className="font-bold text-ink">Citizen petition · {selected.petition.code}</p><p className="mt-2 leading-relaxed text-mute">{selected.petition.description}</p><p className="mt-2 text-xs text-mute">Citizen-submitted allegation; not a verified fact.</p></div>}
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-bold text-ink">Collected case evidence</h2><span className="font-mono text-xs text-mute">{caseEvidence.length} files</span></div>
            {caseEvidence.length ? <ul className="divide-y divide-line">{caseEvidence.map((item: any) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{item.original_filename}</p><p className="mt-1 text-xs text-mute">{item.evidence_type} · {item.captured_at || "Capture date not supplied"} · {item.uploader_name || "Admin uploader"}</p>{item.latitude != null && <p className="mt-1 font-mono text-[10px] text-mute">{Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</p>}</div>
              <Button v="ghost" className="!min-h-[36px] !px-3 text-xs" onClick={() => download(`/api/admin/evidence/${item.id}/download`, item.original_filename)}>Download</Button>
            </li>)}</ul> : <EmptyState>No additional admin evidence has been attached to this case.</EmptyState>}
          </Card>
        </section>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wider text-gov">Official record</p><h2 className="mb-4 mt-1 text-xl font-extrabold">Officer decision</h2>
          <FormField label="Decision"><select value={form.decision} onChange={setField("decision")}>{DECISIONS.map(value => <option key={value}>{value}</option>)}</select></FormField>
          <FormField label="Reason / remarks" hint="Record the basis for this decision. A reason is required for every outcome.">
            <textarea rows={4} maxLength={2000} value={form.remarks} onChange={setField("remarks")} placeholder="Summarise evidence reviewed and the reason for this outcome…" />
            <span className="mt-1 block text-right font-mono text-xs text-mute">{form.remarks.length}/2000</span>
          </FormField>
          {needsPermit && <FormField label="Permit / record reference (required)"><input value={form.permit_reference} onChange={setField("permit_reference")} placeholder="Enter the official reference" /></FormField>}
          {needsAction && <FormField label="Recommended department action (required)"><input value={form.recommended_action} onChange={setField("recommended_action")} placeholder="Describe the recommended next step" /></FormField>}
          <FileUploader label="Field photo (optional)" onFile={uploadFieldPhoto} />
          <p className="mb-3 text-xs leading-relaxed text-mute">Save will attach your name, decision, reason and timestamp to the official case record.</p>
          <Button className="w-full" disabled={!canSave || saving} onClick={() => setConfirmOpen(true)}>{saving ? "Saving…" : "Review and save decision"}</Button>
          {!canSave && <p className="mt-2 text-xs text-mute">Enter a reason{needsPermit ? " and permit/record reference" : needsAction ? " and recommended action" : ""} to continue.</p>}
          <Button v="ghost" className="mt-2 w-full" onClick={() => download(`/api/reports/${selected.case_id}/pdf`, `case_${selected.case_id}.pdf`)}>Download PDF report</Button>
        </Card>
      </> : <div className="xl:col-span-2"><EmptyState>No cases are assigned to this account.</EmptyState></div>}
    </div>

    {confirmOpen && selected && <div className="fixed inset-0 z-[1500] grid place-items-center bg-ink/50 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="decision-confirm-title" className="w-full max-w-lg rounded-xl border border-line bg-white p-5 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wider text-gov">Confirm official action</p>
        <h2 id="decision-confirm-title" className="mt-1 text-xl font-extrabold">Record this decision?</h2>
        <p className="mt-3 text-sm leading-relaxed text-mute">You are recording <b className="text-ink">{form.decision}</b> for <b className="text-ink">CASE-{selected.case_id}</b>. This becomes part of the case record.</p>
        <div className="mt-3 border-l-2 border-gov bg-paper p-3 text-sm leading-relaxed text-ink">{form.remarks}</div>
        <div className="mt-5 flex justify-end gap-2"><Button v="ghost" disabled={saving} onClick={() => setConfirmOpen(false)}>Go back</Button><Button disabled={saving} onClick={saveDecision}>{saving ? "Saving…" : "Confirm decision"}</Button></div>
      </section>
    </div>}
  </main>;
}
