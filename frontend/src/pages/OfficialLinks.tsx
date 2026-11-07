import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Disclaimer } from "../ui";
import {
  IconCanopy,
  IconStructure,
  IconRiver,
  IconStrata,
  IconGovPillar,
  IconShieldCheck,
  TopoLinesGraphic,
} from "../icons";

interface PortalItem {
  problem: string;
  department: string;
  portal_name: string;
  url: string;
  iconType: "canopy" | "structure" | "river" | "strata" | "pillar";
  description: string;
}

const DEFAULT_PORTALS: PortalItem[] = [
  {
    problem: "Tree Cutting & Forest Loss",
    department: "State Forest Department / MoEFCC",
    portal_name: "PARIVESH - Environmental Grievances",
    url: "https://parivesh.nic.in",
    iconType: "canopy",
    description: "Official portal for reporting tree cutting, illegal forest clearing, and protected sanctuary concerns.",
  },
  {
    problem: "Illegal Construction & Encroachment",
    department: "Municipal Corporation / Town Planning",
    portal_name: "Aaple Sarkar / MahaOnline Grievance Portal",
    url: "https://aaplesarkar.mahaonline.gov.in",
    iconType: "structure",
    description: "Submit official complaints regarding unauthorized structures, building violations, and public land grabbing.",
  },
  {
    problem: "Water Body Issue & Canal Blocking",
    department: "Irrigation & Water Resources Department",
    portal_name: "Water Resources Department Grievance Cell",
    url: "https://wrd.maharashtra.gov.in",
    iconType: "river",
    description: "Report encroachment onto riverbeds, natural wetlands, reservoirs, or unauthorized alteration of water channels.",
  },
  {
    problem: "Illegal Mining, Quarrying & Sand Extraction",
    department: "Directorate of Geology & Mining",
    portal_name: "MahaMining Portal",
    url: "https://mahamining.gov.in",
    iconType: "strata",
    description: "Official redressal portal for unpermitted stone quarrying, earth excavation, and riverbed sand extraction.",
  },
  {
    problem: "General Citizen Grievances & Appeals",
    department: "Department of Administrative Reforms (Govt of India)",
    portal_name: "CPGRAMS - Centralized Public Grievance Portal",
    url: "https://pgportal.gov.in",
    iconType: "pillar",
    description: "National grievance appellate portal for escalating unresolved state or central departmental matters.",
  },
];

export default function OfficialLinks() {
  const [portals] = useState<PortalItem[]>(DEFAULT_PORTALS);

  const renderIcon = (type: PortalItem["iconType"]) => {
    switch (type) {
      case "canopy":
        return <IconCanopy size={22} className="text-g2" />;
      case "structure":
        return <IconStructure size={22} className="text-gov" />;
      case "river":
        return <IconRiver size={22} className="text-[#0284C7]" />;
      case "strata":
        return <IconStrata size={22} className="text-[#B45309]" />;
      case "pillar":
      default:
        return <IconGovPillar size={22} className="text-g1" />;
    }
  };

  return (
    <main className="page-enter mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* Topographic Header Band */}
      <div className="relative mb-6 pb-5 border-b border-line overflow-hidden">
        <TopoLinesGraphic className="absolute right-0 top-0 w-80 text-g2 -z-0" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-g2 mb-1">
              <IconGovPillar size={14} />
              <span>Official Government Redressal Gazette</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-g1">
              Where to Report Officially
            </h1>
            <p className="text-xs sm:text-sm text-mute mt-1 max-w-2xl">
              Direct verified links to designated state and central departmental portals for formal statutory filing.
            </p>
          </div>
          <span className="font-mono text-[10px] text-mute border border-line bg-paper px-2.5 py-1 rounded">
            JURISDICTION REGISTRY · 2026
          </span>
        </div>
      </div>

      {/* Critical Disclaimer Notice without generic emoji box */}
      <div className="mb-6 rounded-[8px] border-l-4 border-amber bg-[#FFFBEB] p-4 text-xs text-[#92400E] leading-relaxed border border-line">
        <div className="flex items-center gap-2 font-bold mb-1">
          <IconShieldCheck size={16} className="text-amber shrink-0" />
          <span>Statutory Filing Disclaimer</span>
        </div>
        <p>
          You will be directed to an official government department portal. BhuRakshak provides satellite AI
          evidence and preliminary cadastral monitoring; it does not replace legal complaints filed on formal state portals.
          Always cite your <strong>BhuRakshak Petition ID</strong> when submitting formal grievances.
        </p>
      </div>

      {/* Official Portals Ledger */}
      <div className="border border-line rounded-[10px] bg-white divide-y divide-line overflow-hidden shadow-sm">
        {portals.map((item, idx) => (
          <div
            key={item.problem}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF9F5] transition group"
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-11 w-11 rounded-[8px] bg-paper border border-line flex items-center justify-center shrink-0 group-hover:border-g2/50 transition">
                {renderIcon(item.iconType)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-g2 bg-[#EAF5EE] px-2 py-0.5 rounded">
                    Registry 0{idx + 1}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mute">
                    {item.problem}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-ink mt-1">
                  {item.department}
                </h3>
                <p className="text-xs text-mute mt-1 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-[11px] font-mono text-gov mt-1.5 font-semibold">
                  Formal Redressal: {item.portal_name}
                </p>
              </div>
            </div>

            <div className="shrink-0 sm:self-center">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[6px] bg-gov px-4 text-xs font-bold text-white hover:bg-[#162942] transition shadow-sm w-full sm:w-auto"
              >
                <span>Open Official Portal</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </main>
  );
}
