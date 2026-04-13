"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md min-w-0"
    >
      <Card className="w-full min-w-0 overflow-hidden shadow-[var(--shadow-elevated)]">
        <CardHeader className="space-y-1 pb-2">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/30">
              TT
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl">Team Tracker</CardTitle>
              <CardDescription className="text-[13px]">
                {mode === "login" ? "Вход по логину и паролю" : "Новая учётная запись"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="w-full min-w-0 space-y-5 pt-2">
          {regEnabled ? (
            <div className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`min-h-11 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === "login"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)]"
                    : "text-[var(--muted-foreground)]"
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
                className={`min-h-11 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === "register"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                Регистрация
              </button>
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs text-[var(--text)]">
              Регистрация недоступна. Учётную запись выдаёт администратор.
            </p>
          )}
          <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4">
            {mode === "register" ? (
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Имя</label>
                <Input
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Имя и фамилия"
                  className="w-full min-w-0"
                />
              </div>
            ) : null}
            <div className="w-full min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Логин</label>
              <Input
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full min-w-0"
              />
            </div>
            <div className="w-full min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Пароль</label>
              <Input
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-w-0"
              />
              {mode === "register" ? (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Минимум 8 символов</p>
              ) : null}
            </div>
            {mode === "register" ? (
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Пароль ещё раз</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full min-w-0"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm font-medium text-[var(--danger)]">{error}</p> : null}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={
                loading ||
                !login.trim() ||
                !password ||
                (mode === "register" && (!regEnabled || !canSubmitRegister))
              }
            >
              {loading ? (mode === "register" ? "Создаём…" : "Вход…") : mode === "register" ? "Зарегистрироваться" : "Войти"}
            </Button>
          </form>
          <p className="text-center text-xs text-[var(--muted-foreground)]">
            Проблемы со входом — к администратору.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="tt-mesh flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--primary)] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">Team Tracker</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/90">Служебный вход для сотрудников.</p>
        </div>
        <p className="relative z-10 text-xs text-white/65">Доступ только для авторизованных пользователей</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted-foreground)] shadow-[var(--shadow-card)]">
              Загрузка…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
