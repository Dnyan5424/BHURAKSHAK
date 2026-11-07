import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import MapView from "../MapView";
import { Button, EmptyState } from "../ui";
import { IconPin, IconPulse, IconSatellite } from "../icons";

const statuses = ["All statuses", "Not Started", "Processing", "Completed", "Failed"];

export default function MonitoringAreas() {
  const [municipality, setMunicipality] = useState("PMC");
  const [ward, setWard] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [wards, setWards] = useState<any[]>([]);
  const [grids, setGrids] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedGeometry, setSelectedGeometry] = useState<any>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogStart, setCatalogStart] = useState("2024-01-01");
  const [catalogEnd, setCatalogEnd] = useState(new Date().toISOString().slice(0, 10));
  const [catalogCloud, setCatalogCloud] = useState("20");
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [beforeSceneId, setBeforeSceneId] = useState<number | "">("");
  const [afterSceneId, setAfterSceneId] = useState<number | "">("");
  const [downloadingSceneId, setDownloadingSceneId] = useState<number | null>(null);

  const loadWards = async (value: string) => {
    try {
      const response = await api.get(`/api/admin/municipalities/${value}/wards`);
      setWards(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not load ward boundaries.");
    }
  };

  const loadGrids = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { municipality };
      if (ward) params.ward_code = ward;
      if (status !== "All statuses") params.status = status;
      const response = await api.get("/api/admin/monitoring-grids", { params });
      const list = Array.isArray(response.data) ? response.data : [];
      setGrids(list);
      setSelected((current: any) => list.find((grid) => grid.grid_id === current?.grid_id) || list[0] || null);
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not load imported 1 km grids.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setWard("");
    loadWards(municipality);
  }, [municipality]);

  useEffect(() => {
    loadGrids();
  }, [municipality, ward, status]);

  useEffect(() => {
    setCatalogResults([]);
    setBeforeSceneId("");
    setAfterSceneId("");
  }, [selected?.grid_id]);

  useEffect(() => {
    let active = true;
    if (!selected?.grid_id) {
      setSelectedGeometry(null);
      return () => { active = false; };
    }
    setSelectedGeometry(null);
    api.get(`/api/admin/monitoring-grids/${encodeURIComponent(selected.grid_id)}`)
      .then((response) => { if (active) setSelectedGeometry(response.data.geometry); })
      .catch((error: any) => { if (active) setNotice(error.response?.data?.detail || "Could not load the selected grid geometry."); });
    return () => { active = false; };
  }, [selected?.grid_id]);

  useEffect(() => {
    if (!jobId) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await api.get(`/api/admin/monitoring-jobs/${jobId}`);
        if (["completed", "no_change", "insufficient_data", "failed"].includes(response.data.status)) {
          window.clearInterval(timer);
          setNotice(response.data.message || `Grid job finished with status ${response.data.status}.`);
          await loadGrids();
        } else if (response.data.message) {
          setNotice(response.data.message);
        }
      } catch {
        window.clearInterval(timer);
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [jobId]);

  const startGrid = async () => {
    if (!selected) return;
    setNotice("");
    try {
      const response = await api.post(`/api/admin/monitoring-grids/${encodeURIComponent(selected.grid_id)}/run`);
      setJobId(response.data.job_id);
      setNotice(`Grid ${selected.grid_id} queued independently. Only this 1 km tile will be analysed.`);
      await loadGrids();
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not queue this grid.");
    }
  };

  const downloadCatalog = async (format: "csv" | "geojson") => {
    if (!selected) return;
    try {
      const response = await api.get(`/api/monitoring-grids/${encodeURIComponent(selected.grid_id)}/catalog`, { params: { format }, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selected.grid_id}-catalog.${format === "csv" ? "csv" : "geojson"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not download the grid catalogue.");
    }
  };

  const searchCatalog = async () => {
    if (!selected) return;
    setCatalogSearching(true);
    setNotice("");
    try {
      const response = await api.post(`/api/monitoring-grids/${encodeURIComponent(selected.grid_id)}/catalog`, {
        start_date: catalogStart, end_date: catalogEnd, max_cloud_cover: Number(catalogCloud), limit: 6,
      });
      const results = Array.isArray(response.data.results) ? response.data.results : [];
      setCatalogResults(results);
      setBeforeSceneId("");
      setAfterSceneId("");
      setNotice(`Found ${results.length} Sentinel-2 scenes for ${selected.grid_id}.`);
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not search the Sentinel-2 catalogue.");
    } finally {
      setCatalogSearching(false);
    }
  };

  const downloadSceneImage = async (scene: any) => {
    setDownloadingSceneId(scene.id);
    try {
      const response = await api.get(`/api/satellite/scenes/${scene.id}/image`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${scene.external_scene_id}-visual.tif`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not download this scene image.");
    } finally {
      setDownloadingSceneId(null);
    }
  };

  const detectSelectedPair = async () => {
    if (!selected || !beforeSceneId || !afterSceneId) return;
    try {
      const response = await api.post(`/api/monitoring-grids/${encodeURIComponent(selected.grid_id)}/detect`, {
        before_scene_id: beforeSceneId, after_scene_id: afterSceneId,
        max_cloud_cover_percent: Number(catalogCloud),
      });
      setJobId(response.data.job_id);
      setNotice("Scene pair queued. Downloads and detection continue in the background; this may take several minutes.");
      await loadGrids();
    } catch (error: any) {
      setNotice(error.response?.data?.detail || "Could not queue change detection.");
    }
  };

  const mapDetections = useMemo(() => selected && selectedGeometry ? [{ ...selected, id: selected.id, polygon: selectedGeometry }] : [], [selected, selectedGeometry]);

  return (
    <main className="page-enter mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#D8D2C4] pb-4 sm:flex-row sm:items-end">
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-g2"><IconPin size={14} /> PMC · PCMC grid register</span>
          <h1 className="mt-0.5 text-2xl font-extrabold text-g1 sm:text-3xl">Individual Grid Monitoring</h1>
          <p className="mt-0.5 text-xs text-mute">Select one municipality, ward and 1 km × 1 km grid. Analysis is never bulk-started.</p>
        </div>
        <Link to="/admin/satellite" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[6px] bg-g1 px-4 text-xs font-bold text-white hover:bg-g2"><IconSatellite size={15} /> Manual catalogue / upload →</Link>
      </div>

      {notice && <div className="mb-4 rounded-[6px] border border-g2/30 bg-[#EFF7F0] px-4 py-3 text-xs font-semibold text-g1">{notice}</div>}

      <section className="mb-5 grid gap-3 rounded-[10px] border border-[#CBD8CC] bg-white p-4 shadow-sm sm:grid-cols-5">
        <label className="text-xs font-bold text-mute">Area / municipality<select value={municipality} onChange={(event) => setMunicipality(event.target.value)} className="mt-1 text-sm"><option value="PMC">Pune Municipal Corporation (PMC)</option><option value="PCMC">Pimpri-Chinchwad Municipal Corporation (PCMC)</option></select></label>
        <label className="text-xs font-bold text-mute">Ward<select value={ward} onChange={(event) => setWard(event.target.value)} className="mt-1 text-sm"><option value="">All wards</option>{wards.map((item) => <option key={item.ward_code} value={item.ward_code}>{item.ward_code} · {item.ward_name}</option>)}</select></label>
        <label className="text-xs font-bold text-mute">Grid tile<select value={selected?.grid_id || ""} onChange={(event) => { const grid = grids.find((item) => item.grid_id === event.target.value) || null; setSelected(grid); if (grid) setWard(grid.ward_code); }} className="mt-1 text-sm"><option value="">Select a grid</option>{grids.map((grid) => <option key={grid.grid_id} value={grid.grid_id}>{grid.grid_id}</option>)}</select></label>
        <label className="text-xs font-bold text-mute">Grid size<input value="1 km × 1 km" readOnly className="mt-1 bg-[#F1F0EA] text-sm" /></label>
        <label className="text-xs font-bold text-mute">Monitoring status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 text-sm">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold text-mute">
        <span>PMC grids: {municipality === "PMC" ? grids.length : "—"}</span>
        <span>PCMC grids: {municipality === "PCMC" ? grids.length : "—"}</span>
        <span>Showing: {grids.length}</span>
      </div>

      {loading ? <p className="py-12 text-center text-sm text-mute">Loading imported grids…</p> : grids.length === 0 ? (
        <EmptyState icon={<IconPin size={28} />}>No imported 1 km grids match these filters. An administrator must import the verified PMC/PCMC ward GeoJSON before monitoring can start.</EmptyState>
      ) : (
        <>
        {!ward && <section className="mb-5 rounded-[10px] border border-[#CBD8CC] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold text-g1">Choose a ward</h2><p className="mt-0.5 text-[11px] text-mute">Pick a ward card to see its 1 km grid tiles.</p></div><span className="text-[11px] font-semibold text-mute">{wards.length} wards</span></div>
          <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {wards.map((item) => {
              const tileCount = grids.filter((grid) => grid.ward_code === item.ward_code).length;
              return <button key={item.ward_code} type="button" onClick={() => setWard(item.ward_code)} className="flex min-h-[66px] items-center justify-between gap-3 rounded-[8px] border border-[#CBD8CC] bg-[#FAF8F4] px-3 py-2 text-left hover:border-g2 hover:bg-[#EFF7F0]">
                <span className="min-w-0"><span className="block text-xs font-extrabold text-g1">Ward {item.ward_code}</span><span className="block truncate text-[11px] text-mute">{item.ward_name}</span></span>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gov">{tileCount} tiles</span>
              </button>;
            })}
          </div>
        </section>}
        {ward && <div className="mb-3 flex items-center justify-between rounded-[8px] border border-[#CBD8CC] bg-white px-3 py-2"><p className="text-xs font-bold text-g1">Ward {ward} · {grids.length} grid tiles</p><button type="button" onClick={() => setWard("")} className="text-[11px] font-bold text-gov underline">Back to wards</button></div>}
        {!ward ? <p className="mb-5 rounded-[8px] border border-dashed border-[#CBD8CC] p-5 text-center text-xs text-mute">Select a ward card above to view its grid tiles.</p> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1.15fr)]">
          <div className="grid content-start gap-2">
            {grids.map((grid) => (
              <button key={grid.grid_id} type="button" onClick={() => setSelected(grid)} className={`rounded-[8px] border bg-white p-3 text-left shadow-sm ${selected?.grid_id === grid.grid_id ? "border-g2 ring-2 ring-accent/30" : "border-[#CBD8CC]"}`}>
                <div className="flex items-start justify-between gap-2"><div><p className="font-mono text-xs font-extrabold text-gov">{grid.grid_id}</p><p className="mt-1 text-xs text-ink">{grid.grid_name}</p></div><span className="rounded border border-line px-2 py-0.5 text-[10px] font-bold">{grid.status}</span></div>
                <p className="mt-2 text-[11px] text-mute">Ward {grid.ward_code} · {Number(grid.area_sq_km || 0).toFixed(3)} km² · fixed 1000 m grid</p>
              </button>
            ))}
          </div>
          <section className="overflow-hidden rounded-[10px] border border-[#CBD8CC] bg-white shadow-sm">
            <div className="border-b border-line px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-g2">Selected grid</p><h2 className="mt-1 text-lg font-extrabold text-g1">{selected?.grid_id || "Select a grid"}</h2><p className="mt-1 text-xs text-mute">Only this clipped polygon is sent to the satellite pipeline.</p></div>
            <div className="h-[340px]">{selected && selectedGeometry ? <MapView dets={mapDetections} selected={selected.id} height="340px" /> : <div className="grid h-full place-items-center text-sm text-mute">{selected ? "Loading selected grid map…" : "No grid selected."}</div>}</div>
            {selected && <div className="border-t border-line p-4">
              <div className="grid grid-cols-2 gap-3 text-xs"><div><span className="block text-[10px] font-bold uppercase text-mute">Status</span><b>{selected.status}</b></div><div><span className="block text-[10px] font-bold uppercase text-mute">Area</span><b>{Number(selected.area_sq_km || 0).toFixed(3)} km²</b></div></div>
              <section className="mt-4 rounded border border-line bg-paper p-3">
                <h3 className="text-xs font-extrabold text-g1">Search Sentinel-2 catalogue</h3>
                <p className="mt-1 text-[11px] text-mute">Search covers the selected 1 km grid. Choose two scenes to queue clipped downloads and change detection.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <label className="text-[11px] font-bold text-mute">From<input type="date" value={catalogStart} onChange={(event) => setCatalogStart(event.target.value)} className="mt-1 w-full text-xs" /></label>
                  <label className="text-[11px] font-bold text-mute">To<input type="date" value={catalogEnd} onChange={(event) => setCatalogEnd(event.target.value)} className="mt-1 w-full text-xs" /></label>
                  <label className="text-[11px] font-bold text-mute">Max cloud %<input type="number" min="0" max="20" value={catalogCloud} onChange={(event) => setCatalogCloud(event.target.value)} className="mt-1 w-full text-xs" /></label>
                  <Button disabled={catalogSearching} onClick={searchCatalog} className="self-end text-xs">{catalogSearching ? "Searching…" : "Search catalogue"}</Button>
                </div>
                {catalogResults.length > 0 && <div className="mt-3 space-y-2">{catalogResults.map((scene) => <div key={scene.id} className="flex flex-col gap-2 rounded border border-line bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="truncate text-[11px] font-bold text-ink">{scene.external_scene_id}</p><p className="text-[10px] text-mute">{scene.scene_date} · {scene.tile_id} · {Number(scene.cloud_cover_percent).toFixed(1)}% cloud</p></div>
                  <div className="flex flex-wrap items-center gap-2"><select aria-label={`Choose role for ${scene.external_scene_id}`} value={beforeSceneId === scene.id ? "before" : afterSceneId === scene.id ? "after" : ""} onChange={(event) => { if (event.target.value === "before") { setBeforeSceneId(scene.id); if (afterSceneId === scene.id) setAfterSceneId(""); } else if (event.target.value === "after") { setAfterSceneId(scene.id); if (beforeSceneId === scene.id) setBeforeSceneId(""); } else { if (beforeSceneId === scene.id) setBeforeSceneId(""); if (afterSceneId === scene.id) setAfterSceneId(""); } }} className="text-[10px]"><option value="">Select role</option><option value="before">Baseline</option><option value="after">Recent</option></select><button type="button" onClick={() => downloadSceneImage(scene)} disabled={downloadingSceneId === scene.id} className="rounded border border-line px-2 py-1 text-[10px] font-bold text-gov">{downloadingSceneId === scene.id ? "Downloading…" : "Download image"}</button></div>
                </div>)}
                  <Button disabled={!beforeSceneId || !afterSceneId || selected.status === "Processing"} onClick={detectSelectedPair} className="w-full text-xs"><IconPulse size={13} /> {selected.status === "Processing" ? "Grid job running…" : "Check for Change"}</Button>
                </div>}
              </section>
              <Button disabled={selected.status === "Processing"} onClick={startGrid} className="mt-3 w-full text-xs"><IconPulse size={14} /> {selected.status === "Processing" ? "Grid analysis processing…" : "Start automatic analysis for this grid"}</Button>
              <div className="mt-3 flex gap-2"><button type="button" className="flex-1 rounded border border-line px-2 py-2 text-[11px] font-bold text-gov" onClick={() => downloadCatalog("csv")}>Catalog CSV</button><button type="button" className="flex-1 rounded border border-line px-2 py-2 text-[11px] font-bold text-gov" onClick={() => downloadCatalog("geojson")}>Grid GeoJSON</button><Link className="flex-1 rounded border border-line px-2 py-2 text-center text-[11px] font-bold text-gov" to={`/admin/satellite?grid_id=${encodeURIComponent(selected.grid_id)}`}>Manual mode</Link></div>
            </div>}
          </section>
        </div>
        )}
        </>
      )}
    </main>
  );
}
