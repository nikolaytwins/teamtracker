"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function safeRedirectPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return null;
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "admin_only" ? "Доступ только для администратора" : null
  );
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
      const redir = safeRedirectPath(searchParams.get("redirect"));
      const target = appPath(redir ?? "/v2/home");
      window.location.assign(target);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

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
              <CardDescription className="text-[13px]">Вход администратора</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="w-full min-w-0 space-y-5 pt-2">
          <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs text-[var(--text)]">
            Регистрация отключена. Доступ только у администратора. Клиентские сметы по ссылке открываются без
            входа.
          </p>
          <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-w-0"
              />
            </div>
            {error ? <p className="text-sm font-medium text-[var(--danger)]">{error}</p> : null}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading || !login.trim() || !password}
            >
              {loading ? "Вход…" : "Войти"}
            </Button>
          </form>
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
          <p className="mt-3 text-sm leading-relaxed text-white/90">Закрытый служебный доступ.</p>
        </div>
        <p className="relative z-10 text-xs text-white/65">Только администратор</p>
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
