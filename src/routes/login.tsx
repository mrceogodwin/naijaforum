import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { accountEmail, publicUsername } from "@/lib/account-email";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);

  async function up() {
    setErr("");
    const handle = publicUsername(name);
    if (handle.length < 3) {
      setErr("Username needs 3+ characters.");
      return;
    }
    if (password.length < 8) {
      setErr("Password needs 8+ characters.");
      return;
    }
    if (!agree) {
      setErr("Accept the Terms to create an account.");
      return;
    }
    const r = await authClient.signUp.email({ email: accountEmail(handle), password, name: handle });
    if (r.error) setErr(r.error.message ?? "Sign up failed");
    else window.location.href = "/";
  }
  async function inn() {
    setErr("");
    const handle = publicUsername(name);
    const r = await authClient.signIn.email({ email: accountEmail(handle), password });
    if (r.error) setErr(r.error.message ?? "Sign in failed");
    else window.location.href = "/";
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-extrabold">
          Naija<span className="text-lime-2">Forum</span>
        </h1>
        <p className="text-sm text-muted">Username + password only. No email. The forum shows this username.</p>
        {authEnabled ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            <label className="flex items-start gap-2 text-[11px] text-muted">
              <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I agree to the Terms. I am responsible for posts, music URLs, and ads I submit.</span>
            </label>
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
