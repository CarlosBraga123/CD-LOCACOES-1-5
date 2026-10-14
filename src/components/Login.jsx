import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const enter = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try { await auth.login(email, password); }
    finally { setPassword(""); setSubmitting(false); }
  };
  return <main className="mx-auto max-w-md p-6">
    <h1 className="text-xl font-bold">CD Locações — Desenvolvimento</h1>
    <p className="my-4">Entre com sua conta Supabase. Os dados operacionais deste navegador ainda não são sincronizados.</p>
    {auth.message && <p role="alert" className="my-3 text-red-700">{auth.message}</p>}
    {auth.status === "denied" ? <button onClick={auth.logout} className="rounded border p-3">Sair da sessão e tentar novamente</button> :
      <form onSubmit={enter} className="space-y-4">
        <label className="block">E-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded border p-2" /></label>
        <label className="block">Senha<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded border p-2" /></label>
        <button disabled={submitting || auth.status === "unconfigured"} className="rounded bg-blue-700 p-3 text-white disabled:opacity-50">{submitting ? "Entrando..." : "Entrar"}</button>
      </form>}
  </main>;
}
