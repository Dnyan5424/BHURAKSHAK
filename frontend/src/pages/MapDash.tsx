
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, API } from "../api";
import MapView, { Legend } from "../MapView";
import {
  Button,
  EmptyState,
  EvidencePanel,
  RiskBadge,
  SkeletonLoader,
  StatusBadge,
} from "../ui";

const riskLevels = ["All", "Low", "Moderate", "High", "Critical"];

const categories = [
  { value: "all", label: "All changes", icon: "🌍" },
  { value: "vegetation-loss", label: "Vegetation loss", icon: "🌳" },
  { value: "mining", label: "Mining & quarrying", icon: "⛏️" },
  { value: "construction", label: "Construction", icon: "🏗️" },
  { value: "water", label: "Water bodies", icon: "💧" },
];

const categoryMatches = (item: any, category: string) => {
  if (category === "all") return true;

  // Adapt these matches to the actual category values returned by your API.
  const type = String(
    item.category ?? item.change_type ?? ""
  ).toLowerCase();

  const aliases: Record<string, string[]> = {
    "vegetation-loss": ["vegetation", "deforestation", "forest", "ndvi"],
    mining: ["mining", "quarry", "excavation"],
    construction: ["construction", "encroachment", "built-up", "built up"],
    water: ["water", "water-body", "water body", "ndwi"],
  };

  return (aliases[category] ?? []).some((word) => type.includes(word));
};

export default function MapDash() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [detections, setDetections] = useState<any[]>();
  const [scenes, setScenes] = useState<any[]>([]);
  const [selected, setSelected] = useState<number>();
  const [risk, setRisk] = useState("All");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(
    searchParams.get("category") || "all"
  );
  const [view, setView] = useState("none");
  const [detail, setDetail] = useState<any>();
  const [error, setError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      api.get("/api/change-detections"),
      api.get("/api/scenes"),
    ]).then(([detectionResult, sceneResult]) => {
      if (!active) return;

      if (detectionResult.status === "fulfilled") {
        const data = Array.isArray(detectionResult.value.data)
          ? detectionResult.value.data
          : [];

        setDetections(data);
      } else {
        setError("Could not load map observations. Please try again.");
      }

      if (sceneResult.status === "fulfilled") {
        setScenes(
          Array.isArray(sceneResult.value.data)
            ? sceneResult.value.data
            : []
        );
      } else {
        setError((previous) =>
          previous
            ? `${previous} Satellite scene metadata is unavailable.`
            : "Satellite scene metadata is temporarily unavailable."
        );
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setDetail(undefined);

    if (selected == null) {
      setLoadingDetail(false);
      return () => {
        active = false;
      };
    }

    setLoadingDetail(true);

    api
      .get(`/api/change-detections/${selected}`)
      .then((response) => {
        if (active) setDetail(response.data);
      })
      .catch(() => {
        if (active) {
          setError("Could not load the selected case evidence.");
        }
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [selected]);

  // Keep category selection in sync with map URL links.
  useEffect(() => {
    const urlCategory = searchParams.get("category") || "all";

    setCategory(
      categories.some((item) => item.value === urlCategory)
        ? urlCategory
        : "all"
    );
  }, [searchParams]);

  const cases = useMemo(
    () =>
      (detections || []).filter((item) => {
        const matchesRisk =
          risk === "All" || item.risk_level === risk;

        const matchesQuery =
          `${item.change_type} CASE-${item.id}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());

        return (
          matchesRisk &&
          matchesQuery &&
          categoryMatches(item, category)
        );
      }),
    [detections, risk, query, category]
  );

  const selectedCase = (detections || []).find(
    (item) => item.id === selected
  );

  const scene = scenes.find((item) => item.image_type === view);

  const changeCategory = (value: string) => {
    setCategory(value);

    const next = new URLSearchParams(searchParams);

    if (value === "all") {
      next.delete("category");
    } else {
      next.set("category", value);
    }

    setSearchParams(next, { replace: true });

    // Clear a selected case if it is outside the new category.
    const existing = (detections || []).find(
      (item) =>
        item.id === selected &&
        categoryMatches(item, value)
    );

    if (!existing) {
      setSelected(undefined);
    }
  };

  const selectCase = (id: number) => {
    setSelected(id);
    setError("");
  };

  return (
    <main className="page-enter mx-auto max-w-[1800px] px-3 py-5 sm:px-5 lg:px-7">
      {/* PAGE HEADER */}
      <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-g1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            BhuRakshak / Map intelligence
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-g1 sm:text-4xl">
            Environmental monitoring
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-mute">
            Explore mapped observations, review available satellite
            imagery and inspect the evidence associated with each case.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-mute">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Demonstration data
          </span>

          <Button
            v="ghost"
            className="!min-h-[40px] !rounded-xl !border !border-line !bg-white !px-3 text-sm"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? "Hide case list" : "Show case list"}
          </Button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red/30 bg-[#FFF5F3] px-4 py-3 text-sm text-red"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="shrink-0 font-semibold underline"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* QUICK STATS */}
      <section
        className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Observation summary"
      >
        {[
          {
            label: "Available observations",
            value: detections?.length ?? "—",
            note: "Loaded from the case API",
            icon: "🌍",
          },
          {
            label: "Matching cases",
            value: detections ? cases.length : "—",
            note: "Based on active filters",
            icon: "🔎",
          },
          {
            label: "Satellite scenes",
            value: scenes.length,
            note: "Scene metadata retrieved",
            icon: "🛰️",
          },
          {
            label: "Selected case",
            value: selected != null ? `#${selected}` : "None",
            note: "Choose a case to inspect",
            icon: "📋",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-5 text-mute">
                {stat.label}
              </p>
              <span aria-hidden="true" className="text-lg">
                {stat.icon}
              </span>
            </div>

            <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-g1">
              {stat.value}
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-mute">
              {stat.note}
            </p>
          </div>
        ))}
      </section>

      {/* CATEGORY FILTERS */}
      <section className="mb-5 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-extrabold text-g1">
            What would you like to explore?
          </h2>
          <p className="mt-1 text-xs text-mute">
            Select a monitoring category to filter the case list and map.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeCategory(item.value)}
              aria-pressed={category === item.value}
              className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${
                category === item.value
                  ? "border-g2 bg-g1 text-white shadow-sm"
                  : "border-line bg-white text-mute hover:border-g2 hover:bg-emerald-50 hover:text-g1"
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* MAP WORKSPACE */}
      <section
        className={`grid min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-sm ${
          sidebarOpen
            ? selected
              ? "lg:grid-cols-[290px_minmax(0,1fr)_330px] xl:grid-cols-[320px_minmax(0,1fr)_360px]"
              : "lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]"
            : selected
              ? "lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]"
              : "lg:grid-cols-1"
        }`}
      >
        {/* CASE SIDEBAR */}
        {sidebarOpen && (
          <aside className="min-w-0 border-b border-line bg-[#F9FBF8] lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="border-b border-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-g1">
                  Case register
                </h2>
                <span className="rounded-lg bg-paper px-2.5 py-1 font-mono text-xs font-bold text-mute">
                  {detections ? cases.length : "—"}
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-mute">
                Select an observation to view its available evidence.
              </p>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-bold text-g1">
                  Search observations
                </span>
                <input
                  type="search"
                  placeholder="Case ID or change type..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="!rounded-xl !text-sm"
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-bold text-g1">
                  Review priority
                </span>
                <select
                  value={risk}
                  onChange={(event) => setRisk(event.target.value)}
                  className="!rounded-xl !text-sm"
                >
                  {riskLevels.map((value) => (
                    <option key={value} value={value}>
                      {value === "All" ? "All priority levels" : value}
                    </option>
                  ))}
                </select>
              </label>

              {(risk !== "All" || query || category !== "all") && (
                <button
                  type="button"
                  className="mt-3 text-xs font-bold text-g2 underline underline-offset-4"
                  onClick={() => {
                    setRisk("All");
                    setQuery("");
                    changeCategory("all");
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div className="space-y-3 p-3">
              {!detections ? (
                <div className="rounded-xl border border-line bg-white p-4">
                  <SkeletonLoader />
                </div>
              ) : cases.length === 0 ? (
                <EmptyState>
                  No observations match these filters. Try another category
                  or review priority.
                </EmptyState>
              ) : (
                cases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectCase(item.id)}
                    aria-pressed={item.id === selected}
                    className={`w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                      item.id === selected
                        ? "border-g2 bg-emerald-50/70 ring-1 ring-g2/20"
                        : "border-line bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-mute">
                        CASE-{item.id}
                      </span>
                      <RiskBadge level={item.risk_level} />
                    </div>

                    <h3 className="mt-3 text-sm font-extrabold leading-snug text-g1">
                      {item.change_type}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-mute">
                      <span>{item.area_hectares ?? "—"} ha</span>
                      <span>
                        {item.confidence ?? "—"}
                        {item.confidence != null ? "%" : ""} confidence
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                      <StatusBadge status={item.status} />
                      <span
                        aria-hidden="true"
                        className="text-sm text-g2"
                      >
                        →
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* MAP AREA */}
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-extrabold text-g1">
                Interactive map
              </h2>
              <p className="mt-1 text-xs text-mute">
                {scene
                  ? `Scene date: ${scene.scene_date}`
                  : "Explore available mapped observations."}
              </p>
            </div>

            <div
              className="flex flex-wrap gap-1 rounded-xl border border-line bg-paper p-1"
              aria-label="Map imagery selector"
            >
              {[
                ["none", "Street map"],
                ["before", "Before"],
                ["after", "After"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  v={view === value ? "primary" : "ghost"}
                  className="!min-h-[36px] !rounded-lg !px-3 text-xs"
                  onClick={() => setView(value)}
                  aria-pressed={view === value}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative h-[55vh] min-h-[360px] sm:h-[60vh] lg:h-[calc(100vh-330px)] lg:min-h-[520px]">
            <MapView
              dets={cases}
              selected={selected}
              onSelect={selectCase}
              overlay={
                scene
                  ? { url: API + scene.preview, bounds: scene.bounds }
                  : undefined
              }
            />

            <div className="map-caption absolute bottom-3 left-3 z-[500] max-w-[calc(100%-24px)] rounded-xl border border-line p-3 shadow-md">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-g1">
                Map legend
              </p>
              <Legend />
              <div className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-mute">
                {scene ? (
                  <>
                    <p>
                      {scene.scene_date} · {scene.source}
                    </p>
                    <p>
                      Imagery type: {scene.image_type}
                    </p>
                  </>
                ) : (
                  <p>
                    Select a scene to view its imagery overlay, when
                    available.
                  </p>
                )}
                <p className="mt-1">
                  Risk is a preliminary review priority, not a legal finding.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#F9FBF8] px-4 py-3 text-[10px] text-mute sm:px-5">
            <span>Environmental monitoring workspace</span>
            <span>
              {cases.length} matching observations
            </span>
          </div>
        </div>

        {/* CASE DETAILS */}
        {selected != null && (
          <aside className="fixed inset-x-0 bottom-0 z-[1200] max-h-[72vh] overflow-y-auto rounded-t-2xl border border-line bg-white p-5 shadow-[0_-8px_30px_rgba(31,41,55,0.15)] lg:static lg:max-h-[calc(100vh-210px)] lg:rounded-none lg:border-0 lg:border-l lg:shadow-none">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-g2">
                  Evidence review
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-g1">
                  Case #{selected}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(undefined)}
                className="inline-flex min-h-[40px] items-center rounded-lg border border-line px-3 text-xs font-bold text-mute hover:bg-paper hover:text-g1"
                aria-label="Close evidence panel"
              >
                Close
              </button>
            </div>

            {loadingDetail ? (
              <div className="rounded-xl border border-line p-4">
                <SkeletonLoader />
              </div>
            ) : (
              <EvidencePanel d={detail || selectedCase} />
            )}

            <Link
              className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-g2 px-4 text-sm font-bold text-white transition hover:bg-g1"
              to={`/case/${selected}`}
            >
              Open full case <span aria-hidden="true">→</span>
            </Link>
          </aside>
        )}
      </section>

      {/* TRANSPARENCY NOTE */}
      <footer className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-6 text-amber-900">
          <strong>Important:</strong> Satellite observations and mapped risk
          indicators are preliminary evidence. They may be affected by cloud
          cover, seasonal change, image resolution and data quality. An
          authorised officer must verify the evidence before making a
          determination.
        </p>
      </footer>
    </main>
  );
}
