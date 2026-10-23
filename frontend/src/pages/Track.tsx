import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Button, Card, FormField, StatusBadge, Timeline } from "../ui";

export default function Track() {
  const [code, setCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [petition, setPetition] = useState<any>();
  const [portal, setPortal] = useState<any>();
  const [portalError, setPortalError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setError("");
    setPetition(undefined);
    setPortal(undefined);
    setPortalError("");
    setLoading(true);
    try {
      const response = await api.get(`/api/petitions/track/${encodeURIComponent(code.trim())}`, { params: { mobile: mobile.trim() } });
      setPetition(response.data);
      try {
        const portals = await api.get("/api/portals", { params: { category: response.data.portal_category } });
        setPortal(portals.data[0]);
      } catch {
        setPortalError("Petition status loaded; related department information is temporarily unavailable.");
      }
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || "We could not retrieve this petition. Check the reference and mobile number.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="page-enter mx-auto grid max-w-5xl gap-5 px-4 py-8 md:grid-cols-[0.85fr_1.15fr]">
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-g2">Citizen services</p>
      <h1 className="mt-1 text-3xl font-extrabold">Track a petition</h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">View the latest recorded status and next step for a report you submitted. Your reference and mobile number help protect petition details.</p>
      <div className="mt-5 border-l-2 border-g2 bg-white p-4">
        <p className="text-sm font-bold text-ink">What you need</p>
        <ul className="mt-2 space-y-1 text-sm text-mute"><li>• Petition reference from your submission confirmation</li><li>• The mobile number provided with the report</li></ul>
      </div>
      <Link to="/report" className="mt-5 inline-flex min-h-[40px] items-center text-sm font-bold text-g1 underline underline-offset-4">Submit a new report <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>

    <div>
      <Card>
        <h2 className="text-lg font-bold">Find your petition</h2>
        <p className="mt-1 text-sm text-mute">Enter the details exactly as shown on your receipt.</p>
        <div className="mt-4">
          <FormField label="Petition reference"><input className="font-mono" autoComplete="off" placeholder="PET-2025-00001" value={code} onChange={event => setCode(event.target.value)} /></FormField>
          <FormField label="Mobile number"><input inputMode="tel" autoComplete="tel" value={mobile} onChange={event => setMobile(event.target.value)} placeholder="Contact number used in the report" /></FormField>
          {error && <p className="mb-3 rounded border border-red/30 bg-[#FFF5F3] px-3 py-2 text-sm text-red" role="alert">{error}</p>}
          <Button disabled={!code.trim() || !mobile.trim() || loading} onClick={lookup} className="w-full">{loading ? "Checking…" : "Check petition status"}</Button>
        </div>
      </Card>

      {petition && <Card className="mt-4 border-t-4 border-t-g2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-wider text-mute">Petition record</p><p className="mt-1 font-mono font-bold text-g1">{petition.petition_id}</p></div>
          <StatusBadge status={petition.status} />
        </div>
        <div className="mt-4 border-y border-line py-4">
          <Timeline items={[["Submitted", "record received"], ["Under review", petition.status], ["Next step", petition.next_step]].map((item, index) => [`${index + 1}. ${item[0]}`, index === 1 ? "current" : index === 0 ? "done" : ""])} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink">{petition.response}</p>
        <div className="mt-3 border-l-2 border-accent bg-paper p-3 text-sm"><b>Next step:</b> {petition.next_step}</div>
        <p className="mt-3 font-mono text-xs text-mute">Updated {new Date(petition.updated).toLocaleDateString()}</p>
        {portalError && <p className="mt-3 rounded border border-[#E9D9A8] bg-[#FFF9E9] px-3 py-2 text-xs text-[#6B4B00]" role="status">{portalError}</p>}
        {portal && <div className="mt-4 border-t border-line pt-4 text-sm">
          <p className="font-bold text-ink">{portal.department_name}</p>
          <a className="mt-1 inline-flex min-h-[40px] items-center font-semibold text-gov underline underline-offset-2" href={portal.portal_url} target="_blank" rel="noreferrer">{portal.portal_name}<span aria-hidden="true" className="ml-1">↗</span></a>
          <p className="mt-1 text-xs leading-relaxed text-mute">{portal.notice}</p>
        </div>}
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-mute">Status reflects the latest recorded petition update. A report does not establish a legal finding.</p>
      </Card>}
    </div>
  </main>;
}
