import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, API, download, role } from "../api";
import MapView from "../MapView";
import { Button, Card, Disclaimer, EmptyState, EvidencePanel, NdviScale, SkeletonLoader, StatusBadge, Tabs } from "../ui";

export default function CaseDetail() {
  const { id } = useParams();
  const [detection, setDetection] = useState<any>();
  const [scenes, setScenes] = useState<any[]>([]);
  const [view, setView] = useState("after");
  const [officerCase, setOfficerCase] = useState<any>();
  const [caseEvidence, setCaseEvidence] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [sceneError, setSceneError] = useState("");

  useEffect(() => {
    setDetection(undefined);
    setError("");
    setSceneError("");
    api.get(`/api/change-detections/${id}`)
      .then(response => setDetection(response.data))
      .catch(() => setError("Case evidence is unavailable. Return to the map and try again."));
    api.get("/api/scenes")
      .then(response => setScenes(response.data))
      .catch(() => setSceneError("Satellite scene metadata is temporarily unavailable."));
    if (role()) {
      api.get("/api/officer/cases")
        .then(response => {
          const item = response.data.find((entry: any) => String(entry.id) === String(id));
          setOfficerCase(item);
          if (item?.case_id) {
            api.get(`/api/admin/cases/${item.case_id}/evidence`)
              .then(evidenceResponse => setCaseEvidence(evidenceResponse.data))
              .catch(() => setCaseEvidence([]));
          } else {
            setCaseEvidence([]);
          }
        })
        .catch(() => setOfficerCase(undefined));
    } else {
      setOfficerCase(undefined);
      setCaseEvidence([]);
    }
  }, [id]);

  if (!detection) return <main className="page-enter mx-auto max-w-3xl p-6">
    {error ? <EmptyState>{error}</EmptyState> : <SkeletonLoader />}
    <Link to="/map" className="mt-4 inline-flex min-h-[40px] items-center font-semibold text-g1 underline underline-offset-2">Back to public map</Link>
  </main>;

  const scene = scenes.find(item => item.image_type === view);
  const gis = detection.gis;

  return <main className="page-enter mx-auto max-w-[1280px] p-4 sm:p-6">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <Link to="/map" className="text-xs font-semibold text-g2 underline underline-offset-2">Public map</Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-mute">Preliminary finding · officer review required</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">CASE-{detection.id}: {detection.change_type}</h1>
      </div>
      {role() && <Button v="ghost" onClick={() => download(`/api/reports/${officerCase?.case_id || id}/pdf`, `case_${id}.pdf`)}>Download PDF report</Button>}
    </div>
    {sceneError && <p className="mb-3 rounded border border-[#E9D9A8] bg-[#FFF9E9] px-3 py-2 text-sm text-[#6B4B00]" role="status">{sceneError}</p>}

    <Tabs tabs={["Satellite Evidence", "Change Analysis", "GIS Context", "Citizen Petition", "Officer Decision"]}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="relative h-[360px] overflow-hidden rounded-xl border border-line bg-white sm:h-[480px]">
            <div className="absolute right-3 top-3 z-[500] flex gap-1 rounded-md border border-line bg-white p-1 shadow-sm">
              {["before", "after"].map(value => <Button key={value} v={view === value ? "primary" : "ghost"} className="!min-h-[36px] capitalize !px-3 text-xs" onClick={() => setView(value)} aria-pressed={view === value}>{value}</Button>)}
            </div>
            <MapView dets={[detection]} selected={detection.id} overlay={scene && { url: API + scene.preview, bounds: scene.bounds }} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["before", "after"] as const).map(label => {
              const observation = detection.satellite_observations?.[label];
              return <div key={label} className="border border-line bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-mute">{label === "before" ? "Baseline observation" : "Recent observation"}</p>
                {observation ? <>
                  <p className="mt-1 font-mono text-sm font-bold text-ink">{observation.scene_date}</p>
                  <p className="mt-1 text-xs text-mute">{observation.source} · {observation.sensor}</p>
                  <p className="mt-1 text-xs text-mute">{observation.cloud_cover_percent ?? "Unknown"}% cloud · {observation.spatial_resolution || "Resolution not recorded"}</p>
                  <p className="mt-1 text-[10px] text-mute">{observation.study_area_name}</p>
                </> : <p className="mt-2 text-xs text-mute">Scene metadata unavailable.</p>}
              </div>;
            })}
          </div>
        </div>
        <Card><EvidencePanel d={detection} /></Card>
      </div>

      <Card>
        <p className="mb-4 text-sm leading-relaxed text-mute">Satellite indices provide evidence signals for review; they do not determine legality or responsibility.</p>
        {[["ΔNDVI (vegetation)", detection.ndvi_difference], ["ΔNDWI (water)", detection.ndwi_difference], ["ΔNDBI (built-up)", detection.ndbi_difference], ["ΔBSI (bare soil)", detection.bsi_difference]].map(([label, value]: any) =>
          <div key={label} className="mb-5"><div className="mb-2 text-sm font-semibold text-ink">{label}</div><NdviScale v={value} /></div>
        )}
        <p className="border-t border-line pt-3 text-sm leading-relaxed text-ink">{detection.why_flagged}</p>
        <Disclaimer />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">Geographic context</h2>
        {gis ? <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <dt className="text-mute">Nearest water</dt><dd className="font-mono font-semibold">{gis.distance_to_water_m} m</dd>
          <dt className="text-mute">Nearest road</dt><dd className="font-mono font-semibold">{gis.distance_to_road_m} m</dd>
          <dt className="text-mute">Nearest forest</dt><dd className="font-mono font-semibold">{gis.distance_to_forest_m} m</dd>
          <dt className="text-mute">Near protected area</dt><dd className="font-semibold">{gis.near_protected_area ? "Yes" : "No"}</dd>
          <dt className="text-mute">Existing land-use class</dt><dd className="font-semibold">{gis.existing_lulc_class}</dd>
          {gis.explanation && <><dt className="text-mute">Context notes</dt><dd className="sm:col-span-1">{gis.explanation}</dd></>}
        </dl> : <EmptyState>No GIS context is available for this case.</EmptyState>}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Citizen submission</h2>
        {officerCase?.petition ? <>
          <p className="font-mono text-sm font-semibold text-gov">{officerCase.petition.code}</p>
          <p className="mt-2 text-sm font-semibold text-ink">{officerCase.petition.category}</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">{officerCase.petition.description}</p>
          <p className="mt-3 border-l-2 border-accent bg-paper px-3 py-2 text-xs text-mute">Citizen allegation as reported; not a verified fact.</p>
        </> : <EmptyState>Petition details are visible to signed-in officers.</EmptyState>}
        {role() && officerCase?.case_id && <div className="mt-5 border-t border-line pt-4">
          <h3 className="font-bold">Collected evidence</h3>
          {caseEvidence.length ? <ul className="mt-2 divide-y divide-line">{caseEvidence.map((item: any) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.original_filename}</span><span className="mt-1 block text-xs text-mute">{item.evidence_type} · {item.captured_at || "Capture date not supplied"} · uploaded {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "date unavailable"}</span></span>
            <Button v="ghost" className="!min-h-[36px] !px-3 text-xs" onClick={() => download(`/api/admin/evidence/${item.id}/download`, item.original_filename)}>Download</Button>
          </li>)}</ul> : <p className="mt-2 text-sm text-mute">No additional field evidence has been attached.</p>}
        </div>}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Officer decision</h2>
        <StatusBadge status={detection.status} />
        {officerCase?.decision ? <>
          <p className="mt-4 text-sm"><b>Recorded decision:</b> {officerCase.decision}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-mute">{officerCase.remarks}</p>
        </> : <p className="mt-3 text-sm leading-relaxed text-mute">No final officer decision is recorded yet. Field verification may be required.</p>}
        <Disclaimer />
      </Card>
    </Tabs>
  </main>;
}
