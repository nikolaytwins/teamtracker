"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function safeRedirectPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return null;
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [regEnabled, setRegEnabled] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch(apiUrl("/api/auth/register"))
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setRegEnabled(Boolean(d.enabled)))
      .catch(() => setRegEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        if (password !== password2) {
          setError("Пароли не совпадают");
          setLoading(false);
          return;
        }
        const r = await fetch(apiUrl("/api/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: login.trim(),
            password,
            display_name: displayName.trim(),
          }),
          credentials: "same-origin",
        });
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Не удалось зарегистрироваться");
          return;
        }
        const redir = safeRedirectPath(searchParams.get("redirect"));
        const target = appPath(redir ?? "/me");
        window.location.assign(target);
        return;
      }

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
      const redir = safeRedirectPath(searchParams.get("redirect"));
      const target = appPath(redir ?? "/me");
      window.location.assign(target);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  const canSubmitRegister =
    displayName.trim().length > 0 && login.trim().length > 0 && password.length >= 8 && password === password2;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Team Tracker</h1>
      <p className="text-sm text-slate-500 mb-4">
        {mode === "login"
          ? "Вход для команды или после регистрации."
          : "Создаётся учётка без доступа к канбану и админке — только профиль и личный учёт времени."}
      </p>
      {regEnabled ? (
        <div className="flex rounded-lg border border-slate-200 p-0.5 mb-6 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Регистрация
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
          Саморегистрация на этом сервере выключена. Нужен аккаунт от администратора или{" "}
          <code className="text-[11px]">TEAM_TRACKER_SELF_REGISTER=1</code> в production.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Имя</label>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Как к вам обращаться"
            />
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Логин</label>
          <input
            type="text"
            autoComplete={mode === "register" ? "username" : "username"}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Пароль</label>
          <input
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          {mode === "register" ? (
            <p className="text-[11px] text-slate-400 mt-1">Не короче 8 символов.</p>
          ) : null}
        </div>
        {mode === "register" ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Пароль ещё раз</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        ) : null}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={
            loading ||
            !login.trim() ||
            !password ||
            (mode === "register" && (!regEnabled || !canSubmitRegister))
          }
          className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? (mode === "register" ? "Создаём…" : "Вход…") : mode === "register" ? "Зарегистрироваться" : "Войти"}
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
