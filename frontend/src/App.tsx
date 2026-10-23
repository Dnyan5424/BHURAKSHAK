import { useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { role, T } from "./api";
import Landing from "./pages/Landing";
import Report from "./pages/Report";
import Track from "./pages/Track";
import MapDash from "./pages/MapDash";
import CaseDetail from "./pages/CaseDetail";
import Login from "./pages/Login";
import Officer from "./pages/Officer";
import Admin from "./pages/Admin";

export default function App() {
  const [lang, setLang] = useState("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  const t = T[lang];
  const currentRole = role();
  const isCitizen = !currentRole || currentRole === "citizen";
  const navigation = [
    { to: "/map", label: t.map },
    ...(isCitizen
      ? [
          { to: "/report", label: t.report },
          { to: "/track", label: t.track },
        ]
      : []),
    ...(currentRole === "officer" || currentRole === "admin"
      ? [{ to: "/officer", label: t.officer }]
      : []),
    ...(currentRole === "admin" ? [{ to: "/admin", label: t.admin }] : []),
  ];
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[42px] items-center rounded-md border px-3 text-sm font-medium transition-colors ${
      isActive
        ? "border-white/20 bg-white/10 text-white"
        : "border-transparent text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-[1000] border-b border-white/10 bg-g1 text-white shadow-sm">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 sm:flex-nowrap sm:gap-4">
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex min-h-[60px] shrink-0 items-center gap-2 font-head text-lg font-extrabold tracking-tight text-white">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-md border border-white/25 bg-white/10 text-accent">B</span>
            BhuRakshak
          </Link>
          <button
            type="button"
            className="ml-auto min-h-[40px] rounded-md border border-white/25 px-3 text-sm font-semibold hover:bg-white/10 sm:hidden"
            aria-controls="main-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
          <div className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-3 pb-3 sm:flex sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:pb-0`}>
            <nav id="main-navigation" aria-label="Main navigation" className="flex flex-col gap-1 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
              {navigation.map(item => (
                <NavLink key={item.to} to={item.to} className={navClass} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              {currentRole && <span className="text-xs font-semibold capitalize text-white/75">{currentRole} workspace</span>}
              <label className="sr-only" htmlFor="language">Language</label>
              <select id="language" aria-label="Language" value={lang} onChange={e => setLang(e.target.value)} className="!min-h-[36px] !w-auto !border-white/20 !bg-white/10 !px-2 !py-1 !text-xs !text-white">
                <option value="en" className="text-ink">EN</option>
                <option value="hi" className="text-ink">हिं</option>
                <option value="mr" className="text-ink">मरा</option>
              </select>
              {currentRole ? (
                <button className="min-h-[40px] px-2 text-sm text-white/80 hover:text-white" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); setMenuOpen(false); nav("/"); }}>Sign out</button>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)} className="flex min-h-[40px] items-center rounded-md border border-white/25 px-3 text-sm font-semibold hover:bg-white/10">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/report" element={<Report />} />
        <Route path="/track" element={<Track />} />
        <Route path="/map" element={<MapDash />} />
        <Route path="/case/:id" element={<CaseDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/officer" element={<Officer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <footer className="border-t border-line bg-white px-4 py-5 text-center text-xs text-mute">
        <p>Demo satellite scenes are synthetic and Sentinel-2-like. Map data © OpenStreetMap contributors, ODbL.</p>
        <p className="mt-1">Demonstration data is synthetic. Preliminary AI findings are not legal determinations.</p>
      </footer>
    </div>
  );
}
