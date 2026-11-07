import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, role } from "../api";
import MapView, { Legend } from "../MapView";
import { Card, Disclaimer, AttentionBadge } from "../ui";
import {
  IconCanopy,
  IconSearch,
  IconMapSheet,
  IconSatellite,
  IconShieldCheck,
  IconPin,
  IconFileDoc,
  IconGovPillar,
  IconGps,
  TopoLinesGraphic,
} from "../icons";

export default function Landing() {
  const [detections, setDetections] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>();
  const currentRole = role();

  useEffect(() => {
    api
      .get("/api/change-detections")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setDetections(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="page-enter mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* HERO SECTION WITH TOPOGRAPHIC ACCENTS */}
      <section className="relative overflow-hidden rounded-[14px] border border-[#CBD8CC] bg-[#FDFCF9] p-6 sm:p-10 shadow-sm mb-10">
        <TopoLinesGraphic className="absolute -top-16 -right-16 w-[450px] text-g2 pointer-events-none" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[11px] font-semibold text-g2 uppercase tracking-[0.2em]">
                18°33'N 73°51'E · Pune Forest Division
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-g1 leading-[1.12]">
              Safeguard our land. <br />
              <span className="text-g2 font-medium">Verify change with satellite truth.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#4A5950]">
              Report unauthorized tree clearing, quarry excavation, or encroachment in under two minutes.
              Continuous satellite analysis flags spectral disturbances for accountable officer verification.
            </p>

            {/* Primary Action Buttons (Zero emojis, pristine vector iconography) */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/report"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] bg-g1 px-6 font-bold text-white shadow hover:bg-g2 text-sm transition"
              >
                <IconCanopy size={18} />
                <span>Report an Observed Problem</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                to="/track"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] border border-[#C5D0C5] bg-white px-5 font-bold text-ink hover:border-g2 hover:bg-[#F3EFE7] transition text-sm"
              >
                <IconSearch size={17} />
                <span>Track My Report</span>
              </Link>

              <Link
                to="/map"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] border border-[#C5D0C5] bg-white px-4 font-bold text-g2 hover:bg-[#F3EFE7] transition text-sm"
              >
                <IconMapSheet size={17} />
                <span>Public Observation Map</span>
              </Link>
            </div>

            {/* Natural trust indicators */}
            <div className="mt-6 pt-4 border-t border-[#DFE7DF] flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-[#526357]">
              <span className="flex items-center gap-1.5 font-medium">
                <IconGps size={15} className="text-g2" />
                GPS location auto-pin
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <IconSatellite size={15} className="text-g2" />
                Sentinel-2 multispectral index
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <IconShieldCheck size={15} className="text-g2" />
                Officer field sign-off
              </span>
            </div>
          </div>

          {/* SATELLITE RADAR / MAP CARD */}
          <div className="relative overflow-hidden rounded-[10px] border border-[#C2CEC2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 bg-[#F6F4EE]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-xs font-bold text-g1">Active Eco-Surveillance</span>
              </div>
              <Link to="/map" className="text-[11px] font-bold text-g2 hover:underline">
                Explore Layer Map →
              </Link>
            </div>

            <div className="relative h-[280px]">
              <MapView
                dets={detections}
                selected={selected?.id}
                onSelect={(id: number) => setSelected(detections.find((d) => d.id === id))}
              />
              <div className="absolute bottom-2 left-2 z-[500] rounded-[6px] border border-line bg-white/95 p-2 shadow-sm">
                <Legend />
              </div>
            </div>

            {selected && (
              <div className="p-3 border-t border-line bg-white flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-mute">REF: CASE-{selected.id}</span>
                  <p className="font-bold text-ink truncate">{selected.change_type}</p>
                </div>
                <AttentionBadge level={selected.risk_level} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3-STEP FLOW — NATURAL EDITORIAL STRATA (NOT generic boxy tiles) */}
      <section className="py-6 mb-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D8D2C4] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-g2">
              Citizen Reporting Pipeline
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-g1 mt-0.5">
              How Land Change Is Documented
            </h2>
          </div>
          <span className="text-xs text-mute font-medium">Under 2 minutes from start to finish</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="relative border-l-2 border-g2/40 pl-4 py-1">
            <span className="font-mono text-xs font-bold text-g2">01 / LOCATION</span>
            <h3 className="text-base font-bold text-ink mt-1 flex items-center gap-2">
              <IconPin size={17} className="text-g1" />
              Pin Exact Terrain
            </h3>
            <p className="text-xs text-mute mt-1.5 leading-relaxed">
              Use GPS or tap the cadastral map to identify the observed boundary. The system reads coordinates and identifies the local administrative division.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative border-l-2 border-g2/40 pl-4 py-1">
            <span className="font-mono text-xs font-bold text-g2">02 / OBSERVATION</span>
            <h3 className="text-base font-bold text-ink mt-1 flex items-center gap-2">
              <IconCanopy size={17} className="text-g1" />
              Describe Disturbance
            </h3>
            <p className="text-xs text-mute mt-1.5 leading-relaxed">
              Select the primary disturbance category (tree cutting, excavation, or structure) and attach any field photograph as evidentiary context.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative border-l-2 border-g2/40 pl-4 py-1">
            <span className="font-mono text-xs font-bold text-g2">03 / VERIFICATION</span>
            <h3 className="text-base font-bold text-ink mt-1 flex items-center gap-2">
              <IconShieldCheck size={17} className="text-g1" />
              Officer Accountable Action
            </h3>
            <p className="text-xs text-mute mt-1.5 leading-relaxed">
              Receive a formal Petition ID. Multispectral AI pairs your observation with baseline passes; an assigned officer records an on-ground finding.
            </p>
          </div>
        </div>
      </section>

      {/* 3 ROLES (FLUID HORIZONTAL PANELS) */}
      <section className="py-6 border-t border-[#D8D2C4] mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-g2">
              Access Matrix
            </span>
            <h2 className="text-xl font-extrabold text-g1 mt-0.5">Three Focused Workspaces</h2>
          </div>
          {currentRole && (
            <span className="font-mono text-xs font-bold text-gov px-2.5 py-1 rounded bg-[#EAF0F6] border border-[#CBD9E6]">
              {currentRole.toUpperCase()} SESSION
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Citizen Workspace */}
          <div className="rounded-[8px] border border-[#C8D3C8] bg-white p-5 hover:border-g2 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-[6px] bg-[#EAF3EC] text-g1">
                <IconCanopy size={20} />
              </span>
              <span className="text-[10px] font-mono text-mute uppercase">Public</span>
            </div>
            <h3 className="text-base font-bold text-ink">Citizen</h3>
            <p className="text-xs text-mute mt-1 leading-relaxed">
              File localized complaints, attach photos, and check case decisions with only your reference number.
            </p>
            <div className="mt-4 pt-3 border-t border-line flex gap-3 text-xs font-bold text-g2">
              <Link to="/report" className="hover:underline">File Report →</Link>
              <span className="text-mute">·</span>
              <Link to="/track" className="hover:underline">Track Status</Link>
            </div>
          </div>

          {/* Officer Workspace */}
          <div className="rounded-[8px] border border-[#C8D3C8] bg-white p-5 hover:border-gov transition">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-[6px] bg-[#EAF0F6] text-gov">
                <IconShieldCheck size={20} />
              </span>
              <span className="text-[10px] font-mono text-mute uppercase">Enforcement</span>
            </div>
            <h3 className="text-base font-bold text-ink">Field Officer</h3>
            <p className="text-xs text-mute mt-1 leading-relaxed">
              Access the assigned verification queue, inspect multispectral comparisons, and log ground decisions.
            </p>
            <div className="mt-4 pt-3 border-t border-line">
              <Link to="/officer" className="text-xs font-bold text-gov hover:underline">
                Open Verification Queue →
              </Link>
            </div>
          </div>

          {/* Admin Workspace */}
          <div className="rounded-[8px] border border-[#C8D3C8] bg-white p-5 hover:border-g1 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-[6px] bg-[#F4F1EA] text-g1">
                <IconSatellite size={20} />
              </span>
              <span className="text-[10px] font-mono text-mute uppercase">Supervisory</span>
            </div>
            <h3 className="text-base font-bold text-ink">Administration</h3>
            <p className="text-xs text-mute mt-1 leading-relaxed">
              Three-click satellite change detection, study area polygons, officer assignments, and data exports.
            </p>
            <div className="mt-4 pt-3 border-t border-line">
              <Link to="/admin" className="text-xs font-bold text-g1 hover:underline">
                Admin Console →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DIRECT OFFICIAL REDIRECTION STRIP */}
      <section className="rounded-[8px] border border-[#CBD5C8] bg-[#F7F6F1] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-gov mt-0.5 shrink-0">
            <IconGovPillar size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-g1">Looking to file directly on a government grievance portal?</h3>
            <p className="text-xs text-mute mt-0.5">
              Access authenticated links to PARIVESH (Forest), Aaple Sarkar (Municipal), and MahaMining.
            </p>
          </div>
        </div>
        <Link
          to="/official-links"
          className="inline-flex min-h-[38px] items-center rounded-[6px] bg-white border border-[#C5CDC5] px-4 text-xs font-bold text-g1 hover:border-g2 hover:bg-paper transition shrink-0"
        >
          View Department Portals →
        </Link>
      </section>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </main>
  );
}
