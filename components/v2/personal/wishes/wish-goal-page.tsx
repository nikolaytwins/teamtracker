"use client";

import "./wish-goal-page.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalWish, PersonalWishImage } from "@/lib/v2/personal/personal-wishes-repo";
import {
  MAX_WISH_IMAGES,
  WISH_SCALE_META,
  resolveWishCat,
  type WishCustomCategory,
} from "@/lib/v2/personal/wish-cats";
import {
  WISH_MEDIA_ACCEPT,
  isWishMediaFile,
  isWishVideoMedia,
  wishMediaTypeFromFile,
} from "@/lib/v2/personal/wish-media";

type MediaItem = PersonalWishImage & { w: number; h: number; d?: number };
type GalCellItem =
  | MediaItem
  | { add: true; w: number; h: number }
  | { ph: true; w: number; h: number; l: string };
type GalRow = { h: number; cells: { it: GalCellItem; r: number; mediaIndex?: number }[] };

const PLACEHOLDERS: { w: number; h: number; l: string }[] = [
  { w: 3, h: 2, l: "фото · горизонт" },
  { w: 4, h: 5, l: "фото · вертикаль" },
  { w: 1, h: 1, l: "фото · квадрат" },
  { w: 16, h: 9, l: "видео · 16:9" },
  { w: 2, h: 3, l: "фото · вертикаль" },
  { w: 3, h: 2, l: "фото · горизонт" },
  { w: 1, h: 1, l: "фото · квадрат" },
  { w: 9, h: 16, l: "видео · вертикаль" },
  { w: 4, h: 3, l: "фото" },
  { w: 4, h: 5, l: "фото · вертикаль" },
  { w: 16, h: 9, l: "фото · панорама" },
  { w: 1, h: 1, l: "фото · квадрат" },
];

function dur(s?: number) {
  const n = Math.round(s || 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

function probeDims(url: string, video: boolean): Promise<{ w: number; h: number; d?: number }> {
  const fallback = video ? { w: 16, h: 9 } : { w: 4, h: 3 };
  const probe = new Promise<{ w: number; h: number; d?: number }>((resolve) => {
    if (video) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () =>
        resolve({
          w: v.videoWidth || 16,
          h: v.videoHeight || 9,
          d: Number.isFinite(v.duration) ? v.duration : undefined,
        });
      v.onerror = () => resolve(fallback);
      v.src = url;
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve(fallback);
    img.src = url;
  });
  return Promise.race([
    probe,
    new Promise<{ w: number; h: number; d?: number }>((resolve) => {
      window.setTimeout(() => resolve(fallback), 2500);
    }),
  ]);
}

async function postWishImagesViaProxy(wishId: string, files: File[]) {
  const fd = new FormData();
  files.forEach((file) => fd.append("files", file));
  const res = await fetch(apiUrl(`/api/v2/personal/wishes/${wishId}/images`), {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Не удалось загрузить файл");
}

async function postWishImages(wishId: string, files: File[]) {
  const batch = files.slice(0, MAX_WISH_IMAGES);
  if (!batch.length) return;
  let uploads: { signedUrl: string; publicUrl: string; name: string }[] = [];
  try {
    const signed = await fetchJson<{
      uploads: { signedUrl: string; publicUrl: string; name: string }[];
    }>(`/api/v2/personal/wishes/${wishId}/images/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: batch.map((f) => ({ name: f.name, type: f.type || "image/jpeg" })),
      }),
    });
    uploads = signed.uploads;
    if (uploads.length !== batch.length) throw new Error("sign mismatch");
    await Promise.all(
      uploads.map(async (u, i) => {
        const file = batch[i]!;
        const res = await fetch(u.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!res.ok) throw new Error("direct upload failed");
      })
    );
  } catch {
    await postWishImagesViaProxy(wishId, batch);
    return;
  }
  await fetchJson(`/api/v2/personal/wishes/${wishId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registered: uploads.map((u, i) => ({
        url: u.publicUrl,
        name: u.name,
        media_type: wishMediaTypeFromFile(batch[i]!),
      })),
    }),
  });
}

function buildRows(items: GalCellItem[], width: number, density: "big" | "mid", mediaStartIndex: number): GalRow[] {
  const G = 8;
  const heights = density === "big" ? [520, 380, 460] : [300, 260, 320];
  const W = Math.max(280, width - 24);
  const out: GalRow[] = [];
  let cur: GalRow["cells"] = [];
  let sum = 0;
  let k = 0;
  let mediaIndex = mediaStartIndex;
  for (const it of items) {
    let r = it.w / Math.max(it.h, 0.01);
    if ("id" in it && isWishVideoMedia(it)) r = Math.max(r, 0.9);
    const cell: GalRow["cells"][number] = { it, r };
    if ("id" in it) {
      cell.mediaIndex = mediaIndex;
      mediaIndex += 1;
    }
    cur.push(cell);
    sum += r;
    const tH = heights[k % heights.length]!;
    if (sum * tH + G * (cur.length - 1) >= W) {
      out.push({ cells: cur, h: (W - G * (cur.length - 1)) / sum });
      cur = [];
      sum = 0;
      k += 1;
    }
  }
  if (cur.length) {
    const tH = heights[k % heights.length]!;
    out.push({ cells: cur, h: Math.min(tH, (W - G * (cur.length - 1)) / sum) });
  }
  return out;
}

export function WishGoalPage({ wishId }: { wishId: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const galRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const txtRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const showRaf = useRef<number>(0);
  const showT0 = useRef(0);
  const idleTimer = useRef<number | null>(null);
  const dragCount = useRef(0);

  const [wish, setWish] = useState<PersonalWish | null>(null);
  const [customCats, setCustomCats] = useState<WishCustomCategory[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [density, setDensity] = useState<"big" | "mid">("big");
  const [galW, setGalW] = useState(1200);
  const [solid, setSolid] = useState(false);
  const [clip, setClip] = useState(true);
  const [moreNeeded, setMoreNeeded] = useState(false);
  const [dropOn, setDropOn] = useState(false);
  const [lb, setLb] = useState<{ i: number; show: boolean; idle: boolean } | null>(null);

  const catById = useMemo(() => {
    const m = new Map<string, WishCustomCategory>();
    customCats.forEach((c) => m.set(c.id, c));
    return m;
  }, [customCats]);

  const tags = useMemo(() => {
    if (!wish) return [];
    return wish.categories.map((id) => resolveWishCat(id, catById));
  }, [wish, catById]);

  const reload = useCallback(async () => {
    const data = await fetchJson<{ wish: PersonalWish; categories: WishCustomCategory[] }>(
      `/api/v2/personal/wishes/${wishId}`
    );
    setWish(data.wish);
    setCustomCats(data.categories);
    const sorted = [...data.wish.images].sort((a, b) => a.sort_order - b.sort_order);
    // Show page immediately — don't block on image/video metadata.
    const initial: MediaItem[] = sorted.map((img) => ({
      ...img,
      w: isWishVideoMedia(img) ? 16 : 4,
      h: isWishVideoMedia(img) ? 9 : 3,
    }));
    setMedia(initial);

    void Promise.all(
      sorted.map(async (img) => {
        const video = isWishVideoMedia(img);
        const dims = await probeDims(img.url, video);
        return { ...img, w: dims.w, h: dims.h, d: dims.d };
      })
    ).then((probed) => {
      setMedia(probed);
    });

    return data.wish;
  }, [wishId]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    void reload()
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : "Не удалось загрузить");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!wish || !titleRef.current || !txtRef.current) return;
    if (document.activeElement !== titleRef.current) titleRef.current.textContent = wish.title;
    if (document.activeElement !== txtRef.current) txtRef.current.innerText = wish.description || "";
  }, [wish]);

  useEffect(() => {
    const text = wish?.description || "";
    const long = text.length > 220 || text.split("\n").length > 4;
    setMoreNeeded(long || !clip);
    const t = txtRef.current;
    if (!t || !clip) return;
    // If clipped content still overflows, keep the button
    if (t.scrollHeight > t.clientHeight + 4) setMoreNeeded(true);
  }, [wish?.description, clip, galW]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onScroll = () => setSolid(root.scrollTop > window.innerHeight * 0.45);
    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = galRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setGalW(el.clientWidth));
    ro.observe(el);
    setGalW(el.clientWidth);
    return () => ro.disconnect();
  }, [loading, media.length]);

  const persist = useCallback(
    (patch: { title?: string; description?: string }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void fetchJson<{ wish: PersonalWish }>(`/api/v2/personal/wishes/${wishId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
          .then((res) => setWish(res.wish))
          .catch(() => undefined);
      }, 400);
    },
    [wishId]
  );

  const addFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list) return;
      const files = Array.from(list).filter(isWishMediaFile).slice(0, MAX_WISH_IMAGES - media.length);
      if (!files.length) return;
      setUploading(true);
      setError(null);
      try {
        await postWishImages(wishId, files);
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить");
      } finally {
        setUploading(false);
      }
    },
    [wishId, media.length, reload]
  );

  const delMedia = useCallback(
    async (imageId: string) => {
      try {
        await fetchJson(`/api/v2/personal/wishes/${wishId}/images?imageId=${encodeURIComponent(imageId)}`, {
          method: "DELETE",
        });
        setMedia((prev) => prev.filter((m) => m.id !== imageId));
        setWish((w) => (w ? { ...w, images: w.images.filter((i) => i.id !== imageId) } : w));
        if (lb) {
          if (media.length <= 1) setLb(null);
          else setLb({ ...lb, i: Math.min(lb.i, media.length - 2) });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось удалить");
      }
    },
    [wishId, lb, media.length]
  );

  // drag-drop
  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      dragCount.current += 1;
      setDropOn(true);
    };
    const onLeave = () => {
      dragCount.current -= 1;
      if (dragCount.current <= 0) {
        dragCount.current = 0;
        setDropOn(false);
      }
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCount.current = 0;
      setDropOn(false);
      void addFiles(e.dataTransfer?.files ?? null);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  const openLb = useCallback((i: number, show: boolean) => {
    setLb({ i, show, idle: false });
  }, []);

  const closeLb = useCallback(() => {
    cancelAnimationFrame(showRaf.current);
    setLb(null);
  }, []);

  const poke = useCallback(() => {
    setLb((cur) => (cur ? { ...cur, idle: false } : cur));
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setLb((cur) => (cur ? { ...cur, idle: true } : cur)), 2200);
  }, []);

  useEffect(() => {
    if (!lb) return;
    poke();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") setLb((c) => (c ? { ...c, i: (c.i + 1) % media.length } : c));
      if (e.key === "ArrowLeft") setLb((c) => (c ? { ...c, i: (c.i - 1 + media.length) % media.length } : c));
      if (e.key === " ") {
        e.preventDefault();
        setLb((c) => (c ? { ...c, show: !c.show } : c));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lb?.show, lb != null, media.length, closeLb, poke]);

  // slideshow progress
  useEffect(() => {
    if (!lb?.show || !media.length) {
      cancelAnimationFrame(showRaf.current);
      return;
    }
    const m = media[lb.i];
    if (!m) return;
    const duration = isWishVideoMedia(m) ? Math.min(20, m.d || 8) * 1000 : 6000;
    showT0.current = performance.now();
    const bar = rootRef.current?.querySelector<HTMLElement>("#lb-bar");
    const tick = () => {
      const p = Math.min(1, (performance.now() - showT0.current) / duration);
      if (bar) bar.style.width = `${p * 100}%`;
      if (p < 1) showRaf.current = requestAnimationFrame(tick);
      else setLb((c) => (c ? { ...c, i: (c.i + 1) % media.length } : c));
    };
    if (bar) bar.style.width = "0";
    showRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(showRaf.current);
  }, [lb?.show, lb?.i, media]);

  const real = media.length > 0;
  const cover = real ? media[0]! : null;
  const galItems = useMemo(() => {
    if (real) {
      return [...media.slice(1), { add: true as const, w: 1, h: 1 }];
    }
    return [
      ...PLACEHOLDERS.map((p) => ({ ph: true as const, w: p.w, h: p.h, l: p.l })),
      { add: true as const, w: 1, h: 1 },
    ];
  }, [media, real]);

  const rows = useMemo(
    () => buildRows(galItems, galW, density, real ? 1 : 0),
    [galItems, galW, density, real]
  );

  const videoCount = media.filter((m) => isWishVideoMedia(m)).length;
  const photoCount = media.length - videoCount;

  if (loading) {
    return (
      <div className="wg-goal">
        <div className="wg-goal-scroll" ref={rootRef}>
          <div style={{ padding: 48, color: "#71717a" }}>Загрузка…</div>
        </div>
      </div>
    );
  }

  if (error && !wish) {
    return (
      <div className="wg-goal">
        <div className="wg-goal-scroll" ref={rootRef}>
          <div style={{ padding: 48 }}>
            <p style={{ color: "#f4f4f5", marginBottom: 16 }}>{error}</p>
            <Link className="pill" href={appPath("/v2/personal/goals?tab=wishes")}>
              ← На платформу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!wish) return null;

  const scaleLabel = WISH_SCALE_META[wish.scale]?.label ?? wish.scale;

  return (
    <div className="wg-goal">
      <div className="wg-goal-scroll" ref={rootRef}>
      <header className={`top${solid ? " solid" : ""}`} id="top">
        <Link className="pill" href={appPath("/v2/personal/goals?tab=wishes")}>
          ← На платформу
        </Link>
        <span className="top-t">{wish.title}</span>
        <span className="sp" />
        {real ? (
          <>
            <button type="button" className="pill" onClick={() => fileRef.current?.click()} disabled={uploading}>
              + Фото или видео
            </button>
            <button type="button" className="pill w" onClick={() => openLb(0, true)}>
              ▶ Погрузиться
            </button>
          </>
        ) : null}
      </header>

      <section className="cover" id="cover">
        {cover ? (
          isWishVideoMedia(cover) ? (
            <video
              className="m"
              src={cover.url}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              data-i={0}
              onClick={() => openLb(0, false)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="m" src={cover.url} alt="" data-i={0} onClick={() => openLb(0, false)} style={{ cursor: "zoom-in" }} />
          )
        ) : (
          <div
            className="ph m"
            style={{ position: "absolute", inset: 0, padding: "96px 48px", alignItems: "flex-start" }}
            onClick={() => fileRef.current?.click()}
          >
            обложка · перетащи сюда фото или видео
          </div>
        )}
        <div className="cover-in">
          <h1
            className="h1"
            id="title"
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={(e) => {
              const title = e.currentTarget.textContent || "";
              setWish((w) => (w ? { ...w, title } : w));
              persist({ title });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
          <div className="tags">
            {tags.map((t) => (
              <span key={t.id} className="tag" style={{ ["--c" as string]: t.tint }}>
                <i />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="about">
        <div className={`txt-w${clip ? " clip" : ""}`} id="txtw">
          <div
            className="txt"
            id="txt"
            ref={txtRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={(e) => {
              const description = e.currentTarget.innerText;
              setWish((w) => (w ? { ...w, description } : w));
              persist({ description });
            }}
          />
          {moreNeeded ? (
            <button type="button" className="more" onClick={() => setClip((v) => !v)}>
              {clip ? "Читать полностью ↓" : "Свернуть ↑"}
            </button>
          ) : null}
        </div>
        <div className="facts">
          <div className="fact">
            <span>Уровень</span>
            <b>{scaleLabel}</b>
          </div>
          <div className="fact">
            <span>Ближайшее</span>
            <b>{wish.is_near ? "Да" : "Нет"}</b>
          </div>
          <div className="fact">
            <span>Медиа</span>
            <b>
              {real
                ? `${photoCount} фото${videoCount ? ` · ${videoCount} видео` : ""}`
                : "пока пусто"}
            </b>
          </div>
        </div>
      </section>

      <div className="gh">
        <h2 id="gcount">
          {real ? (
            <>
              <b>Галерея</b>
              {photoCount} фото{videoCount ? ` · ${videoCount} видео` : ""}
            </>
          ) : (
            <>
              <b>Галерея</b>
              перетащи фото и видео в любое место страницы
            </>
          )}
        </h2>
        <span className="sp" />
        <div className="seg">
          <button type="button" data-r="big" className={density === "big" ? "on" : ""} onClick={() => setDensity("big")}>
            Крупно
          </button>
          <button type="button" data-r="mid" className={density === "mid" ? "on" : ""} onClick={() => setDensity("mid")}>
            Плотно
          </button>
        </div>
      </div>

      <section className="gal dim" id="gal" ref={galRef}>
        {rows.map((row, ri) => (
          <div className="row" key={ri}>
            {row.cells.map((cell, ci) => {
              const it = cell.it;
              const w = Math.floor(cell.r * row.h);
              const h = Math.round(row.h);
              const st = { width: w, height: h };
              if ("add" in it && it.add) {
                return (
                  <button
                    key={`add-${ri}-${ci}`}
                    type="button"
                    className="add"
                    style={st}
                    onClick={() => fileRef.current?.click()}
                  >
                    <b>+</b>
                    Добавить
                    <small>фото и видео</small>
                  </button>
                );
              }
              if ("ph" in it && it.ph) {
                return (
                  <div className="it" key={`ph-${ri}-${ci}`} style={st}>
                    <div className="ph" onClick={() => fileRef.current?.click()}>
                      {it.l}
                    </div>
                  </div>
                );
              }
              const m = it as MediaItem;
              const i = cell.mediaIndex ?? 0;
              return (
                <div className="it" key={m.id} style={st} onClick={() => openLb(i, false)}>
                  {isWishVideoMedia(m) ? (
                    <video className="m" src={m.url} muted loop playsInline autoPlay preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="m" src={m.url} alt="" />
                  )}
                  {isWishVideoMedia(m) ? <span className="vb">{dur(m.d)}</span> : null}
                  <button
                    type="button"
                    className="x"
                    title="Убрать"
                    onClick={(e) => {
                      e.stopPropagation();
                      void delMedia(m.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      <input
        ref={fileRef}
        type="file"
        accept={WISH_MEDIA_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      </div>

      <div className={`drop${dropOn ? " on" : ""}`}>
        <span>Отпусти — добавлю в галерею</span>
      </div>

      {uploading ? (
        <div className="wg-toast wg-toast-up">Загрузка…</div>
      ) : null}

      {error ? <div className="wg-toast wg-toast-err">{error}</div> : null}

      {lb && media[lb.i] ? (
        <div
          className={`lb on${lb.show ? " show" : ""}${lb.idle ? " idle" : ""}`}
          role="dialog"
          aria-label="Просмотр"
          onMouseMove={poke}
        >
          <div
            className="lb-st"
            onClick={(e) => {
              if (lb.show) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const go = e.clientX < rect.left + rect.width / 3 ? -1 : 1;
              setLb((c) => (c ? { ...c, i: (c.i + go + media.length) % media.length } : c));
            }}
          >
            {isWishVideoMedia(media[lb.i]!) ? (
              <video
                key={media[lb.i]!.id + String(lb.show)}
                className="m"
                src={media[lb.i]!.url}
                autoPlay
                playsInline
                muted={lb.show}
                controls={!lb.show}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={media[lb.i]!.id} className="m" src={media[lb.i]!.url} alt="" />
            )}
          </div>
          <div className="lb-ui">
            <div className="lb-top">
              <span className="lb-c">
                {lb.i + 1} / {media.length}
              </span>
              <span className="lb-t">{wish.title}</span>
              <span className="sp" />
              <button type="button" className="pill" onClick={() => setLb((c) => (c ? { ...c, show: !c.show } : c))}>
                {lb.show ? "❚❚ Пауза" : "▶ Слайд-шоу"}
              </button>
              <button type="button" className="pill" onClick={closeLb}>
                Закрыть ×
              </button>
            </div>
            <button
              type="button"
              className="nav p"
              aria-label="Назад"
              onClick={() => setLb((c) => (c ? { ...c, i: (c.i - 1 + media.length) % media.length } : c))}
            >
              ←
            </button>
            <button
              type="button"
              className="nav n"
              aria-label="Вперёд"
              onClick={() => setLb((c) => (c ? { ...c, i: (c.i + 1) % media.length } : c))}
            >
              →
            </button>
          </div>
          <div className="lb-bar">
            <i id="lb-bar" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
