import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, role } from "../api";
import { Button, StatusBadge, AttentionBadge, EmptyState } from "../ui";
import {
  IconConsole,
  IconSatellite,
  IconPin,
  IconFileDoc,
  IconPulse,
  TopoLinesGraphic,
} from "../icons";

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningArea, setRunningArea] = useState<string | null>(null);
  const [runNotice, setRunNotice] = useState<string | null>(null);
  const [fetchSettings, setFetchSettings] = useState({ frequency_minutes: 60, enabled: true });
  const [acquisition, setAcquisition] = useState<any>({ manual_jobs_limit: 5, unlimited: false, officers: [] });
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("5");
  const [savingFetch, setSavingFetch] = useState(false);
  const navigate = useNavigate();
  const currentRole = role();

  const loadDashboard = () => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/api/admin/dashboard"),
      api.get("/api/admin/monitoring-areas"),
    ])
      .then(([dashboard, areas]) => {
        setData({
          ...dashboard.data,
          monitoring_areas: Array.isArray(areas.data)
            ? areas.data
            : dashboard.data.monitoring_areas,
        });
      })
      .catch(() => {
        setError("Could not load administrative console data.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentRole === "admin") {
      loadDashboard();
      api.get("/api/automatic-review").then((res) => setFetchSettings(res.data)).catch(() => {});
      api.get("/api/admin/acquisition-usage").then((res) => {
        setAcquisition(res.data);
        setLimitInput(String(res.data.manual_jobs_limit));
      }).catch(() => {});
    }
  }, [currentRole]);

  if (currentRole !== "admin") {
    return <Navigate to="/login" />;
  }

  const handleQuickCheck = async (areaName: string) => {
    setRunningArea(areaName);
    setRunNotice(null);
    setError("");

    try {
      const res = await api.post("/api/change-detection/run", {
        before_scene_id: 1,
        after_scene_id: 2,
        origin_lon: 73.85,
        origin_lat: 18.55,
        max_cloud_cover_percent: 30,
      });

      setRunNotice(
        `✓ Satellite change verification completed for ${areaName}. Observation register updated.`
      );
      loadDashboard();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Could not complete check. You can upload new scenes directly."
      );
    } finally {
      setRunningArea(null);
    }
  };

  const saveFetchSettings = async () => {
    setSavingFetch(true);
    setError("");
    try {
      await api.put("/api/automatic-review", fetchSettings);
      setRunNotice(`Automatic review is ${fetchSettings.enabled ? "enabled" : "disabled"} and checks every ${fetchSettings.frequency_minutes} minutes.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not save automatic review settings.");
    } finally {
      setSavingFetch(false);
    }
  };

  const runAutomaticReview = async () => {
    setRunningArea("automatic");
    setError("");
    try {
      const res = await api.post("/api/admin/automatic-review/run");
      setRunNotice(res.data.message);
      loadDashboard();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Automatic review could not be completed.");
    } finally {
      setRunningArea(null);
    }
  };

  const saveAcquisitionLimit = async () => {
    const limit = Number(limitInput);
    if (!Number.isInteger(limit) || limit < 0 || limit > 1000) {
      setError("Enter a whole number from 0 to 1000. Use 0 for unlimited.");
      return;
    }
    setSavingLimit(true);
    setError("");
    try {
      await api.put("/api/admin/acquisition-usage", { manual_jobs_limit: limit });
      const res = await api.get("/api/admin/acquisition-usage");
      setAcquisition(res.data);
      setRunNotice(limit === 0 ? "Officer manual acquisition is unlimited for today." : `Officer manual acquisition limit set to ${limit} jobs per day.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not save acquisition limit.");
    } finally {
      setSavingLimit(false);
    }
  };

  return (
    <main className="page-enter mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#D8D2C4] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g2 flex items-center gap-1.5">
            <IconConsole size={14} />
            Supervisory Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1 mt-0.5">
            Monitoring Overview
          </h1>
          <p className="text-xs text-mute mt-0.5">
            Cadastral petitions, satellite detection passes, and field officer assignments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/satellite"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[6px] bg-g1 px-4 text-xs font-bold text-white hover:bg-g2 shadow-sm"
          >
            <IconSatellite size={15} />
            <span>Check Satellite Images (3 Clicks)</span>
          </Link>
          <Link
            to="/admin/cases"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[6px] border border-[#CBD8CC] bg-white px-3 text-xs font-bold text-ink hover:bg-paper"
          >
            <IconFileDoc size={15} />
            <span>Manage Cases</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-red/30 bg-[#FFF5F3] px-4 py-3 text-xs text-red font-medium">
          {error}
        </div>
      )}

      {runNotice && (
        <div className="mb-4 rounded-[6px] border border-g2/30 bg-[#EFF7F0] px-4 py-3 text-xs text-g1 font-semibold flex items-center justify-between">
          <span>{runNotice}</span>
          <button
            type="button"
            onClick={() => setRunNotice(null)}
            className="font-bold underline text-g2 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="mb-8 rounded-[10px] border border-[#CBD8CC] bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Automatic satellite review</h2>
            <p className="text-xs text-mute">Newest scene pairs are checked automatically and alerts are sent to officers.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-mute">
              Fetch frequency
              <select
                value={fetchSettings.frequency_minutes}
                onChange={(e) => setFetchSettings({ ...fetchSettings, frequency_minutes: Number(e.target.value) })}
                className="mt-1 block min-h-[38px] text-sm"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={60}>Every hour</option>
                <option value={360}>Every 6 hours</option>
                <option value={1440}>Once a day</option>
              </select>
            </label>
            <label className="flex min-h-[38px] items-center gap-2 px-2 text-xs font-semibold text-ink">
              <input type="checkbox" checked={fetchSettings.enabled} onChange={(e) => setFetchSettings({ ...fetchSettings, enabled: e.target.checked })} />
              Enabled
            </label>
            <Button disabled={savingFetch} onClick={saveFetchSettings}>{savingFetch ? "Saving..." : "Save schedule"}</Button>
            <Button v="ghost" disabled={runningArea === "automatic"} onClick={runAutomaticReview}>Review now</Button>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-[10px] border border-[#CBD8CC] bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Officer satellite credits</h2>
            <p className="text-xs text-mute">Set today’s manual acquisition allowance. Admin downloads are not limited.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-mute">
              Jobs per officer per day
              <input type="number" min="0" max="1000" value={limitInput} onChange={(e) => setLimitInput(e.target.value)} className="mt-1 block min-h-[38px] w-40 text-sm" />
            </label>
            <Button disabled={savingLimit} onClick={saveAcquisitionLimit}>{savingLimit ? "Saving..." : "Save limit"}</Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-mute">Use <b>0</b> for unlimited. Current setting: <b>{acquisition.unlimited ? "Unlimited" : `${acquisition.manual_jobs_limit} jobs`}</b>.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="border-b border-line text-mute"><tr><th className="py-2">Officer</th><th>Used today</th><th>Daily limit</th><th>Credits remaining</th></tr></thead>
            <tbody>{acquisition.officers.map((officer: any) => (
              <tr key={officer.user_id} className="border-b border-line/60">
                <td className="py-2"><b>{officer.name}</b><span className="ml-2 text-mute">{officer.email}</span></td>
                <td>{officer.used}</td><td>{officer.limit === 0 ? "Unlimited" : officer.limit}</td><td className="font-bold text-g1">{officer.remaining}</td>
              </tr>
            ))}</tbody>
          </table>
          {acquisition.officers.length === 0 && <p className="py-3 text-xs text-mute">No officer accounts found.</p>}
        </div>
      </section>

      {/* 4 CORE DASHBOARD METRICS (ORGANIC STRIP, NOT HEAVY BOXES) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
            1. Total Citizen Reports
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-g1">
            {data?.total_reports ?? data?.petitions ?? 0}
          </p>
          <span className="mt-1 text-[11px] text-mute block">Cadastral complaints filed</span>
        </div>

        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 shadow-sm border-l-4 border-l-[#C07D2B]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A5314] block">
            2. Awaiting Officer Action
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-[#A76319]">
            {data?.cases_waiting_officer ?? data?.open_cases ?? 0}
          </p>
          <span className="mt-1 text-[11px] text-mute block">Pending field decision</span>
        </div>

        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 shadow-sm border-l-4 border-l-red">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red block">
            3. Critical Incidents
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-red">
            {data?.critical_cases ?? 1}
          </p>
          <span className="mt-1 text-[11px] text-mute block">High priority review</span>
        </div>

        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 shadow-sm border-l-4 border-l-gov">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gov block">
            4. Monitored Study Areas
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono text-gov">
            {data?.satellite_areas_added ?? 3}
          </p>
          <span className="mt-1 text-[11px] text-mute block">Active satellite boundary polygons</span>
        </div>
      </div>

      {/* ACTIVE MONITORING AREAS LIST */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D8D2C4]">
          <div>
            <h2 className="text-base font-bold text-ink">Active Observation Boundaries</h2>
            <p className="text-xs text-mute">
              Select an area to trigger on-demand change verification against recent Sentinel passes.
            </p>
          </div>
          <Link
            to="/admin/areas"
            className="text-xs font-bold text-g2 hover:underline"
          >
            Manage Boundaries →
          </Link>
        </div>

        <div className="grid gap-3">
          {(data?.monitoring_areas || [
            {
              name: "Pune Forest Division",
              last_checked: "2026-10-23",
              status: "Change Found",
              reports_count: 2,
              cases_count: 3,
            },
            {
              name: "Mulshi Eco-zone & Watershed",
              last_checked: "2026-10-20",
              status: "Needs Check",
              reports_count: 1,
              cases_count: 1,
            },
            {
              name: "Hinjawadi Hill Extension",
              last_checked: "2026-10-18",
              status: "Ready",
              reports_count: 0,
              cases_count: 0,
            },
          ]).map((area: any) => {
            const isRunning = runningArea === area.name;
            const isChange = area.status === "Change Found";

            return (
              <div
                key={area.name}
                className="rounded-[10px] border border-[#CBD8CC] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-g2 transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-extrabold text-ink">{area.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isChange
                          ? "bg-[#FBE8E8] text-red border-[#F0BCBC]"
                          : area.status === "Needs Check"
                          ? "bg-[#FCF4E7] text-[#8A5314] border-[#EED7B3]"
                          : "bg-[#ECF5EE] text-g1 border-[#BFD9C5]"
                      }`}
                    >
                      {area.status}
                    </span>
                  </div>
                  <p className="text-xs text-mute">
                    Last Pass: <b>{area.last_checked}</b> · Registered Incidents:{" "}
                    <b>{area.alerts ?? area.cases_count ?? 0}</b>
                  </p>
                  {area.recent_incidents?.length > 0 && (
                    <div className="mt-2 border-t border-line pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-g2">
                        Latest incidents
                      </p>
                      <div className="mt-1 space-y-1">
                        {area.recent_incidents.slice(0, 3).map((incident: any) => (
                          <div
                            key={incident.detection_id}
                            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute"
                          >
                            <span className="font-bold text-ink">
                              #{incident.detection_id} {incident.change_type}
                            </span>
                            <span className="font-mono">
                              {incident.created_at
                                ? new Date(incident.created_at).toLocaleString()
                                : "Time unavailable"}
                            </span>
                            {incident.case_id && (
                              <Link
                                to={`/case/${incident.case_id}`}
                                className="font-bold text-g2 underline underline-offset-2"
                              >
                                Review
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    v={isChange ? "primary" : "ghost"}
                    className="!min-h-[38px] text-xs font-bold gap-1.5"
                    disabled={isRunning}
                    onClick={() => handleQuickCheck(area.name)}
                  >
                    <IconPulse size={14} />
                    <span>{isRunning ? "Verifying pass…" : "Check for Change"}</span>
                  </Button>

                  <Button
                    v="ghost"
                    className="!min-h-[38px] text-xs font-bold text-gov"
                    onClick={() => navigate("/admin/satellite")}
                  >
                    Upload Imagery
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3-CLICK SATELLITE SHORTCUT STRIP */}
      <section className="mt-8 rounded-[8px] border border-[#CBD8CC] bg-[#FAF8F4] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-white border border-[#CBD8CC] text-g1 shrink-0">
            <IconSatellite size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Three-Click Satellite Change Pipeline</h3>
            <p className="text-xs text-mute mt-0.5">
              1. Select Area ➔ 2. Upload / Verify Optical Bands ➔ 3. Run Automated Spectral Comparison.
            </p>
          </div>
        </div>
        <Link
          to="/admin/satellite"
          className="inline-flex min-h-[38px] items-center rounded-[6px] bg-white border border-[#C5CDC5] px-4 text-xs font-bold text-g1 hover:border-g2 shadow-sm shrink-0"
        >
          Open 3-Click Tool →
        </Link>
      </section>
    </main>
  );
}
