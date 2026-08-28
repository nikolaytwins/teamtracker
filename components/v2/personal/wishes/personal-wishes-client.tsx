"use client";

import { apiUrl } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalWish, PersonalWishImage } from "@/lib/v2/personal/personal-wishes-repo";
import {
  MAX_WISH_IMAGES,
  WISH_CATS,
  WISH_SCALES,
  WISH_SCALE_META,
  allWishCatMetas,
  resolveWishCat,
  wishScaleRank,
  type WishCatMeta,
  type WishCustomCategory,
  type WishScale,
} from "@/lib/v2/personal/wish-cats";
import { V2Icons } from "@/components/v2/ui/icons";
import { WishPhotosInCard, WishesMasonryGrid } from "@/components/v2/personal/wishes/wish-masonry-ui";
import {
  WISH_MEDIA_ACCEPT,
  isWishMediaFile,
  isWishVideoMedia,
  wishMediaTypeFromFile,
} from "@/lib/v2/personal/wish-media";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Переносы строк в markdown (одиночный \n → hard break). */
function preserveSourceLineBreaks(md: string) {
  return md.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

function WishDescriptionProse({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="v2-tight mb-3 mt-5 text-[18px] font-semibold text-[var(--v2-ink-900)] first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="v2-tight mb-2 mt-4 text-[16px] font-semibold text-[var(--v2-ink-900)] first:mt-0">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="v2-tight mb-2 mt-3 text-[15px] font-semibold text-[var(--v2-ink-800)] first:mt-0">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="v2-tight mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--v2-ink-600)] last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-[var(--v2-ink-600)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-[var(--v2-ink-600)]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--v2-ink-800)]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[var(--v2-ink-200)] pl-4 text-[14px] italic leading-relaxed text-[var(--v2-ink-500)]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-[var(--v2-ink-100)]" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-[var(--v2-brand-600)] underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {preserveSourceLineBreaks(text)}
      </ReactMarkdown>
    </div>
  );
}

function filesFromDropOrInput(list: FileList | File[] | null): File[] {
  if (!list) return [];
  return Array.from(list).filter(isWishMediaFile);
}

function uploadErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof TypeError) {
    return "Не удалось загрузить файл. Обновите страницу и попробуйте ещё раз.";
  }
  if (e instanceof Error && e.message.trim()) return e.message;
  return fallback;
}

async function postWishImagesViaProxy(wishId: string, files: File[]): Promise<void> {
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

async function postWishImages(wishId: string, files: File[]): Promise<void> {
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

function sortWishes(list: PersonalWish[]): PersonalWish[] {
  return [...list].sort(
    (a, b) =>
      wishScaleRank(a.scale) - wishScaleRank(b.scale) ||
      Number(b.is_near) - Number(a.is_near) ||
      a.sort_order - b.sort_order
  );
}

type Mode = "visual" | "text" | "day";

const MODES: { id: Mode; label: string }[] = [
  { id: "visual", label: "Визуально" },
  { id: "text", label: "Текстом" },
  { id: "day", label: "Мой день" },
];

const MANIFESTO_BRIEF = [
  "Я строю новую индустрию AI-творчества.",
  "Я выращиваю творцов нового типа — людей, способных с помощью ИИ создавать дизайн, продукты, фильмы и целые миры на уровне больших студий.",
  "Я создаю для них образование, технологии, реальные проекты и команды, чтобы путь от воображения до воплощения больше не зависел от огромного капитала, штата и разрешения индустрии.",
] as const;

const MANIFESTO_PATH: { title: string; body: string }[] = [
  {
    title: "Сначала доказываю метод в дизайне",
    body: "Развиваю Импульс, создаю сильные коммерческие AI-кейсы через TwinLabs и превращаю Qmagic в рабочий инструмент для творцов.",
  },
  {
    title: "Затем осваиваю AI-видео",
    body: "Создаю рекламные ролики, клипы и короткие фильмы. Формирую команду и собственную технологию видеопроизводства.",
  },
  {
    title: "Расширяюсь в новые формы творчества",
    body: "Добавляю 3D и worldbuilding. Вайбкодинг, звук и интерактивность использую как инструменты для создания продуктов и новых впечатлений.",
  },
  {
    title: "Создаю институт AI-творцов",
    body: "Объединяю образование, коммерческую студию, технологии и сеть сильных специалистов. Человек проходит путь от обучения до реальных проектов и собственных произведений.",
  },
  {
    title: "Запускаю собственные Originals",
    body: "Мы создаём короткометражки, визуальные эксперименты, персонажей и новые вселенные, постепенно формируя собственный язык и международное имя.",
  },
  {
    title: "Создаю Аркалиум",
    body: "Аркалиум становится самым красивым, масштабным и дорогим фильмом, созданным моей студией, — главным доказательством возможностей нового поколения AI-творцов.",
  },
];

function ManifestoPlate() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-7 overflow-hidden rounded-[24px] bg-white shadow-[var(--v2-shadow-soft)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-6 px-7 py-5 text-left sm:px-8"
      >
        <p
          className="v2-tighter min-w-0 flex-1 text-[26px] font-light leading-[1.2] text-[var(--v2-ink-900)] sm:text-[30px]"
          style={{ textWrap: "pretty" }}
        >
          {MANIFESTO_BRIEF[0]}
        </p>
        <V2Icons.chev
          className={`h-5 w-5 shrink-0 text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-ink-500)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="border-t border-[var(--v2-ink-100)] px-7 pb-8 pt-6 sm:px-8">
          <div className="flex max-w-[62ch] flex-col gap-3">
            {MANIFESTO_BRIEF.slice(1).map((p) => (
              <p
                key={p}
                className="v2-tight text-[16px] font-light leading-[1.55] text-[var(--v2-ink-700)]"
                style={{ textWrap: "pretty" }}
              >
                {p}
              </p>
            ))}
          </div>
          <p className="mt-8 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
            Как я к этому прихожу
          </p>
          <ol className="mt-4 grid gap-5 sm:grid-cols-2">
            {MANIFESTO_PATH.map((step, i) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="v2-tnum mt-0.5 w-5 shrink-0 text-[13px] font-medium text-[var(--v2-brand-700)]">
                  {i + 1}
                </span>
                <div>
                  <h3
                    className="v2-tighter text-[18px] font-light leading-snug text-[var(--v2-ink-900)]"
                    style={{ textWrap: "pretty" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="v2-tight mt-1 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]"
                    style={{ textWrap: "pretty" }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

const ESSAY: { text: string; lead?: boolean; pull?: boolean }[] = [
  { lead: true, text: "Я хочу жизнь, в которой дело — часть меня, а не вместо меня." },
  {
    text: "Утро начинается медленно. Вода за окном, кофе, полчаса тишины до первого разговора. Компания работает, пока я плаваю; я нужен ей как человек, который держит направление, а не как тот, кто закрывает дыры. Раз в год я уезжаю на месяц и возвращаюсь к выросшей выручке — не потому что повезло, а потому что так собрано.",
  },
  {
    text: "Деньги в этой жизни спокойные. Есть база, которая закрыта без моего участия, и поэтому решения принимаются от желания, а не от страха. Дом с большими окнами. Машина, в которую хочется садиться просто так. Вещей мало, все — любимые.",
  },
  { pull: true, text: "Желаниям не нужен план, чтобы иметь право существовать." },
  {
    text: "Есть мастерская, где руки заняты деревом и металлом, и никто не спрашивает, как это масштабировать. Есть книга, которую я пишу медленно. Есть языки и керамика — то, что я учу без цели монетизировать, просто чтобы оставаться живым.",
  },
  {
    text: "Рядом человек, с которым можно молчать. Долгие завтраки, честные разговоры, желание, которое не выгорает. По субботам за большим столом собираются свои: двенадцать человек, вино, вечер, который никто не торопит.",
  },
  {
    text: "И один день в неделю совсем без планов. Он нужен не для восстановления и не для продуктивности. Просто чтобы помнить, что жизнь — моя.",
  },
];

const MYDAY: {
  part: string;
  tint: string;
  icon: "sun" | "noon" | "moon";
  items: { t: string; h: string; d?: string; img?: boolean }[];
}[] = [
  {
    part: "Утро",
    tint: "#B7791F",
    icon: "sun",
    items: [
      { t: "6:40", h: "Просыпаюсь без будильника", d: "Свет из окна, никто не пишет. Первые сорок минут — не про работу." },
      { t: "7:20", h: "Бассейн или зал", d: "Не ради формы. Ради того, что тело в порядке и день начинается с движения." },
      { t: "8:30", h: "Завтрак вдвоём, без телефонов", d: "", img: true },
    ],
  },
  {
    part: "День",
    tint: "#3B6FF7",
    icon: "noon",
    items: [
      { t: "10:00", h: "Три часа глубокой работы", d: "Одна большая задача, за которую отвечаю только я: стратегия, продукт, деньги." },
      { t: "13:30", h: "Обед не за ноутбуком", d: "" },
      {
        t: "14:30",
        h: "Два разговора с командой",
        d: "Спокойно, по делу. Люди сильнее меня, поэтому мне не нужно вмешиваться в детали.",
        img: true,
      },
      { t: "17:00", h: "Закрываю ноутбук и не открываю до утра", d: "" },
    ],
  },
  {
    part: "Вечер",
    tint: "#7C4DEF",
    icon: "moon",
    items: [
      { t: "18:00", h: "Мастерская", d: "Дерево, металл, руки в работе. Час, в котором нет ни одной метрики.", img: true },
      { t: "20:00", h: "Ужин долгий", d: "Иногда вдвоём, иногда за большим столом со своими." },
      { t: "22:30", h: "Читаю, потом сплю", d: "Без экрана. Утро зависит от того, во сколько я лёг." },
    ],
  },
];

function IcClose(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IcSun(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IcMoon(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcNoon(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <path d="M3.5 17h17M7 17a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4v2.5M5.5 7 7 8.5M18.5 7 17 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const DAY_ICONS = { sun: IcSun, noon: IcNoon, moon: IcMoon };

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`v2-tight h-8 rounded-full px-4 text-[12.5px] font-medium transition ${
            mode === m.id
              ? "bg-[var(--v2-ink-900)] text-white"
              : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function PhotoSlot({
  media,
  placeholder,
  onPick,
  onClear,
  onFiles,
  fit = "cover",
  onImageClick,
}: {
  media?: PersonalWishImage | null;
  placeholder: string;
  onPick?: () => void;
  onClear?: () => void;
  onFiles?: (files: File[]) => void;
  fit?: "cover" | "contain";
  onImageClick?: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const url = media?.url ?? null;
  const isVideo = media ? isWishVideoMedia(media) : false;
  return (
    <div
      className={`relative h-full min-h-0 min-w-0 w-full overflow-hidden bg-[var(--v2-ink-100)] transition ${
        dragOver ? "ring-2 ring-inset ring-[var(--v2-brand-400)]" : ""
      }`}
      onDragOver={(e) => {
        if (!onFiles) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={(e) => {
        if (!onFiles) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const files = filesFromDropOrInput(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
    >
      {url ? (
        isVideo ? (
          <video
            src={url}
            controls
            playsInline
            className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} bg-black`}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            onClick={onImageClick}
            className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${
              onImageClick ? "cursor-zoom-in" : ""
            }`}
          />
        )
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={!onPick}
          className={`flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center ${
            onPick ? "cursor-pointer hover:bg-[var(--v2-ink-200)]/50" : "cursor-default"
          }`}
        >
          <V2Icons.upload className="h-5 w-5 text-[var(--v2-ink-400)]" />
          <span className="v2-tight text-[12px] text-[var(--v2-ink-400)]">{placeholder}</span>
        </button>
      )}
      {url && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[var(--v2-ink-600)] shadow-sm transition hover:text-[var(--v2-ink-900)]"
          title="Убрать файл"
        >
          <IcClose className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {url && onPick ? (
        <button
          type="button"
          onClick={onPick}
          className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-[var(--v2-ink-700)] backdrop-blur transition hover:bg-white"
        >
          Заменить
        </button>
      ) : null}
    </div>
  );
}

function WishCard({
  w,
  i,
  catById,
  onOpen,
  onCat,
  onDelete,
}: {
  w: PersonalWish;
  i: number;
  catById: Map<string, WishCustomCategory>;
  onOpen: (id: string, imageIndex?: number) => void;
  onCat: (k: string) => void;
  onDelete: (id: string) => void;
}) {
  const hasPhotos = w.images.length > 0;
  return (
    <article
      className="v2-card-in group relative flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[var(--v2-shadow-card)] transition-all duration-300 hover:shadow-[var(--v2-shadow-cardHv)]"
      style={{ animationDelay: `${Math.min(i * 30, 360)}ms` }}
    >
      {hasPhotos ? (
        <div className="relative px-4 pb-0 pt-4">
          <WishPhotosInCard images={w.images} onPhotoPress={(idx) => onOpen(w.id, idx)} />
          <button
            type="button"
            title="Удалить"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(w.id);
            }}
            className="absolute right-6 top-6 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--v2-ink-400)] shadow-sm backdrop-blur transition hover:bg-red-50 hover:text-red-600"
          >
            <IcClose className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          title="Удалить"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(w.id);
          }}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v2-ink-100)] text-[var(--v2-ink-400)] transition hover:bg-red-50 hover:text-red-600"
        >
          <IcClose className="h-3.5 w-3.5" />
        </button>
      )}
      <div
        className={
          hasPhotos
            ? "px-5 pb-4 pt-4"
            : "flex min-h-0 flex-1 flex-col justify-between px-6 pb-5 pt-6"
        }
      >
        <div>
          <h3
            onClick={() => onOpen(w.id)}
            className={`v2-tight cursor-pointer leading-snug text-[var(--v2-ink-900)] transition hover:text-[var(--v2-brand-700)] ${
              hasPhotos ? "text-[19px] font-semibold" : "v2-tighter text-[22px] font-light"
            }`}
            style={{ textWrap: "pretty" }}
          >
            {w.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="v2-tight rounded-full px-2 py-[3px] text-[11px] font-medium"
              style={{ background: WISH_SCALE_META[w.scale].bg, color: WISH_SCALE_META[w.scale].tint }}
            >
              {WISH_SCALE_META[w.scale].label}
            </span>
            {w.is_near ? (
              <span className="v2-tight rounded-full bg-[var(--v2-ink-900)] px-2 py-[3px] text-[11px] font-medium text-white">
                ближайшее
              </span>
            ) : null}
          </div>
          {w.description ? (
            <p
              className={`v2-tight mt-2 line-clamp-2 leading-relaxed text-[var(--v2-ink-500)] ${
                hasPhotos ? "text-[12.5px]" : "text-[13.5px]"
              }`}
              style={{ textWrap: "pretty" }}
            >
              {w.description}
            </p>
          ) : null}
        </div>
        <div className={`flex flex-wrap gap-1.5 ${hasPhotos ? "mt-3" : "mt-4"}`}>
          {w.categories.map((k) => {
            const meta = resolveWishCat(k, catById);
            return (
              <button
                key={k}
                type="button"
                onClick={() => onCat(k)}
                className="v2-tight rounded-full px-2 py-[3px] text-[11px] font-medium transition hover:opacity-80"
                style={{ background: meta.bg, color: meta.tint }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function Fullscreen({
  w,
  catById,
  catOptions,
  startIndex = 0,
  onClose,
  onPrev,
  onNext,
  onDelete,
  onUpload,
  onRemoveImage,
  onPatch,
  onCreateCategory,
  uploading,
}: {
  w: PersonalWish;
  catById: Map<string, WishCustomCategory>;
  catOptions: WishCatMeta[];
  startIndex?: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
  onUpload: (files: FileList | File[] | null) => void;
  onRemoveImage: (imageId: string) => void;
  onPatch: (patch: {
    title?: string;
    description?: string;
    categories?: string[];
    scale?: WishScale;
    is_near?: boolean;
  }) => Promise<void>;
  onCreateCategory: (name: string) => Promise<WishCatMeta | null>;
  uploading: boolean;
}) {
  const [n, setN] = useState(startIndex);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(w.title);
  const [desc, setDesc] = useState(w.description);
  const [cats, setCats] = useState<string[]>(w.categories);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setN(Math.max(0, startIndex));
    setEditing(false);
    setTitle(w.title);
    setDesc(w.description);
    setCats(w.categories);
    setAddingCat(false);
    setNewCatName("");
  }, [w.id, startIndex]);

  useEffect(() => {
    setN((cur) => {
      const last = Math.max(0, w.images.length - 1);
      return Math.min(cur, last);
    });
  }, [w.images.length]);

  useEffect(() => {
    if (editing) return;
    setPhotoDragOver(false);
    setTitle(w.title);
    setDesc(w.description);
    setCats(w.categories);
  }, [w.title, w.description, w.categories, editing]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) {
          setEditing(false);
          setTitle(w.title);
          setDesc(w.description);
          setCats(w.categories);
          return;
        }
        onClose();
        return;
      }
      if (editing) return;
      const count = w.images.length;
      if (e.key === "ArrowRight") {
        if (count > 1) {
          e.preventDefault();
          setN((cur) => (cur + 1) % count);
        } else {
          onNext();
        }
      }
      if (e.key === "ArrowLeft") {
        if (count > 1) {
          e.preventDefault();
          setN((cur) => (cur - 1 + count) % count);
        } else {
          onPrev();
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onPrev, onNext, editing, w.title, w.description, w.categories, w.images.length]);

  const imgs = w.images;
  const current = imgs[n] ?? imgs[0];
  const canAddMore = imgs.length < MAX_WISH_IMAGES;

  const toggleCat = (k: string) =>
    setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const submitCat = async () => {
    const name = newCatName.trim();
    if (!name || catBusy) return;
    setCatBusy(true);
    try {
      const created = await onCreateCategory(name);
      if (created) {
        setCats((c) => (c.includes(created.id) ? c : [...c, created.id]));
        setNewCatName("");
        setAddingCat(false);
      }
    } finally {
      setCatBusy(false);
    }
  };

  const saveEdit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || savingEdit) return;
    setSavingEdit(true);
    try {
      await onPatch({
        title: nextTitle,
        description: desc.trim(),
        categories: cats.length ? cats : ["life"],
      });
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex h-[min(84vh,780px)] w-full max-w-[1180px] overflow-hidden rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative min-w-0 flex-1 bg-[var(--v2-ink-100)]">
          {current ? (
            <PhotoSlot
              media={current}
              fit="contain"
              placeholder={
                canAddMore
                  ? "Перетащите фото или видео, или нажмите"
                  : "Достигнут лимит файлов"
              }
              onPick={canAddMore ? () => fileRef.current?.click() : undefined}
              onClear={() => onRemoveImage(current.id)}
              onFiles={canAddMore ? (files) => onUpload(files) : undefined}
            />
          ) : (
            <button
              type="button"
              onClick={() => canAddMore && fileRef.current?.click()}
              onDragOver={(e) => {
                if (!canAddMore) return;
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                if (!canAddMore) return;
                e.preventDefault();
                e.stopPropagation();
                onUpload(filesFromDropOrInput(e.dataTransfer.files));
              }}
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-8 text-center transition hover:bg-[var(--v2-ink-200)]/40"
            >
              <V2Icons.upload className="h-7 w-7 text-[var(--v2-ink-400)]" />
              <span className="v2-tighter text-[22px] font-light text-[var(--v2-ink-700)]">Без медиа</span>
              <span className="v2-tight max-w-[28ch] text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">
                Можно оставить так или добавить фото или видео — карточка сама встанет в ленту.
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={WISH_MEDIA_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files);
              e.target.value = "";
            }}
          />
          {imgs.length > 1 ? (
            <div className="absolute bottom-5 left-5 right-5 flex gap-2 overflow-x-auto pb-1">
              {imgs.map((img, k) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setN(k)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                    n === k ? "ring-white" : "ring-white/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  {isWishVideoMedia(img) ? (
                    <video src={img.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
          {uploading ? (
            <div className="absolute inset-x-0 top-0 bg-[var(--v2-ink-900)]/50 py-2 text-center text-[12px] text-white">
              Загрузка…
            </div>
          ) : null}
        </div>
        <div className="flex w-[400px] shrink-0 flex-col overflow-y-auto px-9 py-8">
          {editing ? (
            <>
              <label className="block">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  Название
                </span>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="v2-tight mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] text-[var(--v2-ink-900)] outline-none transition focus:border-[var(--v2-brand-400)] focus:bg-white"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  Описание
                </span>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  placeholder="Как это должно ощущаться"
                  className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
                />
              </label>
              <div className="mt-4">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  Категории
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {catOptions.map((meta) => {
                    const on = cats.includes(meta.id);
                    return (
                      <button
                        key={meta.id}
                        type="button"
                        onClick={() => toggleCat(meta.id)}
                        className="v2-tight h-8 rounded-full border px-3 text-[12.5px] font-medium transition"
                        style={
                          on
                            ? { background: meta.tint, color: "#fff", borderColor: meta.tint }
                            : { background: "#fff", color: "#52525B", borderColor: "#E4E4E7" }
                        }
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                  {addingCat ? (
                    <span className="inline-flex h-8 items-center gap-1">
                      <input
                        autoFocus
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            void submitCat();
                          }
                          if (e.key === "Escape") {
                            e.stopPropagation();
                            setAddingCat(false);
                            setNewCatName("");
                          }
                        }}
                        placeholder="Название"
                        className="v2-tight h-8 w-[140px] rounded-full border border-[var(--v2-ink-200)] px-3 text-[12.5px] outline-none focus:border-[var(--v2-brand-400)]"
                      />
                      <button
                        type="button"
                        disabled={!newCatName.trim() || catBusy}
                        onClick={() => void submitCat()}
                        className="h-8 rounded-full bg-[var(--v2-ink-900)] px-3 text-[12px] font-medium text-white disabled:opacity-40"
                      >
                        Ок
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCat(true)}
                      className="v2-tight inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-[var(--v2-ink-300)] px-3 text-[12.5px] font-medium text-[var(--v2-ink-400)]"
                    >
                      <V2Icons.plus className="h-3.5 w-3.5" /> категория
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  Фото
                </span>
                <div
                  className={`mt-2 rounded-xl transition ${
                    photoDragOver && canAddMore ? "ring-2 ring-[var(--v2-brand-400)]" : ""
                  }`}
                  onDragOver={(e) => {
                    if (!canAddMore) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setPhotoDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setPhotoDragOver(false);
                  }}
                  onDrop={(e) => {
                    if (!canAddMore) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setPhotoDragOver(false);
                    onUpload(filesFromDropOrInput(e.dataTransfer.files));
                  }}
                >
                  {imgs.length === 0 && canAddMore ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-[140px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--v2-ink-300)] px-4 text-center transition hover:border-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-50)]"
                    >
                      <V2Icons.upload className="h-6 w-6 text-[var(--v2-ink-400)]" />
                      <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
                        Перетащите фото или видео сюда или нажмите
                      </span>
                      <span className="v2-tight text-[11px] text-[var(--v2-ink-400)]">
                        до {MAX_WISH_IMAGES} файлов
                      </span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 p-0.5">
                      {imgs.map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-square overflow-hidden rounded-xl bg-[var(--v2-ink-100)]"
                        >
                          {isWishVideoMedia(img) ? (
                            <video src={img.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.url} alt="" className="h-full w-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => onRemoveImage(img.id)}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[var(--v2-ink-600)] shadow-sm"
                          >
                            <IcClose className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                      {canAddMore ? (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-[var(--v2-ink-300)] text-[var(--v2-ink-400)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-600)]"
                        >
                          <V2Icons.plus className="h-4 w-4" />
                          <span className="text-[10px]">Ещё</span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
                {uploading ? (
                  <p className="v2-tight mt-2 text-[12px] text-[var(--v2-ink-500)]">Загрузка…</p>
                ) : null}
                <p className="v2-tnum mt-1.5 text-[11px] text-[var(--v2-ink-400)]">
                  {imgs.length} из {MAX_WISH_IMAGES}
                  {canAddMore ? " · можно перетащить файлы в блок выше" : ""}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {w.categories.map((k) => {
                  const meta = resolveWishCat(k, catById);
                  return (
                    <span
                      key={k}
                      className="v2-tight rounded-full px-2.5 py-[4px] text-[11px] font-medium"
                      style={{ background: meta.bg, color: meta.tint }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
              <h2
                className="v2-tighter mt-5 text-[32px] font-light leading-[1.12] text-[var(--v2-ink-900)]"
                style={{ textWrap: "pretty" }}
              >
                {w.title}
              </h2>
              {w.description ? (
                <WishDescriptionProse text={w.description} className="mt-4" />
              ) : null}
              {w.note ? (
                <p className="mt-5 border-l-2 border-[var(--v2-ink-200)] pl-4 text-[14px] italic leading-relaxed text-[var(--v2-ink-500)]">
                  {w.note}
                </p>
              ) : null}
            </>
          )}
          <div className="mt-6">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
              Масштаб
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WISH_SCALES.map((id) => {
                const meta = WISH_SCALE_META[id];
                const on = w.scale === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void onPatch({ scale: id })}
                    className="v2-tight h-8 rounded-full border px-3 text-[12px] font-medium transition"
                    style={
                      on
                        ? { background: meta.tint, color: "#fff", borderColor: meta.tint }
                        : { background: "#fff", color: "#52525B", borderColor: "#E4E4E7" }
                    }
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void onPatch({ is_near: !w.is_near })}
              className={`v2-tight mt-3 inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium transition ${
                w.is_near
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-200)]"
              }`}
            >
              <span
                className={`relative h-4 w-7 rounded-full transition ${
                  w.is_near ? "bg-white/30" : "bg-[var(--v2-ink-300)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${
                    w.is_near ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
              Ближайшее
            </button>
          </div>
          <div className="mt-auto flex items-center gap-2 pt-8">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setTitle(w.title);
                    setDesc(w.description);
                    setCats(w.categories);
                  }}
                  className="h-9 rounded-xl px-3 text-[12.5px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-100)]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!title.trim() || savingEdit}
                  onClick={() => void saveEdit()}
                  className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40"
                >
                  {savingEdit ? "Сохранение…" : "Сохранить"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onPrev}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-200)]"
                >
                  <V2Icons.chevL className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-200)]"
                >
                  <V2Icons.arrowR className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-100)] px-3 text-[12.5px] font-medium text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-200)]"
                >
                  <V2Icons.edit className="h-4 w-4" />
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-medium text-red-600 transition hover:bg-red-50"
                >
                  <V2Icons.trash className="h-4 w-4" />
                  Удалить
                </button>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[var(--v2-ink-600)] transition hover:text-[var(--v2-ink-900)]"
        >
          <IcClose className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

function AddModal({
  onClose,
  onSave,
  saving,
  catOptions,
  onCreateCategory,
}: {
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    categories: string[];
    scale: WishScale;
    is_near: boolean;
    files: File[];
  }) => Promise<void>;
  saving: boolean;
  catOptions: WishCatMeta[];
  onCreateCategory: (name: string) => Promise<WishCatMeta | null>;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [scale, setScale] = useState<WishScale>("large");
  const [isNear, setIsNear] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendFiles = (incoming: File[]) => {
    if (!incoming.length) return;
    setFiles((prev) => {
      const room = MAX_WISH_IMAGES - prev.length;
      if (room <= 0) return prev;
      const added = incoming.slice(0, room);
      const urls = added.map((f) => URL.createObjectURL(f));
      setPreviews((p) => [...p, ...urls]);
      return [...prev, ...added];
    });
  };

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggle = (k: string) =>
    setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const submitCat = async () => {
    const name = newCatName.trim();
    if (!name || catBusy) return;
    setCatBusy(true);
    try {
      const created = await onCreateCategory(name);
      if (created) {
        setCats((c) => (c.includes(created.id) ? c : [...c, created.id]));
        setNewCatName("");
        setAddingCat(false);
      }
    } finally {
      setCatBusy(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || saving) return;
    await onSave({
      title: title.trim(),
      description: desc.trim(),
      categories: cats.length ? cats : ["life"],
      scale,
      is_near: isNear,
      files,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto overflow-x-hidden rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pb-6 pt-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="v2-tighter text-[24px] font-light leading-tight text-[var(--v2-ink-900)]">Новое желание</h2>
              <p className="v2-tight mt-1.5 text-[13px] text-[var(--v2-ink-500)]">
                План не нужен. Достаточно того, что вы этого хотите.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            >
              <IcClose className="h-[17px] w-[17px]" />
            </button>
          </div>

          <div
            className={`mt-6 rounded-2xl bg-[var(--v2-ink-100)] transition ${
              dragOver ? "ring-2 ring-[var(--v2-brand-400)]" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              appendFiles(filesFromDropOrInput(e.dataTransfer.files));
            }}
          >
            {files.length === 0 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-[168px] w-full flex-col items-center justify-center gap-2 px-4 text-center hover:bg-[var(--v2-ink-200)]/40"
              >
                <V2Icons.upload className="h-6 w-6 text-[var(--v2-ink-400)]" />
                <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
                  Фото или видео по желанию — перетащите или нажмите
                </span>
                <span className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">
                  можно сохранить и без медиа · до {MAX_WISH_IMAGES} файлов
                </span>
              </button>
            ) : (
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((url, i) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--v2-ink-200)]">
                      {files[i] && wishMediaTypeFromFile(files[i]!) === "video" ? (
                        <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[var(--v2-ink-600)]"
                      >
                        <IcClose className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_WISH_IMAGES ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--v2-ink-300)] text-[var(--v2-ink-400)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-600)]"
                    >
                      <V2Icons.plus className="h-5 w-5" />
                      <span className="text-[11px]">Ещё</span>
                    </button>
                  ) : null}
                </div>
                <p className="v2-tnum mt-2 text-[11.5px] text-[var(--v2-ink-400)]">
                  {files.length} из {MAX_WISH_IMAGES}
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={WISH_MEDIA_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              appendFiles(filesFromDropOrInput(e.target.files));
              e.target.value = "";
            }}
          />

          <label className="mt-5 block">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
              Название
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Дом с большими окнами у воды"
              className="v2-tight mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
              Описание — необязательно
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Как это должно ощущаться"
              className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
          <div className="mt-4">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
              Категории
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {catOptions.map((meta) => {
                const on = cats.includes(meta.id);
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => toggle(meta.id)}
                    className="v2-tight h-8 rounded-full border px-3 text-[12.5px] font-medium transition"
                    style={
                      on
                        ? { background: meta.tint, color: "#fff", borderColor: meta.tint }
                        : { background: "#fff", color: "#52525B", borderColor: "#E4E4E7" }
                    }
                  >
                    {meta.label}
                  </button>
                );
              })}
              {addingCat ? (
                <span className="inline-flex h-8 items-center gap-1">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void submitCat();
                      }
                      if (e.key === "Escape") {
                        setAddingCat(false);
                        setNewCatName("");
                      }
                    }}
                    placeholder="Название"
                    className="v2-tight h-8 w-[140px] rounded-full border border-[var(--v2-ink-200)] px-3 text-[12.5px] outline-none focus:border-[var(--v2-brand-400)]"
                  />
                  <button
                    type="button"
                    disabled={!newCatName.trim() || catBusy}
                    onClick={() => void submitCat()}
                    className="h-8 rounded-full bg-[var(--v2-ink-900)] px-3 text-[12px] font-medium text-white disabled:opacity-40"
                  >
                    Ок
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCat(true)}
                  className="v2-tight inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-[var(--v2-ink-300)] px-3 text-[12.5px] font-medium text-[var(--v2-ink-400)] transition hover:text-[var(--v2-ink-700)]"
                >
                  <V2Icons.plus className="h-3.5 w-3.5" /> категория
                </button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
              Масштаб
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WISH_SCALES.map((id) => {
                const meta = WISH_SCALE_META[id];
                const on = scale === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScale(id)}
                    className="v2-tight h-8 rounded-full border px-3 text-[12.5px] font-medium transition"
                    style={
                      on
                        ? { background: meta.tint, color: "#fff", borderColor: meta.tint }
                        : { background: "#fff", color: "#52525B", borderColor: "#E4E4E7" }
                    }
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setIsNear((v) => !v)}
              className={`v2-tight mt-3 inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium transition ${
                isNear
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-200)]"
              }`}
            >
              <span className={`relative h-4 w-7 rounded-full transition ${isNear ? "bg-white/30" : "bg-[var(--v2-ink-300)]"}`}>
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${
                    isNear ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
              Ближайшее
            </button>
            <p className="v2-tight mt-1.5 text-[12px] text-[var(--v2-ink-400)]">
              Можно сделать в ближайшее время — не только крупные.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 bg-[var(--v2-ink-50)] px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!title.trim() || saving}
            onClick={() => void submit()}
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40 disabled:hover:bg-[var(--v2-ink-900)]"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextMode() {
  return (
    <div className="max-w-[900px] rounded-[24px] bg-white px-[88px] py-[72px] shadow-[var(--v2-shadow-soft)]">
      {ESSAY.map((p, i) =>
        p.lead ? (
          <p
            key={i}
            className="v2-tighter text-[30px] font-light leading-[1.3] text-[var(--v2-ink-900)]"
            style={{ textWrap: "pretty" }}
          >
            {p.text}
          </p>
        ) : p.pull ? (
          <p
            key={i}
            className="v2-tight my-9 border-l-2 border-[var(--v2-brand-300)] pl-6 text-[21px] font-light leading-[1.45] text-[var(--v2-brand-700)]"
            style={{ textWrap: "pretty" }}
          >
            {p.text}
          </p>
        ) : (
          <p
            key={i}
            className="v2-tight mt-6 text-[17px] leading-[1.75] text-[var(--v2-ink-700)]"
            style={{ textWrap: "pretty" }}
          >
            {p.text}
          </p>
        )
      )}
      <div className="v2-tight mt-12 border-t border-[var(--v2-ink-100)] pt-6 text-[12px] text-[var(--v2-ink-400)]">
        Обновлено 2 августа · читать 2 минуты
      </div>
    </div>
  );
}

function DayMode() {
  return (
    <div className="flex max-w-[1000px] flex-col gap-10">
      {MYDAY.map((block) => {
        const Ic = DAY_ICONS[block.icon];
        return (
          <section key={block.part}>
            <div className="mb-5 flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: WISH_CATS.material.bg, color: block.tint }}
              >
                <Ic className="h-[19px] w-[19px]" />
              </span>
              <h2 className="v2-tighter text-[26px] font-light text-[var(--v2-ink-900)]">{block.part}</h2>
              <span className="h-px flex-1 bg-[var(--v2-ink-200)]" />
            </div>
            <div className="flex flex-col gap-3">
              {block.items.map((it) => (
                <div
                  key={it.t}
                  className="group flex gap-6 rounded-[20px] bg-white px-6 py-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
                >
                  <span className="v2-tnum w-[54px] shrink-0 pt-0.5 text-[13px] font-medium text-[var(--v2-ink-400)]">
                    {it.t}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="v2-tight text-[17px] font-medium leading-snug text-[var(--v2-ink-900)]"
                      style={{ textWrap: "pretty" }}
                    >
                      {it.h}
                    </h3>
                    {it.d ? (
                      <p
                        className="v2-tight mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]"
                        style={{ textWrap: "pretty" }}
                      >
                        {it.d}
                      </p>
                    ) : null}
                  </div>
                  {it.img ? (
                    <div className="h-[88px] w-[132px] shrink-0 overflow-hidden rounded-xl bg-[var(--v2-ink-100)]">
                      <div className="flex h-full items-center justify-center text-[11px] text-[var(--v2-ink-400)]">
                        фото
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function PersonalWishesClient() {
  const [mode, setMode] = useState<Mode>("visual");
  const [cat, setCat] = useState<"all" | string>("all");
  const [nearOnly, setNearOnly] = useState(false);
  const [items, setItems] = useState<PersonalWish[]>([]);
  const [customCats, setCustomCats] = useState<WishCustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [openImageIndex, setOpenImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const catById = useMemo(() => new Map(customCats.map((c) => [c.id, c])), [customCats]);
  const catOptions = useMemo(() => allWishCatMetas(customCats), [customCats]);

  const reload = useCallback(async () => {
    const data = await fetchJson<{ wishes: PersonalWish[]; categories: WishCustomCategory[] }>(
      "/api/v2/personal/wishes"
    );
    setItems(data.wishes ?? []);
    setCustomCats(data.categories ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить желания");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((w) => w.categories.forEach((k) => (c[k] = (c[k] || 0) + 1)));
    return c;
  }, [items]);

  const shown = useMemo(() => {
    let list = cat === "all" ? items : items.filter((w) => w.categories.includes(cat));
    if (nearOnly) list = list.filter((w) => w.is_near);
    return list;
  }, [items, cat, nearOnly]);

  const openWish = useCallback((id: string, imageIndex?: number) => {
    setOpenImageIndex(imageIndex ?? 0);
    setOpen(id);
  }, []);
  const step = useCallback(
    (d: number) =>
      setOpen((cur) => {
        if (!cur || !shown.length) return cur;
        const i = shown.findIndex((w) => w.id === cur);
        setOpenImageIndex(0);
        if (i < 0) return shown[0]?.id ?? null;
        return shown[(i + d + shown.length) % shown.length]!.id;
      }),
    [shown]
  );

  const createCategory = async (name: string): Promise<WishCatMeta | null> => {
    try {
      const { category } = await fetchJson<{ category: WishCustomCategory }>(
        "/api/v2/personal/wishes/categories",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      setCustomCats((prev) => {
        if (prev.some((c) => c.id === category.id)) return prev;
        return [...prev, category];
      });
      return {
        id: category.id,
        label: category.name,
        tint: category.tint,
        bg: category.bg,
        builtin: false,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать категорию");
      return null;
    }
  };

  const saveNew = async (payload: {
    title: string;
    description: string;
    categories: string[];
    scale: WishScale;
    is_near: boolean;
    files: File[];
  }) => {
    setSaving(true);
    setError(null);
    try {
      const { wish } = await fetchJson<{ wish: PersonalWish }>("/api/v2/personal/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          categories: payload.categories,
          scale: payload.scale,
          is_near: payload.is_near,
        }),
      });
      const blobUrls = payload.files.map((f) => URL.createObjectURL(f));
      const optimistic: PersonalWish = {
        ...wish,
        images: blobUrls.map((url, i) => ({
          id: `pending-${wish.id}-${i}`,
          wish_id: wish.id,
          url,
          name: payload.files[i]?.name || "photo.jpg",
          media_type: payload.files[i] ? wishMediaTypeFromFile(payload.files[i]!) : "image",
          sort_order: i,
          created_at: wish.created_at,
        })),
      };
      setItems((prev) => sortWishes([optimistic, ...prev.filter((x) => x.id !== wish.id)]));
      setAdding(false);
      setSaving(false);
      if (!payload.files.length) return;
      setUploading(true);
      void (async () => {
        try {
          await postWishImages(wish.id, payload.files);
          await reload();
        } catch (e) {
          await reload();
          setError(
            `${uploadErrorMessage(e, "Не удалось загрузить файл")} Желание сохранено — медиа можно добавить, открыв карточку.`
          );
        } finally {
          blobUrls.forEach((url) => URL.revokeObjectURL(url));
          setUploading(false);
        }
      })();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const uploadToOpen = async (files: FileList | File[] | null) => {
    if (!open || !files) return;
    const list = filesFromDropOrInput(files);
    if (!list.length) return;
    const current = items.find((w) => w.id === open);
    const room = MAX_WISH_IMAGES - (current?.images.length ?? 0);
    if (room <= 0) {
      setError(`Можно добавить не больше ${MAX_WISH_IMAGES} файлов`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await postWishImages(open, list.slice(0, room));
      await reload();
    } catch (e) {
      setError(uploadErrorMessage(e, "Не удалось загрузить файл"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageId: string) => {
    if (!open) return;
    try {
      await fetchJson(`/api/v2/personal/wishes/${open}/images?imageId=${encodeURIComponent(imageId)}`, {
        method: "DELETE",
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить файл");
    }
  };

  const deleteWish = async (id?: string) => {
    const wishId = id ?? open;
    if (!wishId) return;
    if (!confirm("Удалить это желание?")) return;
    try {
      await fetchJson(`/api/v2/personal/wishes/${wishId}`, { method: "DELETE" });
      if (open === wishId) setOpen(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const patchWish = async (
    id: string,
    patch: {
      title?: string;
      description?: string;
      categories?: string[];
      scale?: WishScale;
      is_near?: boolean;
    }
  ) => {
    try {
      await fetchJson(`/api/v2/personal/wishes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
      throw e;
    }
  };

  const current = open ? items.find((w) => w.id === open) : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-16 pt-6">
      <div className="mb-7 flex items-center justify-between gap-8">
        <h1 className="v2-tighter text-[54px] font-light leading-none text-[var(--v2-ink-900)]">Желания</h1>
        <div className="flex shrink-0 items-center gap-2.5">
          <ModeSwitch mode={mode} setMode={setMode} />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            <V2Icons.plus className="h-4 w-4" /> Добавить желание
          </button>
        </div>
      </div>

      <ManifestoPlate />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : null}
      {uploading && !current ? (
        <div className="mb-4 rounded-xl border border-[var(--v2-ink-200)] bg-white px-4 py-3 text-[13px] text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)]">
          Фото загружаются в фоне — карточка уже в ленте.
        </div>
      ) : null}

      {mode === "visual" ? (
        <>
          <div className="mb-7 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCat("all")}
              className={`v2-tight h-9 rounded-full px-4 text-[13px] font-medium transition ${
                cat === "all"
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-white/80 text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              Все <span className="v2-tnum ml-1 text-[11.5px] opacity-60">{items.length}</span>
            </button>
            {catOptions.map((meta) => {
              const active = cat === meta.id;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => setCat(meta.id)}
                  className="v2-tight inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium shadow-[var(--v2-shadow-card)] transition"
                  style={
                    active
                      ? { background: meta.tint, color: "#fff" }
                      : { background: "rgba(255,255,255,.8)", color: "#52525B" }
                  }
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: active ? "rgba(255,255,255,.8)" : meta.tint }}
                  />
                  {meta.label}
                  <span className="v2-tnum text-[11.5px] opacity-60">{counts[meta.id] || 0}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setNearOnly((v) => !v)}
              className={`v2-tight ml-1 inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium shadow-[var(--v2-shadow-card)] transition ${
                nearOnly
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-white/80 text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              <span
                className={`relative h-4 w-7 rounded-full transition ${
                  nearOnly ? "bg-white/30" : "bg-[var(--v2-ink-300)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${
                    nearOnly ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
              Ближайшее
              <span className="v2-tnum text-[11.5px] opacity-60">{items.filter((w) => w.is_near).length}</span>
            </button>
          </div>

          {loading ? (
            <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">Загрузка…</p>
          ) : shown.length === 0 ? (
            <div className="rounded-[24px] bg-white px-10 py-16 text-center shadow-[var(--v2-shadow-soft)]">
              <p className="v2-tighter text-[28px] font-light text-[var(--v2-ink-900)]">
                {nearOnly ? "Нет ближайших" : "Пока пусто"}
              </p>
              <p className="v2-tight mx-auto mt-3 max-w-[42ch] text-[14px] text-[var(--v2-ink-500)]">
                {nearOnly
                  ? "Отметьте желание тумблером «Ближайшее» — так можно увидеть, что реально сделать в ближайшее время, не только крупные."
                  : "Добавьте первое желание — с названием. Фото не обязательно."}
              </p>
              {nearOnly ? (
                <button
                  type="button"
                  onClick={() => setNearOnly(false)}
                  className="mt-6 inline-flex h-10 items-center rounded-xl bg-[var(--v2-ink-100)] px-4 text-[13px] font-medium text-[var(--v2-ink-800)]"
                >
                  Показать все
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white"
                >
                  <V2Icons.plus className="h-4 w-4" /> Добавить желание
                </button>
              )}
            </div>
          ) : (
            <WishesMasonryGrid
              wishes={shown}
              renderCard={(w, i) => (
                <WishCard
                  w={w}
                  i={i}
                  catById={catById}
                  onOpen={openWish}
                  onCat={setCat}
                  onDelete={(id) => void deleteWish(id)}
                />
              )}
            />
          )}
        </>
      ) : null}

      {mode === "text" ? <TextMode /> : null}
      {mode === "day" ? <DayMode /> : null}

      {current ? (
        <Fullscreen
          w={current}
          catById={catById}
          catOptions={catOptions}
          startIndex={openImageIndex}
          onClose={() => setOpen(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onDelete={() => void deleteWish()}
          onUpload={(files) => void uploadToOpen(files)}
          onRemoveImage={(id) => void removeImage(id)}
          onPatch={(patch) => patchWish(current.id, patch)}
          onCreateCategory={createCategory}
          uploading={uploading}
        />
      ) : null}
      {adding ? (
        <AddModal
          onClose={() => !saving && setAdding(false)}
          catOptions={catOptions}
          onCreateCategory={createCategory}
          onSave={async (p) => {
            try {
              await saveNew(p);
            } catch {
              /* error already set */
            }
          }}
          saving={saving}
        />
      ) : null}
    </div>
  );
}
