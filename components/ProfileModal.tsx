"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-url";

export type ProfileUser = {
  id: string;
  login: string;
  name: string;
  title: string;
  avatarUrl: string | null;
};

type Props = {
  open: boolean;
  user: ProfileUser | null;
  onClose: () => void;
  /** Вызывается после успешного сохранения профиля с актуальными полями как у GET /api/auth/me */
  onProfileSaved: (user: {
    id: string;
    login: string;
    name: string;
    title: string;
    avatarUrl: string | null;
    role?: string;
    workHoursPerDay?: number;
    workDays?: number[];
    weeklyCapacityHours?: number;
  }) => void;
};

export function ProfileModal({ open, user, onClose, onProfileSaved }: Props) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setTitle(user.title ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
    setCurrentPw("");
    setNewPw("");
    setNewPw2("");
    setProfileErr(null);
    setPwErr(null);
    setProfileOk(null);
    setPwOk(null);
  }, [open, user]);

  if (!open || !user) return null;

  const previewInitial = (name || user.login).charAt(0).toUpperCase();
  const previewSrc = avatarUrl.trim() || null;

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setProfileErr(null);
    setProfileOk(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const r = await fetch(apiUrl("/api/me/avatar"), { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось загрузить фото");
      const nextUrl = (d.user?.avatarUrl as string | undefined) ?? (d.avatarUrl as string | undefined) ?? "";
      setAvatarUrl(nextUrl);
      if (d.user) onProfileSaved(d.user);
      setProfileOk("Фото обновлено");
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    setProfileErr(null);
    setProfileOk(null);
    try {
      const r = await fetch(apiUrl("/api/me/avatar"), { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось удалить фото");
      setAvatarUrl("");
      if (d.user) onProfileSaved(d.user);
      setProfileOk("Фото удалено");
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setProfileErr(null);
    setProfileOk(null);
    try {
      const r = await fetch(apiUrl("/api/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          jobTitle: title.trim(),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось сохранить");
      onProfileSaved(d.user);
      setProfileOk("Профиль сохранён");
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPwErr(null);
    setPwOk(null);
    if (newPw.length < 8) {
      setPwErr("Новый пароль: не меньше 8 символов");
      return;
    }
    if (newPw !== newPw2) {
      setPwErr("Новый пароль и повтор не совпадают");
      return;
    }
    setSavingPw(true);
    try {
      const r = await fetch(apiUrl("/api/me/password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось сменить пароль");
      setCurrentPw("");
      setNewPw("");
      setNewPw2("");
      setPwOk("Пароль изменён");
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]"
        role="dialog"
        aria-modal
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <h2 id="profile-modal-title" className="text-base font-semibold text-[var(--text)]">
            Профиль
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]" aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="max-h-[min(75vh,520px)] overflow-y-auto px-4 py-4 sm:px-5">
          <p className="mb-4 text-xs text-[var(--muted-foreground)]">
            Логин: <span className="font-mono font-medium text-[var(--text)]">{user.login}</span>
          </p>

          <div className="mb-6 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Карточка</p>
            {profileErr ? <p className="text-sm text-[var(--danger)]">{profileErr}</p> : null}
            {profileOk ? <p className="text-sm text-[var(--primary)]">{profileOk}</p> : null}
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Имя</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="tt-input mt-1 w-full py-2 text-sm" autoComplete="name" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Должность</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="tt-input mt-1 w-full py-2 text-sm" />
            </label>
            <div className="block">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Фото профиля</span>
              <div className="mt-2 flex items-center gap-4">
                <span className="inline-flex h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-base font-semibold text-[var(--text)]">
                  {previewSrc ? (
                    <img src={previewSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">{previewInitial}</span>
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAvatar(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  >
                    {uploadingAvatar ? "Загрузка…" : "Загрузить фото"}
                  </button>
                  {previewSrc ? (
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => void removeAvatar()}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:opacity-40"
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-[var(--muted-foreground)]">
                JPEG, PNG, GIF или WebP, до 2 МБ. Фото сохраняется сразу после выбора файла.
              </p>
            </div>
            <button
              type="button"
              disabled={savingProfile || !name.trim()}
              onClick={() => void saveProfile()}
              className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
            >
              {savingProfile ? "Сохранение…" : "Сохранить профиль"}
            </button>
          </div>

          <div className="space-y-3 border-t border-[var(--border)] pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Пароль</p>
            {pwErr ? <p className="text-sm text-[var(--danger)]">{pwErr}</p> : null}
            {pwOk ? <p className="text-sm text-[var(--primary)]">{pwOk}</p> : null}
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Текущий пароль</span>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="tt-input mt-1 w-full py-2 text-sm"
                autoComplete="current-password"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Новый пароль</span>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="tt-input mt-1 w-full py-2 text-sm"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Повтор нового пароля</span>
              <input
                type="password"
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)}
                className="tt-input mt-1 w-full py-2 text-sm"
                autoComplete="new-password"
              />
            </label>
            <button
              type="button"
              disabled={savingPw || !currentPw || !newPw}
              onClick={() => void savePassword()}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              {savingPw ? "Смена…" : "Сменить пароль"}
            </button>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <button type="button" onClick={onClose} className="w-full rounded-xl py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--text)]">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
