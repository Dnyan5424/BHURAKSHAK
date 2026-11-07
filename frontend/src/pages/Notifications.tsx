import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, role } from "../api";
import { Button, FormField } from "../ui";
import {
  IconBell,
  IconShieldCheck,
  IconFileDoc,
  IconPulse,
  IconSearch,
  TopoLinesGraphic,
} from "../icons";

export default function Notifications() {
  const [mobile, setMobile] = useState(localStorage.getItem("last_mobile") || "");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentRole = role();

  const loadNotifications = (m?: string) => {
    setLoading(true);
    setError("");
    const params = m ? { mobile: m.trim() } : {};
    api
      .get("/api/notifications", { params })
      .then((res) => {
        setNotifications(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setError("Unable to load notifications. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications(mobile);
  }, []);

  return (
    <main className="page-enter mx-auto max-w-3xl px-4 py-8">
      {/* Topographic Header Band */}
      <div className="relative mb-6 pb-5 border-b border-line overflow-hidden">
        <TopoLinesGraphic className="absolute right-0 top-0 w-80 text-g2 -z-0" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-g2 mb-1">
              <IconBell size={14} />
              <span>Real-Time Environmental Dispatch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-g1">
              My Notifications
            </h1>
            <p className="text-xs sm:text-sm text-mute mt-1">
              Chronological log of verified officer determinations and satellite change alerts.
            </p>
          </div>
          {currentRole && (
            <span className="font-mono text-[10px] text-gov border border-line bg-paper px-2.5 py-1 rounded font-bold uppercase">
              {currentRole} Session
            </span>
          )}
        </div>
      </div>

      {/* Filter by mobile number strip */}
      <div className="mb-6 rounded-[10px] border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <FormField label="Filter by registered 10-digit mobile number">
              <div className="relative">
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full text-sm font-mono pl-9"
                />
                <IconSearch
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
                />
              </div>
            </FormField>
          </div>
          <Button
            className="w-full sm:w-auto shrink-0 !min-h-[44px]"
            onClick={() => {
              if (mobile) localStorage.setItem("last_mobile", mobile.trim());
              loadNotifications(mobile);
            }}
          >
            Filter Logs
          </Button>
          {mobile && (
            <Button
              v="ghost"
              className="w-full sm:w-auto shrink-0 !min-h-[44px]"
              onClick={() => {
                setMobile("");
                loadNotifications("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[8px] border-l-4 border-red bg-[#FFF5F3] px-4 py-3 text-xs text-red font-medium border border-line">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-mute text-xs font-mono">
          FETCHING SATELLITE DISPATCH STREAM…
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line bg-white p-10 text-center">
          <div className="h-12 w-12 rounded-full bg-paper border border-line flex items-center justify-center mx-auto mb-3 text-mute">
            <IconBell size={22} />
          </div>
          <p className="font-extrabold text-sm text-ink">No Notification Logs Found</p>
          <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
            When you submit a land-use observation or a verification officer issues a cadastral ruling, alerts will appear in this ledger.
          </p>
          <Link
            to="/report"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-g2 hover:underline"
          >
            <span>Submit a land observation</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className="border border-line rounded-[10px] bg-white divide-y divide-line overflow-hidden shadow-sm">
          {notifications.map((n: any, idx: number) => {
            const isDecision = n.message?.toLowerCase().includes("decision");
            const isReceived = n.message?.toLowerCase().includes("received");

            return (
              <div
                key={n.id || idx}
                className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-[#FAF9F5] transition ${
                  isDecision
                    ? "border-l-4 border-l-g2"
                    : isReceived
                    ? "border-l-4 border-l-gov"
                    : "border-l-4 border-l-amber"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-[6px] flex items-center justify-center shrink-0 ${
                    isDecision
                      ? "bg-[#EAF5EE] text-g2"
                      : isReceived
                      ? "bg-[#EBF2FA] text-gov"
                      : "bg-[#FEF3C7] text-amber"
                  }`}
                >
                  {isDecision ? (
                    <IconShieldCheck size={18} />
                  ) : isReceived ? (
                    <IconFileDoc size={18} />
                  ) : (
                    <IconPulse size={18} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-ink uppercase tracking-wide">
                      {isDecision
                        ? "Officer Verification Decision"
                        : isReceived
                        ? "Complaint Filed & Registered"
                        : "Cadastral Change Alert"}
                    </span>
                    <span className="text-[10px] font-mono text-mute">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }) +
                          ", " +
                          new Date(n.created_at).toLocaleDateString()
                        : "Recent"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-mute leading-relaxed font-sans">
                    {n.message}
                  </p>

                  {n.mobile && (
                    <p className="mt-2 text-[10px] font-mono text-mute flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-g2"></span>
                      <span>Target Phone: {n.mobile}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
