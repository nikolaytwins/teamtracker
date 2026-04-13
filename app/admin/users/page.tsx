"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { TT_ROLE_LABELS, TT_USER_ROLES, type TtUserRole } from "@/lib/roles";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  login: string;
  display_name: string;
  job_title: string;
  role: TtUserRole;
  weekly_capacity_hours: number;
  auth_email?: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(apiUrl("/api/admin/users"));
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(typeof d.error === "string" ? d.error : "Не удалось загрузить список");
      setUsers([]);
      return;
    }
    setUsers(Array.isArray(d.users) ? d.users : []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function onRoleChange(userId: string, role: TtUserRole) {
    setSavingId(userId);
    setErr(null);
    setNotice(null);
    try {
      const r = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(userId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(typeof d.error === "string" ? d.error : "Не удалось сохранить");
      }
      if (d.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...d.user } : u)));
      } else {
        await load();
      }
      setNotice(
        "Роль сохранена. Пользователю нужно выйти и войти снова, чтобы обновилась сессия (доступ в интерфейсе)."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Пользователи и роли</h1>
          <p className="text-sm text-slate-600 mt-1">
            Быстрая смена роли: администратор, дизайнер или ПМ. Доступ к финансам и продажам только у
            администратора.
          </p>
        </div>
        <Link
          href={appPath("/me")}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Назад в профиль
        </Link>
      </div>

      {notice && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {notice}
        </p>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Загрузка…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-slate-500">Нет пользователей</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Имя</th>
                  <th className="px-4 py-3 font-medium">Логин</th>
                  <th className="px-4 py-3 font-medium">Должность</th>
                  <th className="px-4 py-3 font-medium min-w-[12rem]">Роль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.display_name}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{u.login}</td>
                    <td className="px-4 py-3 text-slate-600">{u.job_title || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => void onRoleChange(u.id, e.target.value as TtUserRole)}
                        className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 disabled:opacity-50"
                        aria-label={`Роль для ${u.display_name}`}
                      >
                        {TT_USER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {TT_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
