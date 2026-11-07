import axios from "axios";

export const API = (import.meta as any).env.VITE_API || "http://localhost:8000";
export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/api/auth/login") &&
      !error.config?.url?.includes("/api/notifications")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      if (window.location.pathname.startsWith("/officer") || window.location.pathname.startsWith("/admin")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export const role = () =>
  localStorage.getItem("token") ? localStorage.getItem("role") : null;

export const PROBLEM_CATEGORIES = [
  {
    id: "Tree Cutting",
    title: "Tree Cutting",
    iconType: "canopy",
    desc: "Loss of tree canopy, logging, or clearing of green cover",
  },
  {
    id: "Quarrying / Excavation",
    title: "Quarrying / Excavation",
    iconType: "strata",
    desc: "Open stone quarrying, hill cutting, or ground excavation",
  },
  {
    id: "Encroachment",
    title: "Encroachment",
    iconType: "boundary",
    desc: "Unauthorized boundary fencing on forest or revenue land",
  },
  {
    id: "New Construction",
    title: "New Construction",
    iconType: "structure",
    desc: "Unpermitted concrete footings or new building activity",
  },
  {
    id: "Water Body Issue",
    title: "Water Body Issue",
    iconType: "river",
    desc: "Riverbed alteration, lake filling, or canal encroachment",
  },
  {
    id: "Other",
    title: "Other",
    iconType: "leaf",
    desc: "Other visible environmental or natural habitat concerns",
  },
];

export const CATS = PROBLEM_CATEGORIES.map((c) => c.id);

export const ACTIVITY_TYPES = [
  "All activities",
  "Deforestation / tree-cover loss",
  "Illegal mining / excavation",
  "Unpermitted construction",
  "Water-body alteration",
];

export const T: any = {
  en: {
    home: "Home",
    report: "Report a Problem",
    track: "Track My Report",
    map: "Public Map",
    notifications: "My Notifications",
    officerCases: "My Cases",
    takeDecision: "Take Decision",
    dashboard: "Dashboard",
    monitoringAreas: "Monitoring Areas",
    satelliteImages: "Check Satellite Images",
    adminCases: "Cases",
    officialLinks: "Official Links",
    signIn: "Sign In",
    signOut: "Sign Out",
    disclaimer:
      "Preliminary AI observation for review only. Not a legal determination.",
  },
  hi: {
    home: "मुख्य पृष्ठ",
    report: "समस्या दर्ज करें",
    track: "रिपोर्ट ट्रैक करें",
    map: "सार्वजनिक नक्शा",
    notifications: "मेरी सूचनाएं",
    officerCases: "मेरे मामले",
    takeDecision: "निर्णय लें",
    dashboard: "डैशबोर्ड",
    monitoringAreas: "निगरानी क्षेत्र",
    satelliteImages: "उपग्रह चित्र जांचें",
    adminCases: "मामले",
    officialLinks: "आधिकारिक लिंक",
    signIn: "लॉग इन",
    signOut: "लॉग आउट",
    disclaimer: "प्रारंभिक उपग्रह संकेत केवल समीक्षा हेतु। यह कोई कानूनी निर्णय नहीं है।",
  },
  mr: {
    home: "मुख्य पान",
    report: "तक्रार नोंदवा",
    track: "तक्रार मागोवा",
    map: "सार्वजनिक नकाशा",
    notifications: "माझ्या सूचना",
    officerCases: "माझी प्रकरणे",
    takeDecision: "निर्णय घ्या",
    dashboard: "डॅशबोर्ड",
    monitoringAreas: "देखरेख क्षेत्र",
    satelliteImages: "उपग्रह प्रतिमा तपासा",
    adminCases: "प्रकरणे",
    officialLinks: "शासकीय दुवे",
    signIn: "लॉग इन",
    signOut: "बाहेर पडा",
    disclaimer: "प्राथमिक उपग्रह निरीक्षण केवळ तपासणीसाठी. हा कायदेशीर निर्णय नाही.",
  },
};

export const DISCLAIMER =
  "Preliminary AI observation for review only. Not a legal determination. Officer verification is required.";

export async function download(url: string, name: string) {
  const r = await api.get(url, { responseType: "blob" });
  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(r.data);
  a.href = objectUrl;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    a.remove();
  }, 1000);
}
