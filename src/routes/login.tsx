import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  async function up() {
    setErr("");
    const r = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
    if (r.error) setErr(r.error.message ?? "Sign up failed");
    else window.location.href = "/";
  }
  async function inn() {
    setErr("");
    const r = await authClient.signIn.email({ email, password });
    if (r.error) setErr(r.error.message ?? "Sign in failed");
    else window.location.href = "/";
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-extrabold">
          Naija<span className="text-lime-2">Forum</span>
        </h1>
        <p className="text-sm text-muted">Email + password only. Public posts show your username, not your email.</p>
        {authEnabled ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Public username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (private, for login)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <button type="button" className="btn-3d w-full rounded-lg py-2 text-sm font-bold" onClick={() => void up()}>
              Create account
            </button>
            <button type="button" className="w-full rounded-lg border border-line py-2 text-sm" onClick={() => void inn()}>
              Sign in
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
