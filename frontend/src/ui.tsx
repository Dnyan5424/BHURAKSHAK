import { useState, ReactNode } from "react";
import {
  IconShieldCheck,
  IconGovPillar,
  IconSearch,
  IconSatellite,
  IconCanopy,
  IconRiver,
  IconStrata,
  IconStructure,
  IconBoundary,
  IconLeaf,
  TopoLinesGraphic,
} from "./icons";

export const ATTENTION_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Low: { bg: "#EAF3EC", text: "#183D2B", dot: "#2D6A4F", label: "Normal" },
  Normal: { bg: "#EAF3EC", text: "#183D2B", dot: "#2D6A4F", label: "Normal" },
  Moderate: { bg: "#FBF5E8", text: "#8A5314", dot: "#C07D2B", label: "Needs Checking" },
  "Needs Checking": { bg: "#FBF5E8", text: "#8A5314", dot: "#C07D2B", label: "Needs Checking" },
  High: { bg: "#FAECE6", text: "#9C3C24", dot: "#D9532F", label: "High Attention" },
  "High Attention": { bg: "#FAECE6", text: "#9C3C24", dot: "#D9532F", label: "High Attention" },
  Critical: { bg: "#F8E7E7", text: "#8F2424", dot: "#9B2226", label: "Critical Priority" },
};

export const RISK: Record<string, string> = {
  Low: "#2D6A4F",
  Moderate: "#C07D2B",
  High: "#D9532F",
  Critical: "#9B2226",
};

export function Button({
  v = "primary",
  className = "",
  type = "button",
  ...props
}: any) {
  const variants: Record<string, string> = {
    primary:
      "bg-g1 text-white hover:bg-g2 shadow-[0_2px_8px_rgba(27,67,50,0.18)] active:translate-y-0.5 border border-g1",
    secondary:
      "bg-gov text-white hover:bg-[#13243C] shadow-sm active:translate-y-0.5 border border-gov",
    danger:
      "bg-red text-white hover:bg-[#7E1A1D] shadow-sm active:translate-y-0.5 border border-red",
    ghost:
      "border border-line bg-white/90 text-ink hover:border-g2 hover:bg-[#F2EFE8] active:bg-paper",
    subtle:
      "bg-[#EAF1EB] text-g1 hover:bg-[#D8E6DB] border border-transparent font-bold",
  };

  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[8px] px-4 py-2 font-semibold text-sm transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none ${
        variants[v] || variants.ghost
      } ${className}`}
    />
  );
}

// Environmental Panel (replaces heavy repetitive boxed cards with natural stone surfaces)
export const Card = ({ children, className = "", natural = false }: any) => (
  <section
    className={`rounded-[10px] border border-line bg-white transition-shadow duration-200 ${
      natural ? "bg-[#FBF9F5] shadow-[0_1px_4px_rgba(35,45,38,0.03)]" : "shadow-[0_2px_12px_rgba(35,45,38,0.04)]"
    } ${className}`}
  >
    {children}
  </section>
);

export const AttentionBadge = ({ level }: { level?: string }) => {
  const norm = level || "Moderate";
  const item = ATTENTION_COLORS[norm] || ATTENTION_COLORS.Moderate;
  return (
    <span
      style={{ backgroundColor: item.bg, color: item.text }}
      className="inline-flex items-center gap-1.5 rounded-full border border-black/5 px-2.5 py-0.5 text-[11px] font-bold leading-none tracking-wide"
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: item.dot }}
      />
      {item.label}
    </span>
  );
};

export const RiskBadge = ({ level }: { level?: string }) => (
  <AttentionBadge level={level} />
);

export const StatusBadge = ({ status }: { status?: string }) => {
  const s = status || "Submitted";
  let theme = "bg-[#F4F1EA] text-[#334155] border-[#DDD8CC]";
  if (s.includes("Closed") || s.includes("Legal")) {
    theme = "bg-[#ECF5EE] text-g1 border-[#BFD9C5]";
  } else if (s.includes("Violation") || s.includes("Critical")) {
    theme = "bg-[#FBE8E8] text-red border-[#F0BCBC]";
  } else if (s.includes("Review") || s.includes("Verification")) {
    theme = "bg-[#FCF4E7] text-[#8A5314] border-[#EED7B3]";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight ${theme}`}
    >
      {s}
    </span>
  );
};

export const FormField = ({ label, children, hint, error }: any) => (
  <label className="mb-4 block">
    <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4A574E]">
      {label}
    </span>
    {children}
    {hint && (
      <span className="mt-1 block text-xs leading-relaxed text-mute">{hint}</span>
    )}
    {error && (
      <span className="mt-1 block text-xs font-semibold text-red" role="alert">
        {error}
      </span>
    )}
  </label>
);

export const FileUploader = ({
  onFile,
  label = "Upload Supporting Image",
  hint = "Format: JPG, PNG, WebP or satellite raster. Max 15MB.",
}: any) => (
  <FormField label={label} hint={hint}>
    <input
      type="file"
      accept="image/*,.npz,.tif,.tiff"
      onChange={(event: any) => onFile(event.target.files?.[0])}
      className="block w-full text-xs text-mute file:mr-3 file:rounded-[6px] file:border file:border-line file:bg-[#F2EFE8] file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-g1 hover:file:bg-[#E5E1D5]"
    />
  </FormField>
);

export const EmptyState = ({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) => (
  <div className="rounded-[10px] border border-dashed border-[#CFD8D0] bg-[#FAF8F4] p-8 text-center text-sm leading-relaxed text-mute">
    {icon && <div className="flex justify-center mb-3 text-g2">{icon}</div>}
    {children}
  </div>
);

export const SkeletonLoader = () => (
  <div className="animate-pulse space-y-3" aria-label="Loading observation">
    <div className="h-5 w-1/3 rounded bg-line" />
    <div className="h-4 w-full rounded bg-line" />
    <div className="h-4 w-2/3 rounded bg-line" />
  </div>
);

// Natural Trail Timeline (Replacing rigid square boxes with trail waypoint circles)
export const Timeline = ({
  steps = ["Submitted", "Under Review", "With Officer", "Decision Received", "Closed"],
  currentStep = 0,
}: {
  steps?: string[];
  currentStep?: number;
}) => (
  <div className="w-full py-2">
    <div className="flex items-center justify-between">
      {steps.map((label, idx) => {
        const isDone = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <div key={label} className="flex flex-1 flex-col items-center relative">
            {idx > 0 && (
              <div
                className={`absolute top-3.5 -left-1/2 w-full h-[2px] transition-colors ${
                  isDone || isCurrent ? "bg-g2" : "bg-line"
                }`}
              />
            )}
            <div
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold transition-all duration-200 ${
                isDone
                  ? "bg-g2 text-white shadow-sm"
                  : isCurrent
                  ? "bg-g1 text-accent ring-4 ring-accent/25"
                  : "bg-paper border border-[#CFD8D0] text-mute"
              }`}
            >
              {isDone ? (
                <span className="text-[12px] leading-none font-bold">✓</span>
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`mt-2 text-center text-[10px] sm:text-xs font-semibold leading-tight ${
                isCurrent ? "text-g1 font-extrabold" : isDone ? "text-g2" : "text-mute"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

// Cartographic Legal Disclaimer (Clean surveyor note)
export const Disclaimer = () => (
  <aside className="my-4 flex items-start gap-3 rounded-[8px] border border-[#CBD5E1] bg-[#F7F9FB] p-3.5 text-xs leading-relaxed text-[#334155]">
    <div className="text-gov mt-0.5 shrink-0">
      <IconGovPillar size={18} />
    </div>
    <div>
      <p className="font-bold text-gov">Preliminary Remote Sensing Observation</p>
      <p className="mt-0.5 text-[#475569]">
        This record is an AI-assisted environmental observation. It is not an enforcement decree or legal determination. Verification by an authorized field officer is required.
      </p>
    </div>
  </aside>
);

// Environmental Plain-Language AI Card (Organic design, zero boxes-inside-boxes, no emoji)
export function PlainLanguageAiCard({
  detection,
  hideTechnicalToggle = false,
}: {
  detection: any;
  hideTechnicalToggle?: boolean;
}) {
  const [showTech, setShowTech] = useState(false);
  if (!detection) return <SkeletonLoader />;

  const isForest =
    detection.gis?.near_protected_area ||
    (detection.gis?.distance_to_forest_m != null &&
      detection.gis.distance_to_forest_m < 300);

  const plainTitle = detection.change_type || "Observed Land-Use Disturbance";

  return (
    <div className="relative overflow-hidden rounded-[10px] border border-[#C8D3C8] bg-white p-5 sm:p-6 shadow-sm">
      {/* Background Topo Curve Motif */}
      <TopoLinesGraphic className="absolute -top-10 -right-20 w-80 text-g2 pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 border-b border-line/70 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-g2 flex items-center gap-1.5">
            <IconSatellite size={14} />
            Satellite AI Change Signal
          </span>
          <h3 className="mt-1 text-xl font-extrabold text-g1 tracking-tight">
            {plainTitle}
          </h3>
        </div>
        <AttentionBadge level={detection.risk_level} />
      </div>

      {/* Natural Data Strata (Fluid horizontal environmental readings, NOT boxy tiles) */}
      <div className="relative z-10 my-5 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-mute block">
            Changed Area
          </span>
          <p className="mt-0.5 text-xl font-bold font-mono text-ink">
            {detection.area_hectares ?? 2.8} <span className="text-xs font-normal text-mute">ha</span>
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-mute block">
            System Certainty
          </span>
          <p className="mt-0.5 text-xl font-bold font-mono text-g2">
            {detection.confidence ?? 86}%
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-mute block">
            Near Forest Zone
          </span>
          <p className="mt-1 text-sm font-bold text-ink">
            {isForest ? "Yes (< 300m boundary)" : "No (Outside buffer)"}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-mute block">
            Date Verified
          </span>
          <p className="mt-1 text-xs font-mono font-semibold text-ink">
            {detection.created_at
              ? new Date(detection.created_at).toLocaleDateString()
              : "23 October 2026"}
          </p>
        </div>
      </div>

      {/* Environmental Context Banner */}
      <div className="relative z-10 rounded-[6px] border border-g2/25 bg-[#EDF4EE] p-3.5 text-xs text-g1 leading-relaxed">
        <p className="font-semibold text-g1 mb-0.5">Automated Change Summary</p>
        <p className="text-[#244E36]">
          {detection.why_flagged ||
            "Sudden spectral attenuation observed relative to baseline imagery. Area marked for field verification by the competent local authority."}
        </p>
      </div>

      {/* Progressive Disclosure (Technical Details) */}
      {!hideTechnicalToggle && (
        <div className="relative z-10 mt-4 pt-3 border-t border-line/70">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink transition"
            onClick={() => setShowTech(!showTech)}
          >
            <span>{showTech ? "−" : "+"}</span>
            <span>{showTech ? "Hide Technical Indices & GIS Context" : "See Technical Details (NDVI, Spectral Differences & Distances)"}</span>
          </button>

          {showTech && (
            <div className="mt-3 rounded-[6px] border border-line bg-[#FAF9F6] p-3 text-xs text-ink space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-mute block text-[10px]">ΔNDVI (Vegetation):</span>
                  <b>{detection.ndvi_difference != null ? Number(detection.ndvi_difference).toFixed(3) : "-0.320"}</b>
                </div>
                <div>
                  <span className="text-mute block text-[10px]">ΔNDWI (Water):</span>
                  <b>{detection.ndwi_difference != null ? Number(detection.ndwi_difference).toFixed(3) : "-0.080"}</b>
                </div>
                <div>
                  <span className="text-mute block text-[10px]">ΔNDBI (Built-Up):</span>
                  <b>{detection.ndbi_difference != null ? Number(detection.ndbi_difference).toFixed(3) : "+0.150"}</b>
                </div>
                <div>
                  <span className="text-mute block text-[10px]">ΔBSI (Bare Soil):</span>
                  <b>{detection.bsi_difference != null ? Number(detection.bsi_difference).toFixed(3) : "+0.210"}</b>
                </div>
              </div>
              {detection.evidence_calculations && (
                <div className="border-t border-line/60 pt-2 text-[11px] text-mute">
                  <b className="text-ink">Evidence calculations:</b>{" "}
                  {detection.evidence_calculations.changed_pixels} changed pixels ·{" "}
                  {detection.evidence_calculations.valid_pixel_coverage_percent}% valid coverage ·{" "}
                  {detection.evidence_calculations.cloud_fraction_percent}% cloud estimate
                </div>
              )}

              {detection.gis && (
                <div className="border-t border-line/60 pt-2 text-mute text-[11px] leading-relaxed">
                  <p>
                    <b className="text-ink">GIS Distances:</b> Water: {detection.gis.distance_to_water_m}m · Road: {detection.gis.distance_to_road_m}m · Forest: {detection.gis.distance_to_forest_m}m.
                  </p>
                  {detection.gis.explanation && <p className="mt-1">{detection.gis.explanation}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

export function EvidencePanel({ d }: any) {
  return <PlainLanguageAiCard detection={d} />;
}
