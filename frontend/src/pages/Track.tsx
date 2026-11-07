import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, download } from "../api";
import { Button, FormField, StatusBadge, Timeline, Disclaimer } from "../ui";
import {
  IconSearch,
  IconFileDoc,
  IconGovPillar,
  IconShieldCheck,
  TopoLinesGraphic,
} from "../icons";

export default function Track() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [mobile, setMobile] = useState(
    searchParams.get("mobile") || localStorage.getItem("last_mobile") || ""
  );
  const [petition, setPetition] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (targetCode?: string, targetMobile?: string) => {
    const c = (targetCode || code).trim();
    const m = (targetMobile || mobile).trim();

    if (!c || !m) {
      setError("Please enter both Petition ID and registered mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    setPetition(null);

    try {
      const res = await api.get(`/api/petitions/track/${encodeURIComponent(c)}`, {
        params: { mobile: m },
      });
      setPetition(res.data);
      localStorage.setItem("last_mobile", m);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "No record found matching this Petition reference and mobile number. Please check your submission confirmation."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const paramCode = searchParams.get("code");
    const paramMobile = searchParams.get("mobile");
    if (paramCode && paramMobile) {
      setCode(paramCode);
      setMobile(paramMobile);
      handleTrack(paramCode, paramMobile);
    }
  }, [searchParams]);

  const getTimelineStep = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("closed")) return 4;
    if (s.includes("legal") || s.includes("violation") || s.includes("decision") || s.includes("alarm"))
      return 3;
    if (s.includes("officer") || s.includes("verification") || s.includes("field")) return 2;
    if (s.includes("review") || s.includes("ai")) return 1;
    return 0;
  };

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      {/* Title */}
      <div className="mb-6 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D8D2C4] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g2">
            Petition Audit Trail
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1 mt-0.5">
            Track Case Status
          </h1>
        </div>
        <span className="text-xs text-mute font-medium">Cadastral Record Verification</span>
      </div>

      {/* Query Form (Refined field, no heavy box) */}
      <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-5 sm:p-6 mb-8 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Petition Reference ID">
              <input
                type="text"
                required
                placeholder="e.g. PET-2025-00001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-sm font-mono uppercase"
              />
            </FormField>

            <FormField label="Registered Contact Number">
              <input
                type="tel"
                inputMode="tel"
                required
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full text-sm font-mono"
              />
            </FormField>
          </div>

          {error && (
            <div className="rounded-[6px] border border-red/30 bg-[#FFF5F3] px-3.5 py-2.5 text-xs text-red font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCode("PET-2025-00001");
                setMobile("9000000001");
                handleTrack("PET-2025-00001", "9000000001");
              }}
              className="text-xs text-g2 font-semibold hover:underline text-left"
            >
              Autofill demo record (PET-2025-00001)
            </button>

            <Button
              type="submit"
              className="!min-h-[44px] px-6 text-sm font-bold w-full sm:w-auto"
              disabled={loading || !code.trim() || !mobile.trim()}
            >
              <IconSearch size={16} />
              <span>{loading ? "Searching Register…" : "Verify Status"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* PETITION DOSSIER CARD */}
      {petition && (
        <div className="relative overflow-hidden rounded-[12px] border border-[#CBD8CC] bg-white p-6 shadow-sm space-y-6">
          <TopoLinesGraphic className="absolute -top-12 -right-16 w-80 text-g2 pointer-events-none" />

          {/* Dossier Header */}
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-line">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-g2">
                Official Case Record
              </span>
              <h2 className="text-2xl font-extrabold font-mono text-ink mt-0.5">
                {petition.petition_id}
              </h2>
              <p className="text-xs text-[#526357] mt-0.5">
                {petition.village_city}, {petition.district} · {petition.category}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-mute block mb-1">
                Recorded Status
              </span>
              <StatusBadge status={petition.status} />
            </div>
          </div>

          {/* Verification Trail */}
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-mute block mb-2">
              Progress Through Review Pipeline
            </span>
            <div className="rounded-[8px] bg-[#FAF8F4] p-4 border border-[#DCD6C8]">
              <Timeline
                steps={[
                  "Submitted",
                  "Under Review",
                  "With Officer",
                  "Decision Received",
                  "Closed",
                ]}
                currentStep={getTimelineStep(petition.status)}
              />
            </div>
          </div>

          {/* Officer Field Finding Stamp */}
          <div className="relative z-10 rounded-[8px] border border-g2/25 bg-[#EDF4EE] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-g1 flex items-center gap-1.5">
              <IconShieldCheck size={14} />
              Officer Verification Remark
            </span>
            <p className="mt-1.5 text-xs text-[#1F452F] leading-relaxed font-medium">
              "{petition.response}"
            </p>
            {petition.officer_decision && (
              <div className="mt-3 pt-2.5 border-t border-g2/20 flex items-center justify-between text-xs">
                <span className="text-[#2D5A3F] font-semibold">Official Determination:</span>
                <span className="font-bold text-ink px-2.5 py-0.5 rounded bg-white border border-g2/30">
                  {petition.officer_decision}
                </span>
              </div>
            )}
          </div>

          {/* Citizen Logged Observation */}
          <div className="relative z-10 rounded-[8px] border border-[#D5D0C2] bg-[#FAF8F4] p-4 text-xs space-y-2">
            <span className="font-bold text-ink block">Recorded Observation:</span>
            <p className="text-[#4E5B52] leading-relaxed bg-white p-2.5 rounded border border-[#E0DBCF]">
              "{petition.description}"
            </p>
            {petition.photo_url && (
              <div className="pt-2">
                <span className="font-semibold text-mute block mb-1 text-[11px]">
                  Submitted Evidentiary Photograph:
                </span>
                <img
                  src={petition.photo_url}
                  alt="Citizen observation photo"
                  className="h-36 w-auto rounded border border-line object-cover"
                />
              </div>
            )}
          </div>

          {/* Actions & Dates */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line text-xs">
            <span className="text-mute">
              Last updated:{" "}
              <b className="text-ink">
                {petition.updated
                  ? new Date(petition.updated).toLocaleDateString()
                  : "Today"}
              </b>
            </span>

            <div className="flex gap-2">
              {petition.case_id && (
                <Button
                  v="ghost"
                  className="!min-h-[38px] text-xs font-bold"
                  onClick={() =>
                    download(`/api/reports/${petition.case_id}/pdf`, `case_${petition.case_id}.pdf`)
                  }
                >
                  <IconFileDoc size={15} />
                  <span>Download Audit PDF</span>
                </Button>
              )}

              <Link
                to="/official-links"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] bg-[#FAF8F4] border border-[#C5CDC5] px-3.5 text-xs font-bold text-gov hover:bg-white"
              >
                <IconGovPillar size={15} />
                <span>Department Portals →</span>
              </Link>
            </div>
          </div>

          <Disclaimer />
        </div>
      )}

      <div className="mt-6 text-center">
        <Link to="/report" className="text-xs font-bold text-g2 hover:underline">
          + File another observation report
        </Link>
      </div>
    </main>
  );
}
