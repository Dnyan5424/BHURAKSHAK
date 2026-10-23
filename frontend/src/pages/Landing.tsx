
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import MapView, { Legend } from "../MapView";
import { Card, Disclaimer, RiskBadge } from "../ui";

const steps = [
  {
    number: "01",
    icon: "📍",
    title: "Report a concern",
    description:
      "Share a location and describe what you observed. Add a photo if available.",
  },
  {
    number: "02",
    icon: "🛰️",
    title: "Review satellite data",
    description:
      "Compare available observations to identify possible environmental changes.",
  },
  {
    number: "03",
    icon: "🌍",
    title: "Understand the location",
    description:
      "Review nearby water bodies, roads, forests and other relevant GIS context.",
  },
  {
    number: "04",
    icon: "🔎",
    title: "Verify the evidence",
    description:
      "An authorised officer reviews the available evidence and records a decision.",
  },
  {
    number: "05",
    icon: "✓",
    title: "Track the outcome",
    description:
      "Follow the report reference and check for available status updates.",
  },
];

const categories = [
  {
    number: "01",
    icon: "🌳",
    title: "Vegetation loss",
    description:
      "Identify possible changes in vegetation cover across different observation dates.",
    tag: "NDVI / NBR",
    href: "/map?category=vegetation-loss",
    color: "border-emerald-200 bg-emerald-50",
    iconColor: "bg-emerald-100 text-emerald-800",
  },
  {
    number: "02",
    icon: "⛏️",
    title: "Mining & quarrying",
    description:
      "Review possible excavation footprints and changes in exposed ground.",
    tag: "Land-cover change",
    href: "/map?category=mining",
    color: "border-amber-200 bg-amber-50",
    iconColor: "bg-amber-100 text-amber-800",
  },
  {
    number: "03",
    icon: "🏗️",
    title: "Construction & encroachment",
    description:
      "Explore potential built-up changes alongside available geographic context.",
    tag: "Built-up indicators",
    href: "/map?category=construction",
    color: "border-blue-200 bg-blue-50",
    iconColor: "bg-blue-100 text-blue-800",
  },
  {
    number: "04",
    icon: "💧",
    title: "Water-body changes",
    description:
      "Examine changes in mapped water extent across suitable satellite observations.",
    tag: "NDWI",
    href: "/map?category=water",
    color: "border-cyan-200 bg-cyan-50",
    iconColor: "bg-cyan-100 text-cyan-800",
  },
];

const workspaces = [
  {
    number: "01",
    icon: "📣",
    title: "Citizen workspace",
    description:
      "Report a concern, attach supporting evidence and track your report.",
    action: "Submit a report",
    href: "/report",
    className: "from-emerald-50 to-white",
  },
  {
    number: "02",
    icon: "🔎",
    title: "Officer workspace",
    description:
      "Review cases, inspect evidence and record reasoned decisions.",
    action: "Open officer workspace",
    href: "/officer",
    className: "from-blue-50 to-white",
  },
  {
    number: "03",
    icon: "⚙️",
    title: "Administration",
    description:
      "Manage case records, review available monitoring data and oversee workflows.",
    action: "Open administration",
    href: "/admin",
    className: "from-amber-50 to-white",
  },
];

const trustItems = [
  {
    title: "Evidence before conclusions",
    description:
      "Satellite signals highlight possible changes. They are not proof of a violation.",
  },
  {
    title: "Location-aware context",
    description:
      "Interpret observations alongside relevant geographic features and boundaries.",
  },
  {
    title: "Transparent case history",
    description:
      "Keep observations, supporting files and official decisions distinguishable.",
  },
  {
    title: "Human-led decisions",
    description:
      "Final determinations remain with authorised officers, not automated predictions.",
  },
];

export default function Landing() {
  const [detections, setDetections] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get("/api/change-detections")
      .then((response) => {
        if (!active) return;

        const data = Array.isArray(response.data) ? response.data : [];
        setDetections(data);
        setSelected(data[0]);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSelect = (id: number) => {
    setSelected(detections.find((item) => item.id === id));
  };

  return (
    <main className="page-enter overflow-hidden">
      {/* HERO */}
      <section className="relative mx-auto grid max-w-[1440px] items-center gap-9 px-4 pb-12 pt-9 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:pb-16 lg:pt-16">
        <div className="relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-g1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Environmental intelligence for a greener future
          </div>

          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-g1 sm:text-5xl xl:text-6xl">
            Protect the land.
            <span className="mt-2 block text-g2">
              Understand every change.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-mute sm:text-lg">
            BhuRakshak brings satellite observations, citizen reports and
            geographic information together to help people review potential
            environmental changes transparently.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/report"
              className="inline-flex min-h-[49px] items-center justify-center gap-2 rounded-xl bg-g2 px-5 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-g1 hover:shadow-lg"
            >
              Report a concern
              <span aria-hidden="true">→</span>
            </Link>

            <Link
              to="/map"
              className="inline-flex min-h-[49px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 font-bold text-g1 transition hover:-translate-y-0.5 hover:border-g2 hover:bg-[#F0F6F1]"
            >
              <span aria-hidden="true">🌍</span>
              Explore the map
            </Link>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xl">
                🛰️
              </span>
              <div>
                <p className="text-sm font-bold text-g1">
                  Satellite-informed
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-mute">
                  Observe possible environmental changes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-xl">
                🛡️
              </span>
              <div>
                <p className="text-sm font-bold text-g1">
                  Human verified
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-mute">
                  Officers make the final determination.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Disclaimer />
          </div>
        </div>

        {/* MAP PREVIEW */}
        <div className="relative min-w-0">
          <div className="absolute -inset-3 -z-10 rounded-[30px] bg-gradient-to-br from-emerald-100 via-transparent to-green-200/60 blur-sm" />

          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_22px_60px_rgba(31,41,55,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-g2">
                  Explore environmental signals
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-g1">
                  Public observation map
                </h2>
                <p className="mt-1 text-xs text-mute">
                  Select an available observation to view its summary.
                </p>
              </div>

              <Link
                to="/map"
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-line px-3 text-xs font-bold text-g1 transition hover:border-g2 hover:bg-paper"
              >
                Full map <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className="relative h-[320px] sm:h-[390px] lg:h-[430px]">
              <MapView
                dets={detections}
                selected={selected?.id}
                onSelect={handleSelect}
              />

              <div className="map-caption absolute bottom-3 left-3 z-[500] max-w-[calc(100%-24px)] rounded-xl border border-line p-3 shadow-md">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-g1">
                  Map legend
                </p>
                <Legend />
                <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-mute">
                  Map indicators show preliminary review priority, not a
                  confirmed legal finding.
                </p>
              </div>

              {detections.length === 0 && !loadError && (
                <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg border border-line bg-white/95 px-3 py-2 text-xs font-semibold text-mute shadow-sm">
                  Loading observations…
                </div>
              )}
            </div>

            {/* SELECTED OBSERVATION */}
            <div className="border-t border-line bg-[#FCFDFB] p-4 sm:p-5">
              {selected ? (
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={selected.risk_level} />
                      <span className="rounded-md bg-paper px-2 py-1 font-mono text-[11px] text-mute">
                        CASE-{selected.id}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate text-base font-extrabold text-g1">
                      {selected.change_type}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
                      <span>
                        <strong className="text-ink">
                          {selected.area_hectares ?? "—"}
                        </strong>{" "}
                        hectares
                      </span>
                      <span>
                        <strong className="text-ink">
                          {selected.confidence ?? "—"}
                          {selected.confidence != null ? "%" : ""}
                        </strong>{" "}
                        preliminary confidence
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/map"
                    className="inline-flex min-h-[43px] shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-g1 transition hover:border-g2 hover:bg-emerald-50"
                  >
                    Explore evidence <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-start gap-3 py-2">
                  <span className="text-xl" aria-hidden="true">
                    {loadError ? "⚠️" : "🌿"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-g1">
                      {loadError
                        ? "Observations are temporarily unavailable"
                        : "Preparing the observation map"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-mute">
                      {loadError
                        ? "The map service could not be reached. Please try again later."
                        : "Available observations will appear here when loading finishes."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[10px] text-mute">
            <span>Environmental monitoring workspace</span>
            <span>Map data availability may vary</span>
          </div>
        </div>
      </section>

      {/* MONITORING CATEGORIES */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-g2">
                What can be monitored?
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-g1 sm:text-3xl">
                Four ways to explore environmental change
              </h2>
              <p className="mt-3 text-sm leading-7 text-mute">
                Choose a category to explore relevant map layers and
                observations, where available.
              </p>
            </div>

            <Link
              to="/map"
              className="inline-flex min-h-[42px] items-center gap-2 self-start rounded-xl border border-line bg-white px-4 text-sm font-bold text-g1 transition hover:border-g2 hover:bg-paper md:self-auto"
            >
              Explore all observations →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.number}
                to={category.href}
                className={`group flex min-w-0 flex-col rounded-2xl border p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${category.color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-xl text-2xl ${category.iconColor}`}
                  >
                    {category.icon}
                  </span>
                  <span className="font-mono text-xs font-bold text-mute">
                    {category.number}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-g1">
                  {category.title}
                </h3>

                <p className="mt-2 flex-1 text-sm leading-7 text-mute">
                  {category.description}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-g1">
                    {category.tag}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-lg text-g1 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-mute">
            Indices and indicators require suitable source imagery and
            processing. A category link does not guarantee that historical
            imagery or an analysis layer is currently available.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-g2">
            Simple, transparent and accountable
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-g1 sm:text-3xl">
            From a reported concern to an official decision
          </h2>
          <p className="mt-3 text-sm leading-7 text-mute">
            Each step adds context and review. Technology supports the
            process; authorised people remain responsible for decisions.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className="group relative flex flex-col rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-2xl transition group-hover:bg-emerald-100">
                  {step.icon}
                </span>
                <span className="font-mono text-xs font-bold text-g2">
                  {step.number} / 05
                </span>
              </div>

              <h3 className="mt-5 text-base font-extrabold text-g1">
                {step.title}
              </h3>

              <p className="mt-2 flex-1 text-sm leading-7 text-mute">
                {step.description}
              </p>

              <div className="mt-5 h-1 overflow-hidden rounded-full bg-emerald-50">
                <div
                  className="h-full rounded-full bg-g2 transition-all duration-300 group-hover:w-full"
                  style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* WORKSPACES */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-g2">
              One platform, clear responsibilities
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-g1 sm:text-3xl">
              Find the workspace that fits your role
            </h2>
            <p className="mt-3 text-sm leading-7 text-mute">
              Straightforward tools for reporting concerns, reviewing
              evidence and managing environmental case records.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {workspaces.map((workspace) => (
              <Card
                key={workspace.number}
                className={`group flex h-full flex-col rounded-2xl border border-line border-t-4 border-t-g2 bg-gradient-to-br p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${workspace.className}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-2xl shadow-sm">
                    {workspace.icon}
                  </span>
                  <span className="font-mono text-xs font-bold text-mute">
                    {workspace.number}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-g1">
                  {workspace.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-7 text-mute">
                  {workspace.description}
                </p>

                <Link
                  to={workspace.href}
                  className="mt-6 inline-flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 text-sm font-bold text-g1 transition hover:border-g2 hover:bg-emerald-50"
                >
                  {workspace.action}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST AND TRANSPARENCY */}
      <section className="bg-[#EDF3EA]">
        <div className="mx-auto grid max-w-[1440px] gap-9 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-g1">
              <span aria-hidden="true">🛡️</span>
              Trust and transparency
            </span>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-g1">
              Evidence informs.
              <span className="block text-g2">People decide.</span>
            </h2>

            <p className="mt-4 text-sm leading-8 text-mute">
              A satellite signal is a reason to investigate, not a verdict.
              BhuRakshak separates reported concerns, automated observations,
              supporting evidence and official determinations.
            </p>

            <Link
              to="/map"
              className="mt-6 inline-flex min-h-[45px] items-center gap-2 rounded-xl bg-g1 px-5 font-bold text-white transition hover:bg-g2"
            >
              Explore the platform →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {trustItems.map((item, index) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm transition hover:shadow-md"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 font-mono text-sm font-extrabold text-g2">
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-base font-extrabold text-g1">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-mute">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:py-14">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#174A35] to-[#287653] px-6 py-9 text-white shadow-lg sm:px-10 sm:py-12">
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-200">
                Every observation matters
              </p>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Help make environmental monitoring more transparent.
              </h2>
              <p className="mt-3 text-sm leading-7 text-emerald-50">
                Report a concern or explore available observations to
                understand how the platform supports environmental review.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/report"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-white px-5 font-bold text-g1 transition hover:bg-emerald-50"
              >
                Report a concern
              </Link>
              <Link
                to="/map"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/40 px-5 font-bold text-white transition hover:bg-white/10"
              >
                View map →
              </Link>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 shadow-[0_0_0_35px_rgba(255,255,255,0.035),0_0_0_75px_rgba(255,255,255,0.025)]"
          />
        </div>
      </section>
    </main>
  );
}
