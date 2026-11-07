import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, API, download, role } from "../api";
import MapView from "../MapView";
import {
  Button,
  FormField,
  FileUploader,
  PlainLanguageAiCard,
  AttentionBadge,
  StatusBadge,
  SkeletonLoader,
  Disclaimer,
} from "../ui";
import {
  IconShieldCheck,
  IconSatellite,
  IconMapSheet,
  IconFileDoc,
  IconPin,
  IconGovPillar,
} from "../icons";

const OFFICER_DECISIONS = [
  "Legal / Permitted",
  "Potential Violation",
  "False Alarm",
  "Need More Checking",
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentRole = role();

  const [detection, setDetection] = useState<any>(null);
  const [officerCase, setOfficerCase] = useState<any>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const [view, setView] = useState("after"); // 'before' | 'after'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [decision, setDecision] = useState(OFFICER_DECISIONS[1]); // 'Potential Violation'
  const [remarks, setRemarks] = useState("");
  const [fieldPhoto, setFieldPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [decisionSubmitted, setDecisionSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.allSettled([
      api.get(`/api/change-detections/${id}`),
      api.get("/api/officer/cases"),
      api.get("/api/scenes"),
    ])
      .then(([detRes, caseRes, sceneRes]) => {
        if (detRes.status === "fulfilled") {
          setDetection(detRes.value.data);
        } else {
          setError("Could not load case observation.");
        }

        if (caseRes.status === "fulfilled" && Array.isArray(caseRes.value.data)) {
          const matched = caseRes.value.data.find(
            (c: any) => String(c.id) === String(id) || String(c.case_id) === String(id)
          );
          if (matched) {
            setOfficerCase(matched);
            if (matched.decision) {
              setDecision(matched.decision);
              setRemarks(matched.remarks || "");
            }
          }
        }

        if (sceneRes.status === "fulfilled") {
          setScenes(Array.isArray(sceneRes.value.data) ? sceneRes.value.data : []);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmitDecision = async () => {
    if (!remarks.trim()) {
      setError("Please add an officer verification remark before submitting.");
      return;
    }
    if (!officerCase?.case_id) {
      setError("Associated case identifier missing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.patch(`/api/officer/cases/${officerCase.case_id}/decision`, {
        decision,
        remarks: remarks.trim(),
      });

      if (fieldPhoto) {
        try {
          const fd = new FormData();
          fd.append("f", fieldPhoto);
          await api.post(`/api/officer/cases/${officerCase.case_id}/field-report`, fd);
        } catch {
          // non-blocking
        }
      }

      setDecisionSubmitted(true);
      const updated = await api.get(`/api/officer/cases/${officerCase.case_id}`);
      setOfficerCase(updated.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not record decision. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <SkeletonLoader />
      </main>
    );
  }

  if (!detection) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-base font-bold text-red">Case #{id} could not be located in register.</p>
        <Link to="/officer" className="mt-4 inline-block text-xs font-bold text-g2 underline">
          Return to Officer Cases
        </Link>
      </main>
    );
  }

  const scene = scenes.find((s) => s.image_type === view);
  const petition = officerCase?.petition;

  return (
    <main className="page-enter mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Top Breadcrumb & Status Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#D8D2C4]">
        <div className="flex items-center gap-2">
          <Link
            to={currentRole === "officer" || currentRole === "admin" ? "/officer" : "/map"}
            className="text-xs font-bold text-g2 hover:underline"
          >
            ← {currentRole === "officer" || currentRole === "admin" ? "Officer Queue" : "Observation Map"}
          </Link>
          <span className="text-mute font-mono">/</span>
          <span className="font-mono text-xs font-extrabold text-ink">
            CASE-{officerCase?.case_id || detection.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AttentionBadge level={detection.risk_level} />
          <StatusBadge status={officerCase?.case_status || detection.status} />
          {officerCase?.case_id && (
            <Button
              v="ghost"
              className="!min-h-[34px] !px-3 text-xs gap-1.5"
              onClick={() =>
                download(`/api/reports/${officerCase.case_id}/pdf`, `case_${officerCase.case_id}.pdf`)
              }
            >
              <IconFileDoc size={14} />
              <span>Audit PDF</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-red/30 bg-[#FFF5F3] px-4 py-3 text-xs text-red font-medium">
          {error}
        </div>
      )}

      {/* DECISION SUBMITTED CONFIRMATION BANNER */}
      {decisionSubmitted && (
        <div className="mb-6 rounded-[8px] border border-g2/40 bg-[#EFF7F0] p-4 text-g1 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="text-g2 mt-0.5">
              <IconShieldCheck size={18} />
            </span>
            <div>
              <p className="text-sm font-extrabold text-g1">
                Official Determination Recorded & Citizen Notified
              </p>
              <p className="text-xs text-[#28573B] mt-0.5">
                Outcome: <b>"{decision}"</b>. Citizen tracking status updated in live register.
              </p>
            </div>
          </div>
          <Button
            v="ghost"
            className="!min-h-[30px] !px-2.5 text-xs font-bold border-g2/30"
            onClick={() => setDecisionSubmitted(false)}
          >
            Close
          </Button>
        </div>
      )}

      {/* ALL-IN-ONE CASE REVIEW (NO BOX OVERLOAD) */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT COLUMN: Satellite Observation & AI Analysis */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[10px] border border-[#CBD8CC] bg-white shadow-sm">
            <div className="p-3.5 border-b border-line bg-[#F8F6F0] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IconSatellite size={16} className="text-g1" />
                <span className="text-xs font-bold text-ink">Remote Sensing Comparison</span>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-[6px] border border-line">
                <Button
                  v={view === "before" ? "primary" : "ghost"}
                  className="!min-h-[28px] !px-2.5 text-xs capitalize"
                  onClick={() => setView("before")}
                >
                  Baseline
                </Button>
                <Button
                  v={view === "after" ? "primary" : "ghost"}
                  className="!min-h-[28px] !px-2.5 text-xs capitalize"
                  onClick={() => setView("after")}
                >
                  Recent Pass
                </Button>
              </div>
            </div>

            <div className="relative h-[320px] sm:h-[380px]">
              <MapView
                dets={[detection]}
                selected={detection.id}
                overlay={scene ? { url: API + scene.preview, bounds: scene.bounds } : undefined}
              />
              <div className="absolute bottom-2 left-2 z-[500] bg-white/95 border border-line rounded px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
                Optical Frame: <span className="capitalize text-g2">{view}</span> (Polygon highlighted)
              </div>
            </div>
          </div>

          {/* Plain-Language AI Card (Clean environmental card) */}
          <PlainLanguageAiCard detection={detection} />
        </div>

        {/* RIGHT COLUMN: Citizen Ground Complaint & Officer Action */}
        <div className="space-y-6">
          {/* Citizen Observation */}
          <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-g2 flex items-center gap-1">
                <IconPin size={13} />
                Citizen Observation
              </span>
              {petition?.code && (
                <span className="font-mono text-xs font-bold text-mute bg-[#FAF8F4] px-2 py-0.5 rounded border border-line">
                  {petition.code}
                </span>
              )}
            </div>

            {petition ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-mute block text-[11px]">Reported Disturbance:</span>
                  <p className="text-sm font-bold text-ink mt-0.5">{petition.category}</p>
                </div>

                <div>
                  <span className="text-mute block text-[11px]">Citizen Description:</span>
                  <p className="mt-1 bg-[#FAF8F4] p-3 rounded-[6px] border border-[#DDD8CC] text-ink leading-relaxed">
                    "{petition.description}"
                  </p>
                </div>

                {petition.village_city && (
                  <p className="text-mute text-[11px]">
                    Cadastral: <b>{petition.village_city}, {petition.district}</b>
                  </p>
                )}

                {petition.photo_url && (
                  <div className="pt-2 border-t border-line">
                    <span className="text-mute block mb-1 text-[11px] font-semibold">
                      Citizen Field Photograph:
                    </span>
                    <a
                      href={petition.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block group relative overflow-hidden rounded-[6px] border border-line"
                    >
                      <img
                        src={petition.photo_url}
                        alt="Citizen ground evidence"
                        className="h-40 w-full object-cover group-hover:scale-105 transition"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded">
                        Expand photo ↗
                      </span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-mute py-2">
                Automated detection pass. No citizen complaint is directly attached to this boundary.
              </p>
            )}
          </div>

          {/* OFFICER ACTION PANEL */}
          <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-5 shadow-sm border-t-4 border-t-gov">
            <div className="pb-3 border-b border-line mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gov flex items-center gap-1.5">
                <IconShieldCheck size={14} />
                Field Officer Sign-Off
              </span>
              <h2 className="text-lg font-extrabold text-ink mt-0.5">Record Determination</h2>
            </div>

            {/* Choose Decision */}
            <div className="mb-4">
              <span className="block text-xs font-bold text-ink mb-2">
                Official Case Outcome
              </span>
              <div className="grid grid-cols-2 gap-2">
                {OFFICER_DECISIONS.map((d) => {
                  const isSelected = decision === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDecision(d)}
                      className={`p-2.5 rounded-[6px] border text-xs font-bold text-center transition ${
                        isSelected
                          ? "border-gov bg-[#EBF0F6] text-gov ring-2 ring-gov/20"
                          : "border-[#D6DEC6] bg-[#FAF8F4] text-mute hover:text-ink hover:bg-white"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Remark */}
            <FormField
              label="Officer Inspection Remark (Mandatory)"
              hint="Document ground findings, permit status, or next steps. This is published on the citizen dossier."
            >
              <textarea
                rows={3}
                required
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Site visited. Felling halted. Notice issued under Forest Act section 26..."
                className="w-full text-xs"
              />
            </FormField>

            {/* Field Photo Upload */}
            <FileUploader
              onFile={setFieldPhoto}
              label="Attach Field Inspection Photo (Optional)"
              hint="Upload ground image taken during officer site inspection."
            />

            {fieldPhoto && (
              <p className="text-xs text-g1 font-semibold mb-3">
                ✓ Field photo selected: {fieldPhoto.name}
              </p>
            )}

            <Button
              v="primary"
              className="w-full !min-h-[46px] text-sm font-bold bg-gov hover:bg-[#142640]"
              disabled={saving || !remarks.trim()}
              onClick={handleSubmitDecision}
            >
              {saving ? "Signing and Recording…" : "Submit Official Decision"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
