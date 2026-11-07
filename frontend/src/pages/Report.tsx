import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, PROBLEM_CATEGORIES } from "../api";
import MapView from "../MapView";
import { Button, Card, FormField, FileUploader, Timeline } from "../ui";
import {
  IconCanopy,
  IconStrata,
  IconBoundary,
  IconStructure,
  IconRiver,
  IconLeaf,
  IconPin,
  IconGps,
  IconShieldCheck,
  IconSearch,
  IconFileDoc,
} from "../icons";

// Helper to render correct SVG icon by iconType
function renderCategoryIcon(iconType: string, isSelected: boolean) {
  const props = {
    size: 24,
    className: isSelected ? "text-g1" : "text-[#4A5950]",
  };
  switch (iconType) {
    case "canopy":
      return <IconCanopy {...props} />;
    case "strata":
      return <IconStrata {...props} />;
    case "boundary":
      return <IconBoundary {...props} />;
    case "structure":
      return <IconStructure {...props} />;
    case "river":
      return <IconRiver {...props} />;
    default:
      return <IconLeaf {...props} />;
  }
}

export default function Report() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: Location, 1: Problem, 2: Submit
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locText, setLocText] = useState("No location selected yet. Tap map or use GPS.");
  const [locating, setLocating] = useState(false);
  const [villageCity, setVillageCity] = useState("Pune");
  const [district, setDistrict] = useState("Pune");

  const [category, setCategory] = useState(PROBLEM_CATEGORIES[0].id);
  const [description, setDescription] = useState("");
  const [noticedDate, setNoticedDate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [mobile, setMobile] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ petition_code: string; status: string } | null>(null);

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  useEffect(() => {
    if (!pin) {
      setPin({ lat: 18.5525, lng: 73.855 });
      setLocText("Location coordinates: 18.5525°N, 73.8550°E (Pune)");
    }
  }, []);

  const handleMapPick = (latlng: { lat: number; lng: number }) => {
    setPin(latlng);
    setLocText(`Pin set: ${latlng.lat.toFixed(4)}°N, ${latlng.lng.toFixed(4)}°E (${villageCity || "Pune"})`);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(coords);
        setLocText(`GPS lock: ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`);
      },
      () => {
        setLocating(false);
        setError("Could not retrieve GPS coordinates. Please tap your location directly on the map.");
      },
      { timeout: 10000 }
    );
  };

  const validMobile = /^[0-9+\-\s()]{10,15}$/.test(mobile.trim());
  const canContinueStep0 = Boolean(pin);
  const canContinueStep1 = description.trim().length >= 5;
  const canSubmit = validMobile && consentGiven;

  const handleSubmit = async () => {
    if (!pin) {
      setError("Please select a location on the map.");
      return;
    }
    if (!validMobile) {
      setError("Please enter a valid 10-digit mobile number for tracking.");
      return;
    }
    if (!consentGiven) {
      setError("Please confirm your acknowledgment to submit.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        latitude: pin.lat,
        longitude: pin.lng,
        village_city: villageCity.trim() || "Pune",
        district: district.trim() || "Pune",
        category,
        description: description.trim() + (noticedDate ? ` (Date noticed: ${noticedDate})` : ""),
        mobile: mobile.trim(),
        is_anonymous: isAnonymous,
        consent_given: true,
      };

      const res = await api.post("/api/petitions", payload);
      setResult(res.data);

      const savedReports = JSON.parse(localStorage.getItem("my_reports") || "[]");
      savedReports.unshift({
        code: res.data.petition_code,
        category,
        mobile: mobile.trim(),
        date: new Date().toISOString(),
      });
      localStorage.setItem("my_reports", JSON.stringify(savedReports));
      localStorage.setItem("last_mobile", mobile.trim());

      if (photo) {
        try {
          const fd = new FormData();
          fd.append("f", photo);
          await api.post(`/api/petitions/${res.data.petition_code}/documents?mobile=${encodeURIComponent(mobile.trim())}`, fd);
        } catch {
          // non-blocking
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not submit your report. Please check connection and retry.");
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS / RECEIPT SCREEN (ELEGANT ENVIRONMENTAL CERTIFICATE)
  if (result) {
    return (
      <main className="page-enter mx-auto max-w-xl px-4 py-8">
        <div className="rounded-[12px] border border-[#CBD8CC] bg-white p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF4ED] text-g1 border border-[#B8D0BC]">
            <IconShieldCheck size={28} />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g2 block">
            Submission Receipt
          </span>
          <h1 className="text-2xl font-extrabold text-g1 mt-1">
            Report Registered with Cadastral System
          </h1>
          <p className="text-xs text-[#526357] mt-2 max-w-sm mx-auto leading-relaxed">
            Your observation has been indexed. The system will correlate this zone with recent satellite passes for field officer review.
          </p>

          {/* Reference Parchment */}
          <div className="my-6 rounded-[8px] border border-[#D5D0C2] bg-[#FAF8F4] p-5 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-mute">
              Petition Reference Code
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-g1 mt-1 tracking-wider">
              {result.petition_code}
            </p>
            <p className="text-xs text-mute mt-1.5 font-mono">Mobile: {mobile}</p>
            <div className="mt-3 inline-block rounded-full bg-white border border-[#D5D0C2] px-3 py-1 text-xs font-bold text-ink">
              Status: {result.status || "Submitted"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <Link
              to={`/track?code=${result.petition_code}&mobile=${encodeURIComponent(mobile)}`}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[8px] bg-g1 px-6 font-bold text-white hover:bg-g2 shadow-sm"
            >
              <IconSearch size={16} />
              <span>Track Live Status</span>
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-[46px] items-center justify-center rounded-[8px] border border-line bg-white px-5 font-bold text-ink hover:bg-paper"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-enter mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D8D2C4] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g2">
            Citizen Observation Submission
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1 mt-0.5">
            Report a Land Disturbance
          </h1>
        </div>
        <span className="text-xs text-mute font-medium">3 simple steps · No login required</span>
      </div>

      {/* 3 Step Timeline (Trail style, no rigid box) */}
      <div className="mb-6 bg-white px-4 py-2 rounded-[8px] border border-[#D2DCD2]">
        <Timeline
          steps={["1. Set Location", "2. Select Issue", "3. Confirm & Submit"]}
          currentStep={step}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-red/30 bg-[#FFF5F3] px-4 py-3 text-xs text-red font-medium">
          {error}
        </div>
      )}

      {/* STEP 1: SELECT LOCATION */}
      {step === 0 && (
        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-line">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ink">
                Step 1: Point to the Observed Location
              </h2>
              <p className="text-xs text-mute">Tap the cadastral map or click GPS lock.</p>
            </div>
            <Button
              v="ghost"
              className="!min-h-[38px] text-xs font-bold border-g2 text-g1 hover:bg-[#EAF5EE] shrink-0 gap-1.5"
              onClick={useMyLocation}
              disabled={locating}
            >
              <IconGps size={15} />
              <span>{locating ? "Acquiring GPS…" : "Acquire My GPS Location"}</span>
            </Button>
          </div>

          {/* Leaflet Map with coordinates stamp */}
          <div className="relative h-[340px] rounded-[8px] overflow-hidden border border-[#BDCBBD]">
            <MapView onPick={handleMapPick} pin={pin} />
            <div className="absolute top-2 left-2 z-[500] bg-white/95 border border-line rounded px-3 py-1.5 shadow-sm text-xs font-mono text-g1 font-semibold">
              {locText}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormField label="Village / Town / Landmark">
              <input
                type="text"
                value={villageCity}
                onChange={(e) => setVillageCity(e.target.value)}
                placeholder="e.g. Mulshi, Lonavala, Hinjawadi"
                className="w-full text-sm"
              />
            </FormField>
            <FormField label="Administrative District">
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full text-sm"
              />
            </FormField>
          </div>

          <div className="mt-4 pt-3 border-t border-line flex justify-end">
            <Button
              v="primary"
              className="w-full sm:w-auto"
              disabled={!canContinueStep0}
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              Next: Disturbance Details →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: DESCRIBE PROBLEM */}
      {step === 1 && (
        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 pb-3 border-b border-line">
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Step 2: Choose Disturbance Type
            </h2>
            <p className="text-xs text-mute">Select one primary category and describe the visual change.</p>
          </div>

          {/* Category Cards with bespoke SVG vector marks (NO EMOJIS) */}
          <div className="mb-5">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-mute">
              Disturbance Category
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PROBLEM_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center text-center p-3.5 rounded-[8px] border transition-all duration-150 ${
                      isSelected
                        ? "border-g2 bg-[#EAF3EC] ring-2 ring-g2/25 text-g1 font-extrabold shadow-sm"
                        : "border-[#D6DEC6] bg-[#FCFBF8] hover:border-g2 hover:bg-white text-ink"
                    }`}
                  >
                    <div className="mb-2 p-2 rounded-full bg-white border border-[#D5DDC5]">
                      {renderCategoryIcon(cat.iconType, isSelected)}
                    </div>
                    <span className="text-xs font-bold leading-tight">{cat.title}</span>
                    <span className="text-[10px] text-mute mt-1 line-clamp-2 leading-tight">
                      {cat.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <FormField
            label="Visual Observation"
            hint="Describe what was observed on the ground (e.g., cleared boundary, soil machinery, unpermitted foundation)."
          >
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Several old trees cleared along the ravine slope; excavator tracks present on site..."
              className="w-full text-xs"
            />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Date Noticed (Optional)">
              <input
                type="date"
                value={noticedDate}
                onChange={(e) => setNoticedDate(e.target.value)}
                className="w-full text-xs"
              />
            </FormField>

            <FileUploader
              onFile={setPhoto}
              label="Field Photograph (Optional)"
              hint="Attach photo from your camera or gallery."
            />
          </div>

          {photoPreview && (
            <div className="mb-4 flex items-center gap-3 p-2.5 border border-line rounded-[8px] bg-paper">
              <img src={photoPreview} alt="Selected ground photograph" className="h-14 w-14 rounded object-cover border border-line" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink truncate">{photo?.name}</p>
                <p className="text-[10px] text-mute">Photo ready to upload with report</p>
              </div>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="text-xs font-bold text-red hover:underline px-2"
              >
                Remove
              </button>
            </div>
          )}

          <div className="mt-5 pt-3 border-t border-line flex justify-between gap-3">
            <Button v="ghost" onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Button
              v="primary"
              disabled={!canContinueStep1}
              onClick={() => {
                setError("");
                setStep(2);
              }}
            >
              Next: Review & Submit →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRM & SUBMIT */}
      {step === 2 && (
        <div className="rounded-[10px] border border-[#CBD8CC] bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 pb-3 border-b border-line">
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Step 3: Confirm and File Report
            </h2>
            <p className="text-xs text-mute">Review your observation summary and enter your mobile number to receive tracking updates.</p>
          </div>

          {/* Clean Summary (Natural table layout, not boxes) */}
          <div className="rounded-[8px] border border-[#D5D0C2] bg-[#FAF8F4] p-4 mb-5 text-xs text-ink space-y-2.5">
            <div className="flex justify-between border-b border-[#E2DDD0] pb-1.5">
              <span className="text-mute font-medium">Disturbance Type:</span>
              <span className="font-bold text-g1">{category}</span>
            </div>
            <div className="flex justify-between border-b border-[#E2DDD0] pb-1.5">
              <span className="text-mute font-medium">Cadastral Location:</span>
              <span className="font-medium">{villageCity}, {district}</span>
            </div>
            <div className="flex justify-between border-b border-[#E2DDD0] pb-1.5">
              <span className="text-mute font-medium">Geographic Coordinate:</span>
              <span className="font-mono text-[11px]">{pin?.lat.toFixed(4)}°N, {pin?.lng.toFixed(4)}°E</span>
            </div>
            {noticedDate && (
              <div className="flex justify-between border-b border-[#E2DDD0] pb-1.5">
                <span className="text-mute font-medium">Date Noticed:</span>
                <span>{noticedDate}</span>
              </div>
            )}
            <div>
              <span className="text-mute font-medium block mb-1">Observation Remarks:</span>
              <p className="bg-white p-2.5 rounded border border-[#E0DBCF] text-ink leading-relaxed">
                "{description}"
              </p>
            </div>
            {photo && (
              <p className="text-[11px] text-g2 font-semibold pt-1">
                ✓ Attached file: {photo.name}
              </p>
            )}
          </div>

          <FormField
            label="Registered Contact Number (For Tracking Updates)"
            hint="You will use this 10-digit number and your Petition ID to track official action. No password needed."
          >
            <input
              type="tel"
              inputMode="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full text-base font-mono"
            />
          </FormField>

          <label className="mb-3 flex items-start gap-2.5 cursor-pointer text-xs text-ink select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 rounded accent-g2"
            />
            <span>Keep identity unlisted on public observation map.</span>
          </label>

          <label className="mb-5 flex items-start gap-2.5 cursor-pointer text-xs text-ink select-none p-3 bg-[#FAF8F4] rounded-[6px] border border-[#D5D0C2]">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded accent-g2"
            />
            <span className="leading-relaxed">
              I certify that this observation is made in good faith for review by authorized public land authorities.
            </span>
          </label>

          <div className="pt-3 border-t border-line flex justify-between gap-3">
            <Button v="ghost" disabled={submitting} onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button
              v="primary"
              className="px-8 !min-h-[48px] text-sm font-bold"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Transmitting Report…" : "File Observation Report"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
