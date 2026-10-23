import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, CATS } from "../api";
import MapView from "../MapView";
import { Button, Card, FormField, FileUploader, Timeline } from "../ui";

const categoryInfo: Record<string, string> = {
  "Tree cutting or vegetation loss": "Changes to tree cover or vegetation visible at a location.",
  "Quarrying or excavation suspicion": "Possible ground disturbance, quarrying or excavation.",
  "Encroachment suspicion": "Possible expansion or change affecting public or protected land.",
  "Illegal construction suspicion": "Possible new built-up area requiring official review.",
  "River, lake, or water-body encroachment": "Possible change near a river, lake or water body.",
  "Sand mining suspicion": "Possible extraction activity near a riverbed or other land.",
  "Waste dumping": "Possible waste accumulation or dumping at a location.",
  "Other environmental issue": "An environmental observation that does not fit another category.",
};

export default function Report() {
  const [step, setStep] = useState(0);
  const [pin, setPin] = useState<any>();
  const [photo, setPhoto] = useState<File>();
  const [result, setResult] = useState<any>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [form, setForm] = useState<any>({
    village_city: "", district: "", category: CATS[0], description: "", noticed: "",
    mobile: "", is_anonymous: false, consent_given: false,
  });
  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : "", [photo]);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const update = (key: string) => (event: any) =>
    setForm((current: any) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  const validMobile = /^[0-9+\-\s()]{10,16}$/.test(form.mobile.trim());
  const canContinue = [
    Boolean(pin && form.village_city.trim() && form.district.trim()),
    form.description.trim().length >= 10 && form.description.length <= 1000,
    validMobile && form.consent_given,
  ][step];

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const { noticed, ...body } = form;
      const response = await api.post("/api/petitions", {
        ...body,
        description: form.description + (noticed ? ` (first noticed: ${noticed})` : ""),
        latitude: pin.lat,
        longitude: pin.lng,
      });
      setResult(response.data);
      if (photo) {
        await uploadPhoto(response.data.petition_code);
      }
    } catch (submitError: any) {
      setError(submitError.response?.data?.detail || "Could not submit the report. Your entered information is still available; please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadPhoto(petitionCode: string) {
    if (!photo) return;
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const fileData = new FormData();
      fileData.append("f", photo);
      await api.post(`/api/petitions/${petitionCode}/documents?mobile=${encodeURIComponent(form.mobile)}`, fileData);
    } catch (uploadError: any) {
      setPhotoError(uploadError.response?.data?.detail || "Your petition was received, but the photo did not upload. Retry the photo upload below.");
    } finally {
      setPhotoUploading(false);
    }
  }

  if (result) return <main className="page-enter mx-auto max-w-2xl px-4 py-10">
    <Card className="border-t-4 border-t-g2">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#E8F3E9] text-xl font-bold text-g1" aria-hidden="true">✓</div>
      <p className="text-xs font-bold uppercase tracking-wider text-g2">Submission received</p>
      <h1 className="mt-1 text-2xl font-extrabold">Your report is in the review process</h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">Keep this reference and the mobile number you provided. The report is an unverified citizen observation; an authorised officer will review it.</p>
      <div className="mt-5 border border-line bg-paper p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">Petition reference</p>
        <p className="mt-1 break-all font-mono text-2xl font-bold text-g1">{result.petition_code}</p>
        <p className="mt-2 text-sm text-mute">Status: {result.status}</p>
      </div>
      {photoError && <div className="mt-4 rounded border border-[#E9D9A8] bg-[#FFF9E9] px-3 py-3 text-sm text-[#6B4B00]" role="alert"><p>{photoError}</p><Button v="ghost" className="mt-2 !min-h-[38px] !px-3 text-sm" disabled={photoUploading} onClick={() => uploadPhoto(result.petition_code)}>{photoUploading ? "Retrying upload…" : "Retry photo upload"}</Button></div>}
      <p className="mt-4 text-sm text-mute">{result.linked_to_detected_change ? "Your location matches an area already under review." : "No matching detected change is currently linked to this report."}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/track" className="inline-flex min-h-[44px] items-center rounded-md bg-g2 px-4 font-bold text-white hover:bg-g1">Track this petition</Link>
        <Link to="/map" className="inline-flex min-h-[44px] items-center rounded-md border border-line px-4 font-bold text-g1 hover:border-g2">Return to public map</Link>
      </div>
    </Card>
  </main>;

  return <main className="page-enter mx-auto grid max-w-[1440px] gap-5 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)] lg:p-6">
    <section className="flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm lg:sticky lg:top-20 lg:h-[calc(100vh-110px)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div><p className="text-xs font-bold uppercase tracking-wider text-g2">Choose a location</p><h2 className="mt-0.5 font-bold">Pin the observed area on the map</h2></div>
        <span className="rounded bg-paper px-2 py-1 font-mono text-xs text-mute">{pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : "No location selected"}</span>
      </div>
      <div className="relative min-h-[300px] flex-1">
        <MapView onPick={setPin} pin={pin} />
        <div className="absolute bottom-3 left-3 z-[500] rounded-md border border-line bg-white/95 px-3 py-2 text-xs text-mute shadow-sm">Select the approximate location of your observation.</div>
      </div>
    </section>

    <Card className="self-start p-4 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-g2">Citizen petition</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Report a land-use concern</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">Share what you observed. A report is a request for review, not a determination of responsibility.</p>
      <div className="mt-5"><Timeline items={["Location", "Issue details", "Evidence & review"].map((title, index) => [`${index + 1}. ${title}`, index === step ? "current" : index < step ? "done" : ""])} /></div>

      <div className="mt-6">
        {step === 0 && <>
          <div className="mb-4 border-l-2 border-accent bg-paper px-3 py-2 text-sm leading-relaxed text-mute">Choose the location on the map, then identify the village or city and district.</div>
          <FormField label="Village or city"><input autoComplete="address-level2" value={form.village_city} onChange={update("village_city")} placeholder="Enter village or city" /></FormField>
          <FormField label="District"><input autoComplete="address-level1" value={form.district} onChange={update("district")} placeholder="Enter district" /></FormField>
          {pin && <p className="mb-4 rounded-md border border-line bg-white px-3 py-2 font-mono text-xs text-mute">Selected coordinates · {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</p>}
        </>}

        {step === 1 && <>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">What kind of change did you notice?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATS.map((category, index) =>
                <label key={category} className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition hover:border-g2 ${form.category === category ? "border-g2 bg-[#F0F6F1] ring-1 ring-g2/20" : "border-line bg-white"}`}>
                  <input type="radio" name="category" value={category} checked={form.category === category} onChange={update("category")} className="mt-1 !h-4 !min-h-0 !w-4 accent-g2" />
                  <span><span className="block text-sm font-semibold text-ink">{category}</span><span className="mt-1 block text-xs leading-relaxed text-mute">{categoryInfo[category] || "Describe an environmental observation for official review."}</span></span>
                </label>
              )}
            </div>
          </fieldset>
          <FormField label="What did you observe?" hint="Describe what you saw, where and when. Please do not speculate about who is responsible.">
            <textarea rows={5} maxLength={1000} value={form.description} onChange={update("description")} placeholder="Describe the visible change or concern…" aria-describedby="description-count" />
            <span id="description-count" className="mt-1 block text-right font-mono text-xs text-mute">{form.description.length}/1000 · at least 10 characters</span>
          </FormField>
          <FormField label="Date first noticed (optional)"><input type="date" value={form.noticed} onChange={update("noticed")} /></FormField>
        </>}

        {step === 2 && <>
          <div className="mb-4 border border-line bg-paper p-4">
            <h2 className="font-bold text-ink">Review your report</h2>
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-mute">Location</dt><dd className="font-medium text-ink">{form.village_city}, {form.district}</dd>
              <dt className="text-mute">Coordinates</dt><dd className="font-mono text-xs text-ink">{pin?.lat.toFixed(5)}, {pin?.lng.toFixed(5)}</dd>
              <dt className="text-mute">Category</dt><dd className="font-medium text-ink">{form.category}</dd>
              <dt className="text-mute">First noticed</dt><dd className="font-medium text-ink">{form.noticed || "Not specified"}</dd>
            </dl>
            <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-sm leading-relaxed text-ink">{form.description}</p>
          </div>
          <FileUploader onFile={setPhoto} label="Supporting photo (optional)" />
          {photoPreview && <div className="mb-4 flex items-center gap-3 rounded border border-line p-2"><img src={photoPreview} alt="Preview of selected supporting evidence" className="h-16 w-16 rounded object-cover" /><span className="min-w-0 truncate text-sm text-mute">{photo?.name}</span><button type="button" className="ml-auto min-h-[40px] px-2 text-sm font-semibold text-red" onClick={() => setPhoto(undefined)}>Remove</button></div>}
          <FormField label="Mobile number" hint="Used to verify your identity when tracking this report.">
            <input inputMode="tel" autoComplete="tel" value={form.mobile} onChange={update("mobile")} placeholder="Enter a contact number" aria-invalid={Boolean(form.mobile) && !validMobile} />
            {Boolean(form.mobile) && !validMobile && <span className="mt-1 block text-xs text-red" role="alert">Enter a valid contact number (10–16 characters).</span>}
          </FormField>
          <label className="mb-3 flex items-start gap-3 rounded border border-line p-3 text-sm leading-relaxed text-ink">
            <input type="checkbox" className="mt-1 !h-4 !min-h-0 !w-4 accent-g2" checked={form.is_anonymous} onChange={update("is_anonymous")} />
            <span>Hide my identity from the public record.</span>
          </label>
          <label className="mb-4 flex items-start gap-3 rounded border border-line p-3 text-sm leading-relaxed text-ink">
            <input type="checkbox" className="mt-1 !h-4 !min-h-0 !w-4 accent-g2" checked={form.consent_given} onChange={update("consent_given")} />
            <span>I consent to this report being reviewed by the authorities. This is a suspicion, not an accusation.</span>
          </label>
        </>}

        {error && <p className="mb-3 rounded border border-red/30 bg-[#FFF5F3] px-3 py-2 text-sm text-red" role="alert">{error}</p>}
        <div className="flex justify-between gap-3 border-t border-line pt-4">
          {step > 0 ? <Button v="ghost" onClick={() => { setError(""); setStep(step - 1); }}>Back</Button> : <span />}
          {step < 2
            ? <Button disabled={!canContinue} onClick={() => { setError(""); setStep(step + 1); }}>Continue <span aria-hidden="true">→</span></Button>
            : <Button disabled={!canContinue || submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit report"}</Button>}
        </div>
      </div>
    </Card>
  </main>;
}
