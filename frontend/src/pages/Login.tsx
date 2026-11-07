import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Button, FormField } from "../ui";
import {
  IconCitizen,
  IconShieldCheck,
  IconConsole,
  IconPulse,
  TopoLinesGraphic,
} from "../icons";

interface DemoAccount {
  role: "Citizen" | "Officer" | "Admin";
  email: string;
  password: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "Citizen",
    email: "citizen@demo.com",
    password: "Citizen@123",
    desc: "Report & Track",
  },
  {
    role: "Officer",
    email: "officer@demo.com",
    password: "Officer@123",
    desc: "Verify & Sign-off",
  },
  {
    role: "Admin",
    email: "admin@demo.com",
    password: "Admin@123",
    desc: "Satellite & Cadastre",
  },
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("officer@demo.com");
  const [password, setPassword] = useState("Officer@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await api.post("/api/auth/register", { name, mobile, email, password });
      }
      const res = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      if (res.data.role === "admin") navigate("/admin");
      else if (res.data.role === "officer") navigate("/officer");
      else navigate("/report");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Authentication failed. Please verify credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectDemoUser = (user: DemoAccount) => {
    setIsRegister(false);
    setEmail(user.email);
    setPassword(user.password);
    setError("");
  };

  const renderRoleIcon = (roleName: DemoAccount["role"]) => {
    switch (roleName) {
      case "Citizen":
        return <IconCitizen size={20} />;
      case "Officer":
        return <IconShieldCheck size={20} />;
      case "Admin":
        return <IconConsole size={20} />;
    }
  };

  return (
    <main className="page-enter mx-auto max-w-md px-4 py-8 sm:py-12">
      {/* Topographic Header Band */}
      <div className="relative text-center mb-6 pb-4 border-b border-line overflow-hidden">
        <TopoLinesGraphic className="absolute inset-0 w-full text-g2 -z-0" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-g2 mb-1">
            <IconShieldCheck size={14} />
            <span>Cadastral Security Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-g1">
            {isRegister ? "New Portal Account" : "Access Workspace"}
          </h1>
          <p className="text-xs text-mute mt-1">
            {isRegister
              ? "Register a verified citizen or department account"
              : "Select a preconfigured role or sign in with registered credentials"}
          </p>
        </div>
      </div>

      {/* 1-CLICK DEMO ROLE SELECTOR */}
      {!isRegister && (
        <div className="mb-5 rounded-[10px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
            <span className="text-[10px] font-mono font-bold text-g2 uppercase tracking-wider flex items-center gap-1.5">
              <IconPulse size={12} />
              <span>Instant Role Select</span>
            </span>
            <span className="text-[10px] font-mono text-mute">3 Roles Available</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((u) => {
              const isSelected = email === u.email;
              return (
                <button
                  key={u.role}
                  type="button"
                  onClick={() => selectDemoUser(u)}
                  className={`flex flex-col items-center justify-center p-3 rounded-[6px] border text-center transition ${
                    isSelected
                      ? "border-g2 bg-[#EAF5EE] text-g1 font-extrabold ring-1 ring-g2"
                      : "border-line bg-white hover:bg-paper text-ink"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mb-1.5 ${
                      isSelected
                        ? "bg-g2 text-white"
                        : "bg-paper text-mute border border-line"
                    }`}
                  >
                    {renderRoleIcon(u.role)}
                  </div>
                  <span className="text-xs font-bold leading-tight">{u.role}</span>
                  <span className="text-[9px] text-mute mt-0.5 leading-tight">{u.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LOGIN / REGISTER DOSSIER FORM */}
      <div className="rounded-[10px] border border-line bg-white p-5 sm:p-6 shadow-sm">
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <>
              <FormField label="Full Name">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full text-sm"
                />
              </FormField>
              <FormField label="Mobile Number (10 digits)">
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full text-sm font-mono"
                />
              </FormField>
            </>
          )}

          <FormField label="Government / Account Email">
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@demo.com"
              className="w-full text-sm"
            />
          </FormField>

          <FormField label="Password">
            <input
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm font-mono"
            />
          </FormField>

          {error && (
            <div className="rounded-[6px] border-l-4 border-red bg-[#FFF5F3] px-3.5 py-2.5 text-xs text-red font-medium border border-line">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full !min-h-[44px] text-xs font-bold uppercase tracking-wider"
            disabled={loading}
          >
            {loading ? "Authenticating Token…" : isRegister ? "Create Account" : "Enter Secure Workspace"}
          </Button>
        </form>

        <div className="mt-5 pt-3 border-t border-line text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-xs font-bold text-g2 hover:underline"
          >
            {isRegister
              ? "Already registered? Sign In"
              : "Need a new citizen / officer account? Register here"}
          </button>
        </div>
      </div>
    </main>
  );
}
