import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, API, ACTIVITY_TYPES } from "../api";
import MapView, { Legend } from "../MapView";
import { Button, PlainLanguageAiCard } from "../ui";
import {
  IconMapSheet,
  IconSatellite,
  IconPin,
  IconCanopy,
  TopoLinesGraphic,
} from "../icons";

export default function MapDash() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [detections, setDetections] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | undefined>();
  const [view, setView] = useState("none"); // 'none' | 'before' | 'after'
  const [filter, setFilter] = useState("All");
  const [activityFilter, setActivityFilter] = useState("All activities");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get("/api/change-detections"),
      api.get("/api/scenes"),
    ]).then(([detRes, sceneRes]) => {
      if (detRes.status === "fulfilled") {
        const list = Array.isArray(detRes.value.data) ? detRes.value.data : [];
        setDetections(list);
        if (list.length > 0) setSelected(list[0].id);
      }
      if (sceneRes.status === "fulfilled") {
        setScenes(Array.isArray(sceneRes.value.data) ? sceneRes.value.data : []);
      }
      setLoading(false);
    });
  }, []);

  const visibleDetections = useMemo(() => {
    return detections.filter(
      (d) =>
        (filter === "All" || d.risk_level === filter) &&
        (activityFilter === "All activities" || d.activity_type === activityFilter)
    );
  }, [detections, filter, activityFilter]);

  const selectedCase = detections.find((d) => d.id === selected);
  const scene = scenes.find((s) => s.image_type === view);

  return (
    <main className="page-enter mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
      {/* Top Header with Topographic Contour */}
      <div className="relative mb-5 pb-4 border-b border-line overflow-hidden">
        <TopoLinesGraphic className="absolute right-0 top-0 w-80 text-g2 -z-0" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-g2 mb-1">
              <IconMapSheet size={14} />
              <span>Public Cadastral & Satellite Observation Map</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-g1">
              Land Monitoring Map
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Explore active satellite-monitored changes, botanical shifts, and citizen reports across the jurisdiction.
            </p>
          </div>

          {/* Satellite Overlay Layer Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-[8px] border border-line shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-mute px-2 flex items-center gap-1">
              <IconSatellite size={13} className="text-g2" />
              <span>Layer:</span>
            </span>
            {[
              ["none", "Street Map"],
              ["before", "Baseline Satellite"],
              ["after", "Latest Pass"],
            ].map(([val, label]) => (
              <Button
                key={val}
                v={view === val ? "primary" : "ghost"}
                className="!min-h-[32px] !px-2.5 text-xs font-bold"
                onClick={() => setView(val)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Attention Filter Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-mute uppercase tracking-wider">
            Filter Attention:
          </span>
          {["All", "Critical", "High", "Moderate", "Low"].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilter(lvl)}
              className={`rounded-[6px] px-3 py-1 text-xs font-bold transition ${
                filter === lvl
                  ? "bg-g2 text-white shadow-sm"
                  : "border border-line bg-white text-mute hover:text-ink hover:bg-paper"
              }`}
            >
              {lvl === "Moderate" ? "Needs Checking" : lvl === "Low" ? "Normal" : lvl}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-mute">
          Visible Observations: <strong className="text-ink">{visibleDetections.length}</strong>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-mute">Activity:</span>
        {ACTIVITY_TYPES.map((activity) => (
          <button
            key={activity}
            type="button"
            onClick={() => setActivityFilter(activity)}
            className={`rounded-[6px] px-3 py-1 text-xs font-bold transition ${
              activityFilter === activity ? "bg-gov text-white" : "border border-line bg-white text-mute hover:text-ink"
            }`}
          >
            {activity}
          </button>
        ))}
      </div>

      {/* Main Map + Selected Detail View */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* The Map Surface */}
        <div className="rounded-[10px] border border-line bg-white overflow-hidden relative min-h-[480px] sm:min-h-[580px] shadow-sm">
          <div className="absolute inset-0">
            <MapView
              dets={visibleDetections}
              selected={selected}
              onSelect={(id: number) => setSelected(id)}
              overlay={scene ? { url: API + scene.preview, bounds: scene.bounds } : undefined}
            />
          </div>

          {/* Map Legend Floating Ledger */}
          <div className="absolute bottom-3 left-3 z-[500] rounded-[8px] border border-line bg-white/95 p-3 shadow-md max-w-sm backdrop-blur-sm">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-g1 mb-1.5">
              Cadastral Map Legend
            </p>
            <Legend />
            <p className="mt-2 text-[10px] text-mute border-t border-line pt-1.5 leading-tight">
              Green = Normal · Yellow = Needs Checking · Orange = High Attention · Red = Critical
            </p>
          </div>
        </div>

        {/* Selected Observation Column */}
        <div className="space-y-4">
          {selectedCase ? (
            <div className="space-y-3">
              <PlainLanguageAiCard detection={selectedCase} />
              <Link
                to={`/case/${selectedCase.id}`}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[6px] bg-gov px-4 text-xs font-bold text-white hover:bg-[#162942] transition shadow-sm w-full"
              >
                <span>Open Verification Dossier</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="rounded-[10px] border border-line bg-white p-6 text-center shadow-sm">
              <div className="h-10 w-10 rounded-full bg-paper border border-line flex items-center justify-center mx-auto mb-2 text-mute">
                <IconPin size={18} />
              </div>
              <p className="text-sm font-extrabold text-ink">Select an Observation Area</p>
              <p className="text-xs text-mute mt-1">
                Click on any colored polygon marker on the map to review the satellite finding.
              </p>
            </div>
          )}

          {/* Citizen Land Submission Banner */}
          <div className="rounded-[10px] border border-line bg-[#FAF9F5] p-4 shadow-sm relative overflow-hidden">
            <TopoLinesGraphic className="absolute right-0 bottom-0 w-44 text-g2 -z-0 opacity-10" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-g2 mb-1">
                <IconCanopy size={12} />
                <span>Notice Unauthorized Changes?</span>
              </div>
              <h3 className="text-xs font-extrabold text-g1 uppercase tracking-wide">
                Submit a Land Report
              </h3>
              <p className="text-xs text-mute mt-1 mb-3 leading-relaxed">
                Provide GPS coordinates or tap your location. Satellite AI compares baseline spectral imagery and routes evidence directly to verification officers.
              </p>
              <Link
                to="/report"
                className="inline-flex min-h-[38px] items-center justify-center rounded-[6px] bg-g1 px-4 text-xs font-bold text-white hover:bg-g2 shadow-sm w-full transition"
              >
                Report a Problem in &lt; 2 Minutes →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
