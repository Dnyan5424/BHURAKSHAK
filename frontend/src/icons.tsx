import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// 1. Botanical Canopy (Replaces 🌳)
export function IconCanopy({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 21v-7" />
      <path d="M7 16a5 5 0 0 1-2-4 5 5 0 0 1 7-4.5A5 5 0 0 1 19 12a5 5 0 0 1-2 4" />
      <path d="M9 14l3-3 3 3" />
    </svg>
  );
}

// 2. Quarry / Excavation Strata (Replaces ⛏️)
export function IconStrata({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M5 11h14" />
      <path d="M3 16h18" />
      <path d="M8 6v10" strokeDasharray="2 2" />
      <path d="M16 11v5" strokeDasharray="2 2" />
      <path d="M2 20h20" strokeWidth="2.2" />
    </svg>
  );
}

// 3. Boundary & Parcel Encroachment (Replaces 🚧)
export function IconBoundary({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" strokeDasharray="4 3" />
      <path d="M3 12h18" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

// 4. Built-Up Structure (Replaces 🏗️)
export function IconStructure({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10h2" />
      <path d="M13 10h2" />
      <path d="M9 14h2" />
      <path d="M13 14h2" />
      <path d="M10 21v-4h4v4" />
    </svg>
  );
}

// 5. River Basin & Water Body (Replaces 💧)
export function IconRiver({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 7c3-2 6 2 9 0s6 2 9 0" />
      <path d="M3 12c3-2 6 2 9 0s6 2 9 0" />
      <path d="M3 17c3-2 6 2 9 0s6 2 9 0" />
    </svg>
  );
}

// 6. Natural / Other Observation (Replaces ❓)
export function IconLeaf({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 21 3c-1.5 4-2 5.5-3.1 11.2A7 7 0 0 1 11 20z" />
      <path d="M2 21c0-4 1.5-7.5 7-9" />
    </svg>
  );
}

// 7. Geodetic Compass / Pin (Replaces 📍)
export function IconPin({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="10" r="3" />
      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
    </svg>
  );
}

// 8. GPS Satellite Precision Target (Replaces 🎯)
export function IconGps({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

// 9. Satellite Observation Lens (Replaces 🛰️)
export function IconSatellite({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M13 7l4 4" />
      <path d="M8 12l4 4" />
      <rect x="9" y="8" width="6" height="8" rx="1" transform="rotate(-45 12 12)" />
      <path d="M14.5 4.5l4 4" />
      <path d="M5.5 13.5l4 4" />
      <path d="M3 21l3-3" />
      <path d="M8 21a8 8 0 0 1-5-5" strokeDasharray="2 2" />
    </svg>
  );
}

// 10. Verified Officer Shield (Replaces 🛡️, 👮)
export function IconShieldCheck({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 3s7 2 7 9c0 5-4.5 8.5-7 9.5-2.5-1-7-4.5-7-9.5 0-7 7-9 7-9z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

// 11. Geo Search & Tracking (Replaces 🔍)
export function IconSearch({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

// 12. Topographic Map Sheet (Replaces 🗺️)
export function IconMapSheet({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

// 13. Official Governance Pillar (Replaces 🏛️)
export function IconGovPillar({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 20h20" />
      <path d="M4 17h16" />
      <path d="M12 2l10 5H2z" />
      <path d="M6 17V9" />
      <path d="M10 17V9" />
      <path d="M14 17V9" />
      <path d="M18 17V9" />
    </svg>
  );
}

// 14. Real-time Eco Notification Bell (Replaces 🔔)
export function IconBell({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// 15. PDF / Official Audit File (Replaces 📄)
export function IconFileDoc({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

// 16. Fast Automated Trigger (Replaces ⚡)
export function IconPulse({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// 17. Citizen User Silhouette (Replaces 👤)
export function IconCitizen({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

// 18. Administrator Rig / Console (Replaces ⚙️)
export function IconConsole({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// 19. Elevation Topographic Curve Graphic (Artistic Environmental Background Accent)
export function TopoLinesGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none opacity-[0.14] ${className}`}
      aria-hidden="true"
    >
      <path
        d="M-40 40 C 120 10, 200 90, 360 50 C 480 20, 560 80, 640 40"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-40 80 C 140 50, 180 140, 340 100 C 460 70, 540 130, 640 80"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-40 120 C 100 100, 240 180, 380 140 C 500 110, 560 170, 640 130"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-40 160 C 130 140, 210 220, 370 180 C 490 150, 570 210, 640 170"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-40 200 C 110 180, 260 250, 410 210 C 510 190, 580 240, 640 210"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
