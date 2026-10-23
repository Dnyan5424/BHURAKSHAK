import { useCallback, useEffect, useMemo, useState } from "react";
import { api, API } from "../api";
import MapView from "../MapView";
import { Button, Card, EmptyState, FormField, RiskBadge, StatusBadge } from "../ui";

const MAX_SCENE_SIZE = 200 * 1024 * 1024;
const MAX_EVIDENCE_SIZE = 25 * 1024 * 1024;
const SOURCES = ["Copernicus Data Space", "NASA Earthdata", "USGS EarthExplorer"];
const SENSORS = ["Sentinel-2", "Landsat 8", "Landsat 9"];
const EVIDENCE_TYPES = ["Field photo", "Drone image", "Inspection document", "Geotagged image", "Other"];

function EvidencePreview({ item, onDownload }: any) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (item.media_type.startsWith("image/")) {
      api.get(`/api/admin/evidence/${item.id}/download`, { responseType: "blob" })
        .then(response => {
          objectUrl = URL.createObjectURL(response.data);
          if (active) setUrl(objectUrl);
          else URL.revokeObjectURL(objectUrl);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.media_type]);

  return <div className="flex min-w-0 items-center gap-3">
    {item.media_type.startsWith("image/") && url
      ? <img src={url} alt={`Preview of ${item.original_filename}`} className="h-14 w-14 shrink-0 rounded border border-line object-cover" />
      : <span className="grid h-14 w-14 shrink-0 place-items-center rounded border border-line bg-paper text-[10px] font-bold uppercase text-gov">{item.media_type === "application/pdf" ? "PDF" : item.media_type.split("/")[1]}</span>}
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.original_filename}</p><p className="mt-1 text-xs text-mute">{item.evidence_type} · {item.captured_at ? new Date(item.captured_at).toLocaleString() : "Capture date not provided"}</p><p className="mt-1 text-[11px] text-mute">{item.latitude != null ? `${Number(item.latitude).toFixed(5)}, ${Number(item.longitude).toFixed(5)}` : "No coordinates"}</p></div>
    <button type="button" onClick={() => onDownload(item)} className="min-h-[40px] shrink-0 px-2 text-xs font-semibold text-gov underline underline-offset-2">Download</button>
  </div>;
}

export default function SatelliteIntelligence({ onCreated }: { onCreated?: () => void }) {
  const [scenes, setScenes] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [sceneType, setSceneType] = useState("before");
  const [sceneSource, setSceneSource] = useState(SOURCES[0]);
  const [sensor, setSensor] = useState(SENSORS[0]);
  const [studyArea, setStudyArea] = useState("Pune monitoring area");
  const [sceneDate, setSceneDate] = useState("");
  const [cloud, setCloud] = useState("10");
  const [resolution, setResolution] = useState("10 m");
  const [sceneFile, setSceneFile] = useState<File>();
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [cloudThreshold, setCloudThreshold] = useState("30");
  const [coordinate, setCoordinate] = useState({ lat: "", lon: "" });
  const [locationSelected, setLocationSelected] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [polygon, setPolygon] = useState<any[]>([]);
  const [aoiMode, setAoiMode] = useState<"point" | "polygon">("point");
  const [satelliteEvidenceFiles, setSatelliteEvidenceFiles] = useState<File[]>([]);
  const [evidenceType, setEvidenceType] = useState(EVIDENCE_TYPES[0]);
  const [captureDate, setCaptureDate] = useState("");
  const [evidenceLat, setEvidenceLat] = useState("");
  const [evidenceLon, setEvidenceLon] = useState("");
  const [linkedSceneId, setLinkedSceneId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [busy, setBusy] = useState("");
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadScenes = useCallback(async () => {
    const response = await api.get("/api/scenes");
    const list = response.data;
    setScenes(list);
    setBeforeId(current => current || String(list.find((item: any) => item.image_type === "before")?.id || ""));
    setAfterId(current => current || String(list.find((item: any) => item.image_type === "after")?.id || ""));
  }, []);

  const loadCases = useCallback(async () => {
    const response = await api.get("/api/officer/cases");
    setCases(response.data);
    return response.data;
  }, []);

  useEffect(() => {
    loadScenes().catch(() => setError("Could not load satellite scene metadata."));
    loadCases().then(list => { if (list.length) setCaseId(String(list[0].case_id)); }).catch(() => setError("Could not load cases for evidence linking."));
  }, [loadScenes, loadCases]);

  useEffect(() => {
    if (!caseId) { setEvidence([]); return; }
    api.get(`/api/admin/cases/${caseId}/evidence`)
      .then(response => setEvidence(response.data))
      .catch(() => setError("Could not load evidence for the selected case."));
  }, [caseId]);

  const sceneOptions = (type: string) => scenes
    .filter(scene => scene.image_type === type && Number(scene.cloud_cover_percent || 0) <= Number(cloudThreshold))
    .sort((a, b) => a.scene_date.localeCompare(b.scene_date));
  const beforeScenes = useMemo(() => sceneOptions("before"), [scenes, cloudThreshold]);
  const afterScenes = useMemo(() => sceneOptions("after"), [scenes, cloudThreshold]);
  const beforeScene = scenes.find(scene => String(scene.id) === beforeId);
  const afterScene = scenes.find(scene => String(scene.id) === afterId);
  const evidencePreviews = useMemo(() => satelliteEvidenceFiles.map(file => ({
    file,
    url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
  })), [satelliteEvidenceFiles]);
  useEffect(() => () => evidencePreviews.forEach(preview => { if (preview.url) URL.revokeObjectURL(preview.url); }), [evidencePreviews]);
  const comparisonReady = Boolean(beforeScene && afterScene && beforeId !== afterId &&
    beforeScene.scene_date < afterScene.scene_date &&
    beforeScene.study_area_name === afterScene.study_area_name &&
    beforeScene.sensor === afterScene.sensor &&
    beforeScene.spatial_resolution === afterScene.spatial_resolution &&
    Number(beforeScene.cloud_cover_percent || 0) <= Number(cloudThreshold) &&
    Number(afterScene.cloud_cover_percent || 0) <= Number(cloudThreshold));
  const locationReady = aoiMode === "point"
    ? locationSelected && coordinate.lat.trim() !== "" && coordinate.lon.trim() !== "" &&
      Number.isFinite(Number(coordinate.lat)) && Number.isFinite(Number(coordinate.lon)) && Math.abs(Number(coordinate.lat)) <= 90 && Math.abs(Number(coordinate.lon)) <= 180
    : polygon.length >= 3;

  const onMapPick = useCallback((point: any) => {
    if (drawMode) {
      setPolygon(current => current.length >= 12 ? current : [...current, { lat: point.lat, lng: point.lng }]);
      setCoordinate({ lat: String(point.lat.toFixed(6)), lon: String(point.lng.toFixed(6)) });
      setLocationSelected(true);
    } else {
      setCoordinate({ lat: String(point.lat.toFixed(6)), lon: String(point.lng.toFixed(6)) });
      setLocationSelected(true);
      setPolygon([]);
      setAoiMode("point");
    }
  }, [drawMode]);

  async function uploadScene(event: any) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!sceneFile) { setError("Choose a raster file to add a satellite observation."); return; }
    if (sceneFile.size > MAX_SCENE_SIZE) { setError("Scene file must be smaller than 200 MB."); return; }
    if (!/\.(npz|tif|tiff)$/i.test(sceneFile.name)) { setError("Supported scene formats are .npz, .tif and .tiff."); return; }
    const form = new FormData();
    form.append("study_area_name", studyArea);
    form.append("image_type", sceneType);
    form.append("scene_date", sceneDate);
    form.append("sensor", sensor);
    form.append("cloud_cover_percent", cloud);
    form.append("source", sceneSource);
    form.append("spatial_resolution", resolution);
    form.append("file", sceneFile);
    setBusy("scene");
    try {
      const response = await api.post("/api/scenes/upload", form);
      await loadScenes();
      if (sceneType === "before") setBeforeId(String(response.data.scene_id));
      else setAfterId(String(response.data.scene_id));
      setSceneFile(undefined);
      setNotice(response.data.warning
        ? `Satellite scene ${response.data.scene_id} added. ${response.data.warning}`
        : `Satellite scene ${response.data.scene_id} added to the case library.`);
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.detail || "Could not upload this satellite scene.");
    } finally {
      setBusy("");
    }
  }

  async function runAnalysis() {
    setError("");
    setNotice("");
    if (!comparisonReady || !locationReady) return;
    const boundary = aoiMode === "polygon"
      ? { type: "Polygon", coordinates: [[...polygon.map(point => [point.lng, point.lat]), [polygon[0].lng, polygon[0].lat]]] }
      : undefined;
    setBusy("analysis");
    try {
      const response = await api.post("/api/change-detection/run", {
        before_scene_id: Number(beforeId),
        after_scene_id: Number(afterId),
        origin_lon: aoiMode === "polygon" ? Math.min(...polygon.map(point => point.lng)) : Number(coordinate.lon),
        origin_lat: aoiMode === "polygon" ? Math.max(...polygon.map(point => point.lat)) : Number(coordinate.lat),
        max_cloud_cover_percent: Number(cloudThreshold),
        ...(boundary ? { boundary } : {}),
      });
      setAnalysisComplete(true);
      const loadedCases = await loadCases();
      const newCase = loadedCases.find((item: any) => response.data.case_ids?.includes(item.case_id));
      if (newCase) setCaseId(String(newCase.case_id));
      await loadScenes();
      onCreated?.();
      const message = response.data.message || `${response.data.created.length} preliminary detections created.`;
      setNotice(response.data.warning ? `${message} ${response.data.warning}` : message);
    } catch (analysisError: any) {
      setError(analysisError.response?.data?.detail || "Satellite analysis failed. Check the selected scenes and their band alignment.");
    } finally {
      setBusy("");
    }
  }

  async function loadEvidence(targetCaseId: string) {
    const response = await api.get(`/api/admin/cases/${targetCaseId}/evidence`);
    setEvidence(response.data);
  }

  async function uploadEvidence(event: any) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!caseId || !satelliteEvidenceFiles.length) { setError("Select a case and at least one evidence file."); return; }
    if (satelliteEvidenceFiles.length > 10) { setError("Upload up to 10 evidence files per batch."); return; }
    const invalidFile = satelliteEvidenceFiles.find(file => file.size > MAX_EVIDENCE_SIZE || (!/\.(jpe?g|png|webp|tiff?)$/i.test(file.name) && !/\.pdf$/i.test(file.name)));
    if (invalidFile) {
      setError(`${invalidFile.name}: choose a JPG, PNG, WebP, TIFF or PDF smaller than 25 MB.`);
      return;
    }
    setBusy("evidence");
    const failedFiles: File[] = [];
    for (const file of satelliteEvidenceFiles) {
      const form = new FormData();
      form.append("file", file);
      form.append("evidence_type", evidenceType);
      if (captureDate) form.append("captured_at", captureDate);
      if (evidenceLat && evidenceLon) {
        form.append("latitude", evidenceLat);
        form.append("longitude", evidenceLon);
      }
      if (linkedSceneId) form.append("scene_id", linkedSceneId);
      try {
        await api.post(`/api/admin/cases/${caseId}/evidence`, form);
      } catch (uploadError: any) {
        failedFiles.push(file);
        setError(current => [current, `${file.name}: ${uploadError.response?.data?.detail || "upload failed"}`].filter(Boolean).join("\n"));
      }
    }
    try {
      await loadEvidence(caseId);
      setSatelliteEvidenceFiles(failedFiles);
      if (failedFiles.length) {
        setError(current => `${satelliteEvidenceFiles.length - failedFiles.length} file(s) uploaded. ${current} Retry the remaining files.`);
      } else {
        setNotice(`${satelliteEvidenceFiles.length} evidence file(s) added to the case audit timeline.`);
      }
    } catch {
      setError("Files may have uploaded, but the evidence list could not be refreshed. Reload the case evidence before retrying.");
    } finally {
      setBusy("");
    }
  }

  async function downloadEvidence(item: any) {
    try {
      const response = await api.get(`/api/admin/evidence/${item.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.original_filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not download the selected evidence file.");
    }
  }

  const progress = [
    ["Area selected", locationReady],
    ["Imagery selected", comparisonReady],
    ["Analysis saved", analysisComplete],
    ["Field evidence added", evidence.length > 0],
    ["Officer review", cases.some(item => item.case_id === Number(caseId) && Boolean(item.decision))],
  ];

  return <section className="mt-6 scroll-mt-20" id="satellite-intelligence">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-g2">BhuRakshak · Environmental monitoring</p><h2 className="mt-1 text-2xl font-extrabold">Satellite Intelligence</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-mute">Build a reviewable evidence record in sequence: define an area, select uploaded satellite observations, run preliminary analysis, then attach field evidence.</p></div>
      <span className="border border-[#E9D9A8] bg-[#FFF9E9] px-3 py-2 text-xs font-bold text-[#6B4B00]">Manual imagery workflow · no live provider connection</span>
    </div>

    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {progress.map(([label, complete], index) => <div key={String(label)} className={`flex items-center gap-2 border p-3 text-xs font-semibold ${complete ? "border-g2/30 bg-[#EFF7F0] text-g1" : "border-line bg-white text-mute"}`}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono ${complete ? "bg-g2 text-white" : "bg-paper text-mute"}`}>{complete ? "✓" : index + 1}</span>{label}
      </div>)}
    </div>

    {error && <div className="mb-3 flex items-center justify-between gap-3 border border-red/30 bg-[#FFF5F3] px-3 py-2 text-sm text-red" role="alert"><span>{error}</span><button onClick={() => setError("")} className="font-semibold underline">Dismiss</button></div>}
    {notice && <p className="mb-3 border border-g2/30 bg-[#EFF7F0] px-3 py-2 text-sm text-g1" role="status">{notice}</p>}

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
      <Card className="p-0">
        <div className="border-b border-line p-4"><p className="text-xs font-bold uppercase tracking-wider text-g2">01 · Monitoring area</p><h3 className="mt-1 text-lg font-bold">Select an area of interest</h3><p className="mt-1 text-xs leading-relaxed text-mute">Click the map or enter the raster’s upper-left origin coordinates. Draw a polygon to restrict analysis to a boundary. Polygon masking uses the current detector grid and is preliminary.</p></div>
        <div className="relative h-[350px] border-b border-line">
          <MapView onPick={onMapPick} pin={aoiMode === "point" && locationReady ? { lat: Number(coordinate.lat), lng: Number(coordinate.lon) } : undefined} drawPolygon={polygon} />
          <span className="absolute bottom-3 left-3 z-[500] rounded bg-white/95 px-2 py-1 text-[10px] text-mute shadow">Click map to place/select boundary vertices</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-xs font-semibold text-mute">Raster origin latitude</span><input type="number" min="-90" max="90" step="any" value={coordinate.lat} placeholder="Click map or enter latitude" onChange={event => { setCoordinate(current => ({ ...current, lat: event.target.value })); setLocationSelected(true); setAoiMode("point"); setPolygon([]); }} /></label>
          <label><span className="mb-1 block text-xs font-semibold text-mute">Raster origin longitude</span><input type="number" min="-180" max="180" step="any" value={coordinate.lon} placeholder="Click map or enter longitude" onChange={event => { setCoordinate(current => ({ ...current, lon: event.target.value })); setLocationSelected(true); setAoiMode("point"); setPolygon([]); }} /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button v={drawMode ? "primary" : "ghost"} className="!min-h-[40px] text-xs" onClick={() => { setDrawMode(!drawMode); if (!drawMode) { setPolygon([]); setAoiMode("polygon"); } }} aria-pressed={drawMode}>{drawMode ? "Finish polygon" : "Draw polygon"}</Button>
            {drawMode && <Button v="ghost" className="!min-h-[40px] text-xs" onClick={() => setPolygon(current => current.slice(0, -1))} disabled={!polygon.length}>Undo point</Button>}
            {(drawMode || polygon.length > 0) && <Button v="ghost" className="!min-h-[40px] text-xs" onClick={() => { setPolygon([]); setDrawMode(false); setAoiMode("point"); }}>Clear polygon</Button>}
            {drawMode && <span className="self-center text-xs text-mute">{polygon.length}/12 points · select at least 3</span>}
          </div>
          {beforeScene && afterScene && !comparisonReady && <p className="mt-2 text-xs text-[#6B4B00]" role="status">Selected scenes must have dates in order and matching study area, sensor, resolution, and cloud cover within the threshold.</p>}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="mb-4 border-b border-line pb-3"><p className="text-xs font-bold uppercase tracking-wider text-g2">02 · Data source</p><h3 className="mt-1 text-lg font-bold">Add a satellite observation</h3><p className="mt-1 text-xs leading-relaxed text-mute">Upload a preprocessed multiband raster downloaded from a provider. Provider authentication and live catalog retrieval are not configured in this project.</p></div>
          <form onSubmit={uploadScene} className="grid gap-x-3 sm:grid-cols-2">
            <FormField label="Provider / source"><select value={sceneSource} onChange={event => setSceneSource(event.target.value)}>{SOURCES.map(source => <option key={source}>{source}</option>)}</select></FormField>
            <FormField label="Sensor"><select value={sensor} onChange={event => setSensor(event.target.value)}>{SENSORS.map(value => <option key={value}>{value}</option>)}</select></FormField>
            <FormField label="Observation role"><select value={sceneType} onChange={event => setSceneType(event.target.value)}><option value="before">Baseline / before</option><option value="after">Recent / after</option></select></FormField>
            <FormField label="Acquisition date"><input type="date" required value={sceneDate} onChange={event => setSceneDate(event.target.value)} /></FormField>
            <FormField label="Cloud cover (%)"><input type="number" min="0" max="100" step="0.1" required value={cloud} onChange={event => setCloud(event.target.value)} /></FormField>
            <FormField label="Spatial resolution"><input required maxLength={40} value={resolution} onChange={event => setResolution(event.target.value)} /></FormField>
            <FormField label="Study area name"><input required maxLength={120} value={studyArea} onChange={event => setStudyArea(event.target.value)} /></FormField>
            <label className="mb-4 block"><span className="mb-1 block text-sm font-semibold text-ink">Raster file</span><input type="file" accept=".npz,.tif,.tiff" onChange={event => setSceneFile(event.target.files?.[0])} /><span className="mt-1 block text-xs text-mute">.npz with blue, green, red, nir, swir bands, or five-band GeoTIFF · max 200 MB</span></label>
            <div className="sm:col-span-2"><Button type="submit" disabled={busy === "scene"}>{busy === "scene" ? "Validating and uploading…" : "Add satellite observation"}</Button></div>
          </form>
        </Card>

        <Card>
          <div className="mb-4 border-b border-line pb-3"><p className="text-xs font-bold uppercase tracking-wider text-g2">03 · Change analysis</p><h3 className="mt-1 text-lg font-bold">Compare environmental change</h3></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Baseline scene"><select value={beforeId} onChange={event => setBeforeId(event.target.value)}><option value="">Select baseline</option>{beforeScenes.map(scene => <option key={scene.id} value={scene.id}>{scene.scene_date} · {scene.source} · {scene.cloud_cover_percent ?? 0}% cloud</option>)}</select></FormField>
            <FormField label="Recent scene"><select value={afterId} onChange={event => setAfterId(event.target.value)}><option value="">Select recent</option>{afterScenes.map(scene => <option key={scene.id} value={scene.id}>{scene.scene_date} · {scene.source} · {scene.cloud_cover_percent ?? 0}% cloud</option>)}</select></FormField>
          </div>
          <FormField label={`Maximum scene cloud cover: ${cloudThreshold}%`}><input type="range" min="0" max="100" step="5" value={cloudThreshold} onChange={event => setCloudThreshold(event.target.value)} className="!h-8 !min-h-0 accent-g2" /></FormField>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {[["Baseline imagery", beforeScene], ["Recent imagery", afterScene]].map(([title, scene]: any) => <div key={title} className="overflow-hidden border border-line bg-paper">
              <div className="flex items-center justify-between gap-2 p-2"><span className="text-xs font-bold text-ink">{title}</span>{scene && <span className="font-mono text-[10px] text-mute">{scene.scene_date}</span>}</div>
              {scene ? <><img src={`${API}${scene.preview}`} alt={`${title} false-colour satellite preview`} className="aspect-square w-full bg-[#E8ECE8] object-cover" /><div className="p-2 text-[10px] leading-relaxed text-mute">{scene.sensor} · {scene.cloud_cover_percent ?? 0}% cloud · {scene.spatial_resolution || "Resolution not recorded"} · {scene.source}</div></> : <div className="grid aspect-square place-items-center p-4 text-center text-xs text-mute">Choose a scene to preview</div>}
            </div>)}
          </div>
          <Button className="w-full" disabled={!locationReady || !comparisonReady || busy === "analysis"} onClick={runAnalysis}>{busy === "analysis" ? "Running analysis…" : "Run preliminary analysis"}</Button>
          <p className="mt-2 text-xs leading-relaxed text-mute">The current pipeline compares aligned spectral bands and reports NDVI, NDWI, NDBI and bare-soil indicators. Results are preliminary and must be reviewed by an officer.</p>
        </Card>
      </div>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <div className="mb-4 border-b border-line pb-3"><p className="text-xs font-bold uppercase tracking-wider text-g2">04 · Case evidence</p><h3 className="mt-1 text-lg font-bold">Attach field evidence</h3><p className="mt-1 text-xs text-mute">Files are access-controlled and logged with uploader identity and submission time.</p></div>
        {!cases.length ? <EmptyState>Run a comparison first. Detected changes become reviewable officer cases.</EmptyState> : <form onSubmit={uploadEvidence}>
          <FormField label="Case"><select value={caseId} onChange={event => setCaseId(event.target.value)}>{cases.map(item => <option key={item.case_id} value={item.case_id}>CASE-{item.case_id} · {item.change_type} · {item.risk_level}</option>)}</select></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Evidence type"><select value={evidenceType} onChange={event => setEvidenceType(event.target.value)}>{EVIDENCE_TYPES.map(value => <option key={value}>{value}</option>)}</select></FormField>
            <FormField label="Capture date / time"><input type="datetime-local" value={captureDate} onChange={event => setCaptureDate(event.target.value)} /></FormField>
            <FormField label="Latitude (optional)"><input type="number" min="-90" max="90" step="any" value={evidenceLat} onChange={event => setEvidenceLat(event.target.value)} /></FormField>
            <FormField label="Longitude (optional)"><input type="number" min="-180" max="180" step="any" value={evidenceLon} onChange={event => setEvidenceLon(event.target.value)} /></FormField>
            <FormField label="Link satellite scene (optional)"><select value={linkedSceneId} onChange={event => setLinkedSceneId(event.target.value)}><option value="">No linked scene</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>Scene {scene.id} · {scene.image_type} · {scene.scene_date}</option>)}</select></FormField>
            <label className="mb-4 block rounded-md border border-dashed border-g2 bg-[#F7FAF6] p-3" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setSatelliteEvidenceFiles(current => [...current, ...Array.from(event.dataTransfer.files)]); }}>
              <span className="mb-1 block text-sm font-semibold text-ink">Evidence files</span>
              <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,.pdf" onChange={event => setSatelliteEvidenceFiles(current => [...current, ...Array.from(event.target.files || [])])} />
              <span className="mt-1 block text-xs text-mute">Drop or choose up to 10 JPG, PNG, WebP, TIFF or PDF files · max 25 MB each. Capture metadata applies to this batch.</span>
            </label>
          </div>
          {satelliteEvidenceFiles.length > 0 && <ul className="mb-4 space-y-2">{evidencePreviews.map(({ file, url }) => <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 border border-line p-2">
            {url ? <img src={url} alt={`Preview of ${file.name}`} className="h-12 w-12 rounded border border-line object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded border border-line bg-paper text-[10px] font-bold uppercase text-gov">{file.name.split(".").pop()}</span>}
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{file.name} <span className="font-normal text-mute">({(file.size / 1024 / 1024).toFixed(1)} MB)</span></span>
            <button type="button" onClick={() => setSatelliteEvidenceFiles(current => current.filter(candidate => candidate !== file))} className="min-h-[36px] px-2 text-xs font-semibold text-red">Remove</button>
          </li>)}</ul>}
          {evidenceLat && !evidenceLon || !evidenceLat && evidenceLon ? <p className="mb-3 text-xs text-red" role="alert">Provide both latitude and longitude, or leave both empty.</p> : null}
          <Button type="submit" disabled={busy === "evidence" || !satelliteEvidenceFiles.length || Boolean(evidenceLat) !== Boolean(evidenceLon)}>{busy === "evidence" ? "Uploading evidence…" : `Add ${satelliteEvidenceFiles.length || ""} evidence file${satelliteEvidenceFiles.length === 1 ? "" : "s"} to case`}</Button>
        </form>}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3"><div><p className="text-xs font-bold uppercase tracking-wider text-g2">Evidence library</p><h3 className="mt-1 text-lg font-bold">{caseId ? `CASE-${caseId}` : "Select a case"}</h3></div><span className="rounded bg-paper px-2 py-1 font-mono text-xs text-mute">{evidence.length} files</span></div>
        {evidence.length ? <ol className="divide-y divide-line">{evidence.map(item => <li key={item.id} className="py-3"><EvidencePreview item={item} onDownload={downloadEvidence} /><p className="mt-2 pl-[68px] text-[10px] text-mute">Uploaded by {item.uploader_name || `admin #${item.uploaded_by}`} · {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "time unavailable"}{item.scene_id ? ` · linked scene ${item.scene_id}` : ""}</p></li>)}</ol> : <EmptyState>No evidence has been attached to this case yet.</EmptyState>}
      </Card>
    </div>

    <Card className="mt-4 border-l-4 border-l-gov">
      <p className="text-xs font-bold uppercase tracking-wider text-gov">Data quality & scope</p>
      <p className="mt-2 text-sm leading-relaxed text-mute">Satellite scenes must be spatially aligned and contain the expected spectral bands. The current workflow accepts administrator-uploaded raster files; it does not authenticate to or retrieve imagery from Copernicus, NASA or USGS. Cloud cover metadata is supplied during upload, while the analysis also applies a basic pixel-level cloud estimate. Seasonal variation, shadows, sensor differences and georegistration can produce misleading signals.</p>
      {cases.filter(item => item.case_id === Number(caseId)).map(item => <div key={item.case_id} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"><span className="font-mono text-xs font-bold text-ink">CASE-{item.case_id}</span><RiskBadge level={item.risk_level} /><StatusBadge status={item.case_status} /><a href={`/case/${item.id}`} className="text-xs font-semibold text-gov underline">Open evidence review</a></div>)}
    </Card>
  </section>;
}
