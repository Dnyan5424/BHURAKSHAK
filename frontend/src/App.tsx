import { lazy, Suspense, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { role, T } from "./api";
import {
  IconCanopy,
  IconPin,
  IconSearch,
  IconMapSheet,
  IconBell,
  IconShieldCheck,
  IconSatellite,
  IconGovPillar,
  IconConsole,
  IconFileDoc,
  IconLeaf,
} from "./icons";
const Landing = lazy(() => import("./pages/Landing"));
const Report = lazy(() => import("./pages/Report"));
const Track = lazy(() => import("./pages/Track"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Officer = lazy(() => import("./pages/Officer"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const MonitoringAreas = lazy(() => import("./pages/MonitoringAreas"));
const SatelliteImages = lazy(() => import("./pages/SatelliteImages"));
const AdminCases = lazy(() => import("./pages/AdminCases"));
const OfficialLinks = lazy(() => import("./pages/OfficialLinks"));
const MapDash = lazy(() => import("./pages/MapDash"));
const Login = lazy(() => import("./pages/Login"));

export default function App() {
  const [lang, setLang] = useState("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = T[lang] || T.en;
  const currentRole = role();

  // Role-specific navigation items (Maximum 5 items, using custom SVG icons, ZERO emojis)
  const getNavItems = () => {
    if (currentRole === "admin") {
      return [
        { to: "/admin", label: t.dashboard, icon: <IconConsole size={16} /> },
        { to: "/admin/areas", label: t.monitoringAreas, icon: <IconPin size={16} /> },
        { to: "/admin/satellite", label: t.satelliteImages, icon: <IconSatellite size={16} /> },
        { to: "/admin/cases", label: t.adminCases, icon: <IconFileDoc size={16} /> },
        { to: "/official-links", label: t.officialLinks, icon: <IconGovPillar size={16} /> },
      ];
    }
    if (currentRole === "officer") {
      return [
        { to: "/officer", label: t.officerCases, icon: <IconShieldCheck size={16} /> },
        { to: "/satellite", label: t.satelliteImages, icon: <IconSatellite size={16} /> },
        { to: "/map", label: t.map, icon: <IconMapSheet size={16} /> },
        { to: "/official-links", label: t.officialLinks, icon: <IconGovPillar size={16} /> },
        { to: "/notifications", label: t.notifications, icon: <IconBell size={16} /> },
      ];
    }
    // Citizen / Public (default)
    return [
      { to: "/", label: t.home, icon: <IconLeaf size={16} /> },
      { to: "/report", label: t.report, icon: <IconCanopy size={16} /> },
      { to: "/track", label: t.track, icon: <IconSearch size={16} /> },
      { to: "/map", label: t.map, icon: <IconMapSheet size={16} /> },
      { to: "/notifications", label: t.notifications, icon: <IconBell size={16} /> },
    ];
  };

  const navItems = getNavItems();

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setMenuOpen(false);
    navigate("/");
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[40px] items-center gap-2 rounded-[6px] px-3 text-xs sm:text-sm font-semibold transition ${
      isActive
        ? "bg-white/20 text-white shadow-sm font-bold"
        : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  // Mobile Bottom Nav items (Zero emojis, pristine vector iconography)
  const mobileBottomItems =
    currentRole === "admin"
      ? [
          { to: "/admin", label: "Overview", icon: <IconConsole size={18} /> },
          { to: "/admin/satellite", label: "Satellite", icon: <IconSatellite size={18} /> },
          { to: "/admin/areas", label: "Areas", icon: <IconPin size={18} /> },
          { to: "/admin/cases", label: "Cases", icon: <IconFileDoc size={18} /> },
        ]
      : currentRole === "officer"
      ? [
          { to: "/officer", label: "Cases", icon: <IconShieldCheck size={18} /> },
          { to: "/satellite", label: "Satellite", icon: <IconSatellite size={18} /> },
          { to: "/map", label: "Map", icon: <IconMapSheet size={18} /> },
          { to: "/official-links", label: "Portals", icon: <IconGovPillar size={18} /> },
          { to: "/notifications", label: "Alerts", icon: <IconBell size={18} /> },
        ]
      : [
          { to: "/", label: "Home", icon: <IconLeaf size={18} /> },
          { to: "/report", label: "Report", icon: <IconCanopy size={18} /> },
          { to: "/track", label: "Track", icon: <IconSearch size={18} /> },
          { to: "/map", label: "Map", icon: <IconMapSheet size={18} /> },
          { to: "/notifications", label: "Alerts", icon: <IconBell size={18} /> },
        ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink pb-16 sm:pb-0 font-sans">
      {/* ENVIRONMENTAL TOP HEADER */}
      <header className="sticky top-0 z-[1000] border-b border-[#244E36] bg-[#122E21] text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          {/* Logo & Cartographic Marker */}
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 font-head text-base sm:text-lg font-extrabold tracking-tight text-white select-none"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-[6px] bg-[#2D6A4F] text-accent font-extrabold text-sm border border-accent/30 shadow-inner"
            >
              BR
            </span>
            <span className="flex flex-col">
              <span className="leading-tight tracking-tight">BhuRakshak</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#74C69D] font-mono">
                Land Intelligence
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1"
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Controls: Language, Role & Sign Out */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Language selection"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="!min-h-[34px] !w-auto !border-white/20 !bg-white/10 !px-2.5 !py-1 !text-xs !text-white !rounded-[6px] font-medium"
            >
              <option value="en" className="text-ink">English</option>
              <option value="hi" className="text-ink">हिन्दी</option>
              <option value="mr" className="text-ink">मराठी</option>
            </select>

            {currentRole ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline-block text-[10px] font-bold text-accent uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 bg-white/5">
                  {currentRole}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="min-h-[34px] rounded-[6px] border border-white/20 px-2.5 text-xs font-semibold text-white/90 hover:bg-white/10"
                >
                  {t.signOut}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex min-h-[34px] items-center rounded-[6px] bg-[#2D6A4F] border border-accent/40 px-3 text-xs font-bold text-white hover:bg-g2"
              >
                {t.signIn}
              </Link>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-[6px] border border-white/20 text-white text-sm"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#122E21] px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={navClass}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* MAIN VIEW */}
      <div className="flex-1">
        <Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-sm font-semibold text-mute">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/report" element={<Report />} />
            <Route path="/track" element={<Track />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/officer" element={<Officer />} />
            <Route path="/case/:id" element={<CaseDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/areas" element={<MonitoringAreas />} />
            <Route path="/admin/satellite" element={<SatelliteImages />} />
            <Route path="/satellite" element={<SatelliteImages />} />
            <Route path="/admin/cases" element={<AdminCases />} />
            <Route path="/official-links" element={<OfficialLinks />} />
            <Route path="/map" element={<MapDash />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Suspense>
      </div>

      {/* CARTOGRAPHIC FOOTER */}
      <footer className="border-t border-[#D5D0C2] bg-[#FAF8F4] px-4 py-5 text-xs text-mute mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-semibold text-[#3D4C41]">
              BhuRakshak · Civic Land-Use Intelligence System
            </p>
            <p className="text-[11px] text-[#718075] mt-0.5">
              Topographic base layers © OpenStreetMap contributors. Western Ghats Ecological Zone.
            </p>
          </div>
          <div className="text-[11px] text-[#718075]">
            Remote sensing observations are advisory; field officer verification is required.
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED FOR THUMB ERGONOMICS) */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-[1100] bg-white border-t border-[#D0CABE] shadow-lg flex items-center justify-around py-1.5 px-2"
      >
        {mobileBottomItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[54px] rounded-[6px] transition text-center ${
                isActive ? "text-g1 font-extrabold" : "text-[#627065] hover:text-ink"
              }`}
            >
              <span className="mb-0.5 text-g2">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
