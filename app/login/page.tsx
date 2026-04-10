"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
        credentials: "same-origin",
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }
      const redir = searchParams.get("redirect");
      router.push(redir && redir.startsWith("/") ? appPath(redir) : appPath("/me"));
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Team Tracker</h1>
      <p className="text-sm text-slate-500 mb-6">
        Вход (те же логины, что в Twinworks — см. TEAM_TRACKER_USERS_JSON)
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Логин</label>
          <input
            type="text"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Пароль</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !login.trim() || !password}
          className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-6">
        После входа откроется профиль.{" "}
        <Link href={appPath("/me")} className="text-emerald-700 underline">
          Профиль
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center text-slate-500 text-sm">
            Загрузка…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
