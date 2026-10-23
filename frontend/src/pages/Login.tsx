import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Button, Card, FormField } from "../ui";

const demoUsers = [
  { role: "Officer", email: "officer@demo.com", password: "Officer@123" },
  { role: "Administrator", email: "admin@demo.com", password: "Admin@123" },
  { role: "Citizen", email: "citizen@demo.com", password: "Citizen@123" },
];

export default function Login() {
  const [email, setEmail] = useState("officer@demo.com");
  const [password, setPassword] = useState("Officer@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function signIn(event: any) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      navigate(response.data.role === "admin" ? "/admin" : response.data.role === "officer" ? "/officer" : "/map");
    } catch {
      setError("Sign-in failed. Check the email and password, then try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="page-enter mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_1fr] md:items-center md:py-12">
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gov">Secure workspace access</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Sign in to BhuRakshak</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-mute">Officer and administrator workspaces support evidence review, verification and case management. Citizens can sign in to explore the public map and submit reports.</p>
      <div className="mt-5 border-l-2 border-accent bg-white p-4 text-sm leading-relaxed text-mute">A preliminary satellite signal is not a legal determination. Official decisions remain with authorised officers.</div>
      <Link to="/map" className="mt-5 inline-flex min-h-[40px] items-center font-semibold text-g1 underline underline-offset-2">Continue to public map</Link>
    </section>

    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-bold">Account sign-in</h2>
      <p className="mt-1 text-sm text-mute">Use your registered account details.</p>
      <form className="mt-5" onSubmit={signIn}>
        <FormField label="Email"><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></FormField>
        <FormField label="Password"><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></FormField>
        {error && <p className="mb-3 rounded border border-red/30 bg-[#FFF5F3] px-3 py-2 text-sm text-red" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-ink">Synthetic demo accounts</h3><span className="text-[10px] font-bold uppercase tracking-wider text-mute">Demo only</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {demoUsers.map(user => <button key={user.role} type="button" onClick={() => { setEmail(user.email); setPassword(user.password); setError(""); }} className="min-h-[42px] rounded border border-line bg-white px-2 text-xs font-semibold text-g1 hover:border-g2 hover:bg-paper">{user.role}</button>)}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-mute">Selecting a role fills demo credentials. These accounts are for demonstration use only.</p>
      </div>
    </Card>
  </main>;
}
