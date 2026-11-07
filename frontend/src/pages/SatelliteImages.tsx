import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, API, role } from "../api";
import { Button, FormField, FileUploader, AttentionBadge, Disclaimer } from "../ui";
import {
  IconSatellite,
  IconPulse,
  IconShieldCheck,
  IconFileDoc,
  IconPin,
  TopoLinesGraphic,
} from "../icons";

export default function SatelliteImages() {
  const [selectedMunicipality, setSelectedMunicipality] = useState("PMC");
  const [selectedArea, setSelectedArea] = useState("");
  const [gridOptions, setGridOptions] = useState<any[]>([]);
  const [selectedGrid, setSelectedGrid] = useState<any>(null);
  const [gridGeometryLoading, setGridGeometryLoading] = useState(false);
  const gridRequest = useRef(0);

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string>("");
  const [afterPreview, setAfterPreview] = useState<string>("");

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [detectedAreas, setDetectedAreas] = useState<any[]>([]);
  const [detectedCaseIds, setDetectedCaseIds] = useState<number[]>([]);

  // Advanced Mode Accordion
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cloudCover, setCloudCover] = useState("20");
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [realScenes, setRealScenes] = useState<any[]>([]);
  const [realStart, setRealStart] = useState("2024-01-01");
  const [realEnd, setRealEnd] = useState(new Date().toISOString().slice(0, 10));
  const [realCloud, setRealCloud] = useState("20");
  const [realNotice, setRealNotice] = useState("");
  const [npzDownloadingId, setNpzDownloadingId] = useState<number | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentRole = role();

  const selectGrid = useCallback(async (summary: any | null) => {
    const requestId = ++gridRequest.current;
    setSelectedGrid(summary);
    setSelectedArea(summary?.grid_id || "");
    if (!summary) {
      setGridGeometryLoading(false);
      return;
    }
    if (summary.geometry) {
      setGridGeometryLoading(false);
      return;
    }
    setGridGeometryLoading(true);
    try {
      const response = await api.get(`/api/admin/monitoring-grids/${encodeURIComponent(summary.grid_id)}`);
      if (gridRequest.current === requestId) setSelectedGrid({ ...summary, ...response.data });
    } catch (err: any) {
      if (gridRequest.current === requestId) setError(err.response?.data?.detail || "Could not load the selected grid geometry.");
    } finally {
      if (gridRequest.current === requestId) setGridGeometryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/api/admin/monitoring-grids")
      .then((response) => {
        if (!active) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setGridOptions(list);
        const fromUrl = searchParams.get("grid_id");
        const initial = list.find((grid) => grid.grid_id === fromUrl) || list[0];
        if (initial) {
          setSelectedMunicipality(initial.municipality || "PMC");
          void selectGrid(initial);
        }
      })
      .catch(() => {});
    return () => { active = false; gridRequest.current += 1; };
  }, [searchParams, selectGrid]);

  const availableGrids = gridOptions.filter((grid) => grid.municipality === selectedMunicipality);

  const searchRealScenes = async () => {
    if (!selectedGrid?.geometry) return;
    setFetchingRemote(true);
    setRealNotice("");
    try {
      const response = await api.post("/api/satellite/search", {
        start_date: realStart,
        end_date: realEnd,
        max_cloud_cover: Math.min(20, Math.max(0, Number(realCloud))),
        limit: 6,
        geometry: selectedGrid?.geometry,
      });
      setRealScenes(response.data.results || []);
      setRealNotice(`Found ${response.data.results?.length || 0} real Sentinel-2 scenes for ${selectedGrid?.grid_id || "the selected area"}.`);
    } catch (err: any) {
      setRealNotice(err.response?.data?.detail || "Could not search the public satellite catalogue.");
    } finally {
      setFetchingRemote(false);
    }
  };

  const downloadRealScene = async (scene: any, imageType: "before" | "after") => {
    setRealNotice(`Downloading ${scene.external_scene_id} and converting its Pune window...`);
    try {
      const response = await api.post(`/api/satellite/scenes/${scene.id}/download`, {
        image_type: imageType,
        mode: currentRole === "officer" ? "manual" : "historical",
      });
      setRealScenes((items) => items.map((item) => item.id === scene.id ? { ...item, ...response.data } : item));
      setRealNotice(`Downloaded real scene ${scene.external_scene_id}. It is ready for comparison.`);
    } catch (err: any) {
      setRealNotice(err.response?.data?.detail || "Real scene download failed.");
    }
  };

  const downloadSceneNpz = async (scene: any) => {
    setNpzDownloadingId(scene.id);
    setRealNotice(`Preparing the clipped NPZ for ${scene.external_scene_id}. Large scenes can take a few minutes; keep this page open.`);
    try {
      let downloadedScene = scene;
      if (scene.download_status !== "complete") {
        const response = await api.post(`/api/satellite/scenes/${scene.id}/download`, {
          image_type: "after",
          mode: currentRole === "officer" ? "manual" : "historical",
        });
        downloadedScene = response.data;
        setRealScenes((items) => items.map((item) => item.id === scene.id ? { ...item, ...downloadedScene } : item));
      }
      const response = await api.get(`/api/satellite/scenes/${scene.id}/npz`, { responseType: "blob" });
      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(response.data);
      link.href = objectUrl;
      link.download = `${downloadedScene.external_scene_id}.npz`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        link.remove();
      }, 1000);
      setRealNotice(`Downloaded converted NPZ for ${downloadedScene.external_scene_id}.`);
    } catch (err: any) {
      let detail = err.response?.data?.detail;
      if (!detail && err.response?.data instanceof Blob) {
        try { detail = JSON.parse(await err.response.data.text()).detail; } catch { /* response was not JSON */ }
      }
      setRealNotice(detail || "NPZ download failed. Check that the API is running and the scene has finished processing.");
    } finally {
      setNpzDownloadingId(null);
    }
  };

  const downloadSceneImage = async (scene: any) => {
    try {
      const response = await api.get(`/api/satellite/scenes/${scene.id}/image`, { responseType: "blob" });
      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(response.data);
      link.href = objectUrl;
      link.download = `${scene.external_scene_id}-visual.tif`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        link.remove();
      }, 1000);
    } catch (err: any) {
      setRealNotice(err.response?.data?.detail || "Image download failed.");
    }
  };

  useEffect(() => {
    api.get("/api/scenes").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      const bef = list.find((s: any) => s.image_type === "before");
      const aft = list.find((s: any) => s.image_type === "after");
      if (bef) setBeforePreview(`${API}${bef.preview}`);
      if (aft) setAfterPreview(`${API}${aft.preview}`);
    }).catch(() => {});
  }, []);

  const handleBeforeUpload = (file: File) => {
    setBeforeFile(file);
    setBeforePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  };

  const handleAfterUpload = (file: File) => {
    setAfterFile(file);
    setAfterPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  };

  const fileTypeLabel = (file: File | null) => {
    if (!file) return "";
    const extension = file.name.split(".").pop()?.toLowerCase();
    return extension === "npz" ? "NPZ spectral raster" : extension === "tif" || extension === "tiff" ? "GeoTIFF raster" : "Image";
  };

  // 3-Click Change Detection
  const handleCheckForChange = async () => {
    setChecking(true);
    setError("");
    setResult(null);
    setDetectedAreas([]);
    setDetectedCaseIds([]);

    try {
      let befId: number;
      let aftId: number;

      if (beforeFile) {
        const form = new FormData();
        form.append("study_area_name", selectedArea);
        if (selectedGrid) form.append("grid_id", selectedGrid.grid_id);
        form.append("image_type", "before");
        form.append("scene_date", realStart);
        form.append("sensor", "Sentinel-2");
        form.append("cloud_cover_percent", cloudCover);
        form.append("source", "Sentinel-2 Optical");
        form.append("spatial_resolution", "10 m");
        form.append("file", beforeFile);
        const upRes = await api.post("/api/scenes/upload", form);
        befId = upRes.data.scene_id;
      } else {
        const selected = realScenes.find((scene) => scene.selectedType === "before");
        if (!selected || selected.download_status !== "complete") throw new Error("Select and download a baseline Sentinel-2 scene first.");
        befId = selected.id;
      }

      if (afterFile) {
        const form = new FormData();
        form.append("study_area_name", selectedArea);
        if (selectedGrid) form.append("grid_id", selectedGrid.grid_id);
        form.append("image_type", "after");
        form.append("scene_date", realEnd);
        form.append("sensor", "Sentinel-2");
        form.append("cloud_cover_percent", cloudCover);
        form.append("source", "Sentinel-2 Optical");
        form.append("spatial_resolution", "10 m");
        form.append("file", afterFile);
        const upRes = await api.post("/api/scenes/upload", form);
        aftId = upRes.data.scene_id;
      } else {
        const selected = realScenes.find((scene) => scene.selectedType === "after");
        if (!selected || selected.download_status !== "complete") throw new Error("Select and download a recent Sentinel-2 scene first.");
        aftId = selected.id;
      }

      const beforeScene = realScenes.find((scene) => scene.id === befId);
      const afterScene = realScenes.find((scene) => scene.id === aftId);
      if (Boolean(beforeScene) !== Boolean(afterScene)) throw new Error("Use two downloaded Sentinel-2 scenes or upload both rasters; mixed comparisons are not supported.");
      const runRes = beforeScene && afterScene
        ? await api.post("/api/satellite/process", { before_scene_id: befId, after_scene_id: aftId, max_cloud_cover_percent: Number(realCloud) })
        : await api.post("/api/change-detection/run", {
            before_scene_id: befId,
            after_scene_id: aftId,
            max_cloud_cover_percent: Number(cloudCover) || 50,
            boundary: selectedGrid?.geometry,
            origin_lon: selectedGrid ? Math.min(...selectedGrid.geometry.coordinates[0].map((point: number[]) => point[0])) : 73.85,
            origin_lat: selectedGrid ? Math.max(...selectedGrid.geometry.coordinates[0].map((point: number[]) => point[1])) : 18.55,
          });
      const createdIds = Array.isArray(runRes.data.created) ? runRes.data.created : [];
      setDetectedCaseIds(Array.isArray(runRes.data.case_ids) ? runRes.data.case_ids : []);
      const createdDetections = await Promise.all(
        createdIds.map(async (detectionId: number) => {
          const response = await api.get(`/api/change-detections/${detectionId}`);
          return response.data;
        })
      );
      setDetectedAreas(createdDetections);

      setResult({
        title: createdDetections.length ? `${createdDetections.length} potential change area(s) detected.` : "No change exceeded the configured thresholds.",
        area_affected: createdDetections.length
          ? `${createdDetections.reduce((total, item) => total + (Number(item.area_hectares) || 0), 0).toFixed(2)} ha total`
          : "None detected",
        how_sure: createdDetections.length
          ? `${Math.round(createdDetections.reduce((total, item) => total + (Number(item.confidence) || 0), 0) / createdDetections.length)}% average`
          : "—",
        attention_level: createdDetections.length ? "Review required" : "Routine",
        near_forest: createdDetections.some((item) =>
          item.gis?.near_protected_area || Number(item.gis?.distance_to_forest_m) < 300
        ) ? "Yes — GIS flagged" : "No — outside buffer",
        status: runRes.data.message || "Analysis completed.",
        case_id: runRes.data.case_ids?.[0],
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Could not analyze the selected raster scenes.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="page-enter mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* Title */}
      <div className="mb-6 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D8D2C4] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g2 flex items-center gap-1.5">
            <IconSatellite size={14} />
            Remote Sensing Pipeline
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1 mt-0.5">
            Three-Click Satellite Check
          </h1>
        </div>
        <span className="text-xs text-mute font-medium">Automatic Spectral Differentiation</span>
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-red/30 bg-[#FFF5F3] px-4 py-3 text-xs text-red font-medium">
          {error}
        </div>
      )}
      {currentRole === "officer" || currentRole === "admin" ? (
        <section className="mb-6 rounded-[12px] border border-[#CBD8CC] bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink">Search real Sentinel-2 data</h2>
          <p className="mt-1 text-xs text-mute">Public Microsoft Planetary Computer catalogue, limited to the selected 1 km grid.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-mute">Area / municipality<select aria-label="Select monitoring area" value={selectedMunicipality} onChange={(e) => {
              const nextMunicipality = e.target.value;
              const firstGrid = gridOptions.find((grid) => grid.municipality === nextMunicipality);
              setSelectedMunicipality(nextMunicipality);
              void selectGrid(firstGrid || null);
            }} className="mt-1 w-full text-sm">
              <option value="PMC">Pune Municipal Corporation (PMC)</option>
              <option value="PCMC">Pimpri-Chinchwad Municipal Corporation (PCMC)</option>
            </select></label>
            <label className="text-xs font-semibold text-mute">1 km grid<select aria-label="Select 1 km monitoring grid" value={selectedGrid?.municipality === selectedMunicipality ? selectedGrid?.grid_id || "" : ""} onChange={(e) => {
              const next = availableGrids.find((grid) => grid.grid_id === e.target.value);
              void selectGrid(next || null);
            }} className="mt-1 w-full text-sm">
              {availableGrids.length ? availableGrids.map((grid) => <option key={grid.grid_id} value={grid.grid_id}>{grid.grid_id} · Ward {grid.ward_code}</option>) : <option value="">No grids available</option>}
            </select></label>
            <label className="text-xs font-semibold text-mute">From<input type="date" value={realStart} onChange={(e) => setRealStart(e.target.value)} className="mt-1 w-full text-sm" /></label>
            <label className="text-xs font-semibold text-mute">To<input type="date" value={realEnd} onChange={(e) => setRealEnd(e.target.value)} className="mt-1 w-full text-sm" /></label>
            <label className="text-xs font-semibold text-mute">Max cloud %<input type="number" min="0" max="20" value={realCloud} onChange={(e) => setRealCloud(e.target.value)} className="mt-1 w-full text-sm" /></label>
            <Button disabled={fetchingRemote || gridGeometryLoading || !selectedGrid?.geometry} onClick={searchRealScenes} className="self-end">{gridGeometryLoading ? "Loading grid…" : fetchingRemote ? "Searching..." : "Search catalogue"}</Button>
          </div>
          {realNotice && <p className="mt-3 text-xs font-semibold text-g1">{realNotice}</p>}
          {realScenes.length > 0 && (
            <div className="mt-4 space-y-2">
              {realScenes.map((scene) => (
                <div key={scene.id} className="flex flex-col gap-2 rounded border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink">{scene.external_scene_id}</p>
                    <p className="text-[11px] text-mute">{scene.scene_date} · {scene.tile_id} · {scene.cloud_cover_percent.toFixed(2)}% cloud · {scene.download_status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`${API}/api/satellite/scenes/${scene.id}/preview`} target="_blank" rel="noreferrer" className="inline-flex min-h-[34px] items-center rounded-[6px] border border-line px-2.5 text-xs font-bold text-gov">
                      Preview image
                    </a>
                    <Button v="ghost" className="!min-h-[34px] text-xs" onClick={() => downloadSceneImage(scene)}>
                      Download image
                    </Button>
                    <Button v="ghost" className="!min-h-[34px] text-xs" onClick={() => setRealScenes((items) => items.map((item) => item.id === scene.id ? { ...item, selectedType: "before" } : item))}>
                      {scene.selectedType === "before" ? "Baseline selected" : "Use as baseline"}
                    </Button>
                    <Button v="ghost" className="!min-h-[34px] text-xs" onClick={() => setRealScenes((items) => items.map((item) => item.id === scene.id ? { ...item, selectedType: "after" } : item))}>
                      {scene.selectedType === "after" ? "Recent selected" : "Use as recent"}
                    </Button>
                    <Button v="ghost" className="!min-h-[34px] text-xs" disabled={!scene.selectedType} onClick={() => scene.selectedType && downloadRealScene(scene, scene.selectedType)}>
                      {scene.download_status === "complete" ? (scene.selectedType ? `Set as ${scene.selectedType}` : "Downloaded") : scene.selectedType ? `Download ${scene.selectedType}` : "Select before download"}
                    </Button>
                    <Button v="ghost" className="!min-h-[34px] text-xs" disabled={npzDownloadingId !== null} onClick={() => downloadSceneNpz(scene)}>
                      {npzDownloadingId === scene.id ? "Preparing NPZ…" : "Download NPZ only"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* 3-CLICK PIPELINE WORKSPACE */}
      <div className="relative overflow-hidden rounded-[12px] border border-[#CBD8CC] bg-white p-5 sm:p-7 shadow-sm mb-6">
        <TopoLinesGraphic className="absolute -top-10 -right-16 w-80 text-g2 pointer-events-none" />

        {/* CLICK 1: SELECT MONITORING AREA */}
        <div className="relative z-10 pb-5 border-b border-line">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-6 w-6 rounded-full bg-g1 text-accent flex items-center justify-center text-xs font-extrabold font-mono border border-accent/40">
              1
            </span>
            <h2 className="text-base font-bold text-ink">
              Click 1: Select Observation Boundary
            </h2>
          </div>
          <p className="rounded-[6px] border border-line bg-[#FAF8F4] px-3 py-2 text-xs font-semibold text-mute">
            Selected boundary: {selectedMunicipality} · {selectedGrid?.grid_id || "No grid selected"}
          </p>
        </div>

        {/* CLICK 2: UPLOAD / VERIFY IMAGES */}
        <div className="relative z-10 py-5 border-b border-line">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-6 w-6 rounded-full bg-g1 text-accent flex items-center justify-center text-xs font-extrabold font-mono border border-accent/40">
              2
            </span>
            <h2 className="text-base font-bold text-ink">
              Click 2: Verify Satellite Optical Frames
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Before Image */}
            <div className="border border-[#CBD8CC] rounded-[8px] p-4 bg-[#FAF8F4] text-center">
              <span className="text-xs font-bold text-ink block mb-0.5">
                Baseline Raster (Before)
              </span>
              <span className="text-[10px] text-mute block mb-3">
                Pre-disturbance multispectral scene
              </span>

              {beforePreview ? (
                <div className="relative mb-3">
                  <img
                    src={beforePreview}
                    alt="Baseline satellite scene"
                    className="h-36 w-full rounded object-cover border border-[#C5CDC5]"
                  />
                  <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                    Baseline Loaded
                  </span>
                </div>
              ) : (
                <div className="h-36 border border-dashed border-[#CBD8CC] rounded flex flex-col items-center justify-center text-xs text-mute mb-3 bg-white px-3">
                  {beforeFile ? (
                    <>
                      <span className="font-bold text-g1">{fileTypeLabel(beforeFile)}</span>
                      <span className="mt-1 max-w-full truncate text-[11px]" title={beforeFile.name}>{beforeFile.name}</span>
                    </>
                  ) : "No baseline scene loaded"}
                </div>
              )}

              <label className="inline-flex min-h-[36px] items-center justify-center rounded-[6px] border border-[#CBD8CC] bg-white px-3 text-xs font-bold text-ink hover:border-g2 cursor-pointer shadow-sm">
                <span>Upload Before Raster</span>
                <input
                  type="file"
                  accept=".npz,.tif,.tiff"
                  onChange={(e) => e.target.files?.[0] && handleBeforeUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-[10px] text-mute">Accepted: NPZ spectral raster or GeoTIFF (.tif/.tiff)</p>
            </div>

            {/* After Image */}
            <div className="border border-[#CBD8CC] rounded-[8px] p-4 bg-[#FAF8F4] text-center">
              <span className="text-xs font-bold text-ink block mb-0.5">
                Recent Raster (After)
              </span>
              <span className="text-[10px] text-mute block mb-3">
                Current pass to check for changes
              </span>

              {afterPreview ? (
                <div className="relative mb-3">
                  <img
                    src={afterPreview}
                    alt="Recent satellite scene"
                    className="h-36 w-full rounded object-cover border border-[#C5CDC5]"
                  />
                  <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                    Recent Loaded
                  </span>
                </div>
              ) : (
                <div className="h-36 border border-dashed border-[#CBD8CC] rounded flex flex-col items-center justify-center text-xs text-mute mb-3 bg-white px-3">
                  {afterFile ? (
                    <>
                      <span className="font-bold text-g1">{fileTypeLabel(afterFile)}</span>
                      <span className="mt-1 max-w-full truncate text-[11px]" title={afterFile.name}>{afterFile.name}</span>
                    </>
                  ) : "No recent pass loaded"}
                </div>
              )}

              <label className="inline-flex min-h-[36px] items-center justify-center rounded-[6px] border border-[#CBD8CC] bg-white px-3 text-xs font-bold text-ink hover:border-g2 cursor-pointer shadow-sm">
                <span>Upload After Raster</span>
                <input
                  type="file"
                  accept=".npz,.tif,.tiff"
                  onChange={(e) => e.target.files?.[0] && handleAfterUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-[10px] text-mute">Accepted: NPZ spectral raster or GeoTIFF (.tif/.tiff)</p>
            </div>
          </div>
        </div>

        {/* CLICK 3: CHECK FOR CHANGE */}
        <div className="relative z-10 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-g1 text-accent flex items-center justify-center text-xs font-extrabold font-mono border border-accent/40">
              3
            </span>
            <span className="text-xs text-mute leading-tight">
              Execute automatic spectral band comparison across green cover and soil indices.
            </span>
          </div>

          <Button
            v="primary"
            className="!min-h-[46px] px-8 text-sm font-extrabold w-full sm:w-auto gap-2"
            disabled={checking}
            onClick={handleCheckForChange}
          >
            <IconPulse size={16} />
            <span>{checking ? "Analyzing Spectral Bands…" : "Check for Change"}</span>
          </Button>
        </div>
      </div>

      {/* PLAIN LANGUAGE RESULTS DISPLAY */}
      {result && (
        <div className="rounded-[10px] border border-red/30 bg-white p-5 sm:p-6 mb-6 shadow-sm border-t-4 border-t-red space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-red">
                Change Detection Result
              </span>
              <h2 className="text-xl font-extrabold text-ink mt-0.5">{result.title}</h2>
            </div>
            <AttentionBadge level={result.attention_level} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
                Changed Area
              </span>
              <p className="text-lg font-bold font-mono text-ink mt-0.5">{result.area_affected}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
                How sure is the system?
              </span>
              <p className="text-lg font-bold font-mono text-g2 mt-0.5">{result.how_sure}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
                Attention Level
              </span>
              <p className="text-sm font-bold text-ink mt-1">{result.attention_level}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
                Near Forest Area?
              </span>
              <p className="text-sm font-bold text-ink mt-1">{result.near_forest}</p>
            </div>
          </div>

          {detectedAreas.length > 0 && (
            <section className="border-t border-line pt-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-ink">Detected change areas</h3>
                  <p className="text-[11px] text-mute mt-0.5">
                    Each area is a separate preliminary signal for officer verification.
                  </p>
                </div>
                <span className="font-mono text-[11px] font-bold text-g2">
                  {detectedAreas.length} records
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {detectedAreas.map((area, index) => {
                  const nearForest =
                    area.gis?.near_protected_area ||
                    Number(area.gis?.distance_to_forest_m) < 300;
                  const caseId = detectedCaseIds[index];
                  return (
                    <article
                      key={area.id}
                      className="rounded-[8px] border border-[#CBD8CC] bg-[#FAF8F4] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mute">
                            Detection #{area.id}
                          </span>
                          <h4 className="mt-1 text-sm font-extrabold text-g1">
                            {area.change_type}
                          </h4>
                        </div>
                        <AttentionBadge level={area.risk_level} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">
                            Changed area
                          </span>
                          <strong className="mt-0.5 block font-mono text-ink">
                            {Number(area.area_hectares || 0).toFixed(2)} ha
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">
                            System certainty
                          </span>
                          <strong className="mt-0.5 block font-mono text-g2">
                            {area.confidence ?? "—"}%
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">
                            Near forest area?
                          </span>
                          <strong className="mt-0.5 block text-ink">
                            {nearForest ? "Yes" : "No"}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">
                            GIS distance
                          </span>
                          <strong className="mt-0.5 block font-mono text-ink">
                            {area.gis?.distance_to_forest_m != null
                              ? `${Math.round(area.gis.distance_to_forest_m)} m`
                              : "Unavailable"}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-line pt-3">
                        <p className="text-[11px] leading-relaxed text-[#47574D]">
                          {area.gis?.explanation || area.why_flagged || "Preliminary spectral change signal requires field verification."}
                        </p>
                        {area.evidence_calculations && (
                          <div className="mt-3 rounded border border-g2/20 bg-white p-2.5 text-[10px] text-mute">
                            <p className="font-bold uppercase tracking-wider text-g2">Evidence calculations</p>
                            <p className="mt-1">
                              Changed pixels: <b>{area.evidence_calculations.changed_pixels}</b> ·
                              Valid coverage: <b>{area.evidence_calculations.valid_pixel_coverage_percent}%</b> ·
                              Cloud estimate: <b>{area.evidence_calculations.cloud_fraction_percent}%</b>
                            </p>
                          </div>
                        )}
                        {caseId && (
                          <Link
                            to={`/case/${caseId}`}
                            className="mt-3 inline-flex min-h-[32px] items-center rounded-[6px] bg-g1 px-3 text-[11px] font-bold text-white hover:bg-g2"
                          >
                            Review detection →
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <div className="p-3.5 rounded-[6px] border border-g2/30 bg-[#EDF4EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-g1">Status: {result.status}</p>
              <p className="text-[#2B563D] mt-0.5">
                Observation indexed and made available in the officer inspection queue.
              </p>
            </div>
            {result.case_id && <Link
              to={`/case/${result.case_id}`}
              className="inline-flex min-h-[38px] items-center rounded-[6px] bg-g1 px-4 font-bold text-white hover:bg-g2 shadow-sm shrink-0"
            >
              Open Officer Review →
            </Link>}
          </div>
        </div>
      )}

      {/* ADVANCED ACCORDION */}
      <div className="rounded-[8px] border border-[#CBD8CC] bg-[#FAF8F4] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-white transition"
        >
          <span className="text-xs font-bold text-[#47574D] uppercase tracking-wider">
            {showAdvanced ? "− Hide Advanced Parameters" : "+ Advanced Remote Sensing Options (Cloud Cover & Retrieval)"}
          </span>
          <span className="text-[11px] text-mute font-mono">Optional</span>
        </button>

        {showAdvanced && (
          <div className="p-4 space-y-4 border-t border-line bg-white text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                label="Maximum Cloud Cover Threshold (%)"
                hint="Filter out passes where cloud obscuration exceeds threshold."
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={cloudCover}
                  onChange={(e) => setCloudCover(e.target.value)}
                  className="w-full text-xs"
                />
              </FormField>

              <div>
                <span className="block font-bold text-ink mb-1">Catalog Query</span>
                <Button
                  v="ghost"
                  className="!min-h-[36px] text-xs font-bold w-full"
                  disabled={fetchingRemote}
                  onClick={() => {
                    setFetchingRemote(true);
                    setTimeout(() => {
                      setFetchingRemote(false);
                      alert("Simulated Sentinel-2 pass verified and synchronized.");
                    }, 1200);
                  }}
                >
                  <IconSatellite size={14} />
                  <span>{fetchingRemote ? "Connecting to repository…" : "Fetch Latest Pass"}</span>
                </Button>
                <span className="text-[10px] text-mute mt-1 block">
                  Queries simulated repository for latest clear multispectral pass.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </main>
  );
}
