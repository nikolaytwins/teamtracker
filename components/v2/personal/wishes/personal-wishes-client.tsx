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
  gridSizeForWish,
  resolveWishCat,
  type WishCatMeta,
  type WishCustomCategory,
  type WishScale,
} from "@/lib/v2/personal/wish-cats";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function filesFromDropOrInput(list: FileList | File[] | null): File[] {
  if (!list) return [];
  return Array.from(list).filter((f) => f.type.startsWith("image/") && f.size > 0);
}

type Mode = "visual" | "text" | "day";

const MODES: { id: Mode; label: string }[] = [
  { id: "visual", label: "Визуально" },
  { id: "text", label: "Текстом" },
  { id: "day", label: "Мой день" },
];

const SUBS: Record<Mode, string> = {
  visual: "Не задачи и не цели. Карта того, какой должна ощущаться жизнь — можно просто смотреть.",
  text: "Те же желания, собранные в одно связное описание желаемой жизни.",
  day: "Сценарий одного дня, ради которого всё это строится.",
};

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
    <section className="mb-8 overflow-hidden rounded-[28px] bg-white shadow-[var(--v2-shadow-soft)]">
      <div className="px-10 py-9 sm:px-12 sm:py-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-brand-700)]">Кратко</p>
        <p
          className="v2-tighter mt-4 max-w-[28ch] text-[34px] font-light leading-[1.18] text-[var(--v2-ink-900)] sm:text-[40px]"
          style={{ textWrap: "pretty" }}
        >
          {MANIFESTO_BRIEF[0]}
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {MANIFESTO_BRIEF.slice(1).map((p) => (
            <p
              key={p}
              className="v2-tight max-w-[54ch] text-[20px] font-light leading-[1.45] text-[var(--v2-ink-800)] sm:text-[22px]"
              style={{ textWrap: "pretty" }}
            >
              {p}
            </p>
          ))}
        </div>
      </div>
      <div className="border-t border-[var(--v2-ink-100)]">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center gap-3 px-10 py-4 text-left transition hover:bg-[var(--v2-ink-50)]/70 sm:px-12"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-500)] group-hover:text-[var(--v2-ink-800)]">
            Как я к этому прихожу
          </span>
          <V2Icons.chev
            className={`ml-auto h-4 w-4 shrink-0 text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-ink-500)] ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open ? (
          <ol className="grid gap-6 px-10 pb-10 sm:grid-cols-2 sm:px-12 sm:pb-12">
            {MANIFESTO_PATH.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="v2-tnum mt-0.5 w-6 shrink-0 text-[13px] font-medium text-[var(--v2-brand-700)]">
                  {i + 1}
                </span>
                <div>
                  <h3
                    className="v2-tighter text-[20px] font-light leading-snug text-[var(--v2-ink-900)]"
                    style={{ textWrap: "pretty" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="v2-tight mt-1.5 text-[14.5px] leading-relaxed text-[var(--v2-ink-500)]"
                    style={{ textWrap: "pretty" }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
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

function IcImages(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className}>
      <rect x="3.5" y="6.5" width="13" height="11" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 6.5V5.4A1.9 1.9 0 0 1 9.9 3.5h8.7a1.9 1.9 0 0 1 1.9 1.9v8.7a1.9 1.9 0 0 1-1.9 1.9h-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
  url,
  placeholder,
  onPick,
  onClear,
  onFiles,
}: {
  url?: string | null;
  placeholder: string;
  onPick?: () => void;
  onClear?: () => void;
  onFiles?: (files: File[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
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
          title="Убрать фото"
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

function CardImages({
  images,
  onAddPhoto,
}: {
  images: PersonalWishImage[];
  onAddPhoto?: () => void;
}) {
  const n = Math.max(1, Math.min(3, images.length || 1));
  const ph = "Перетащите фото";
  const slot = (i: number, placeholder: string) => (
    <PhotoSlot
      key={images[i]?.id ?? `empty-${i}`}
      url={images[i]?.url}
      placeholder={placeholder}
      onPick={!images[i] && onAddPhoto ? onAddPhoto : undefined}
    />
  );

  if (n <= 1) {
    return <div className="h-full w-full overflow-hidden">{slot(0, ph)}</div>;
  }
  if (n === 2) {
    return (
      <div
        className="grid h-full w-full overflow-hidden"
        style={{
          gridTemplateRows: "minmax(0,1.9fr) minmax(0,1fr)",
          gridTemplateColumns: "minmax(0,1fr)",
          gap: "2px",
        }}
      >
        {slot(0, ph)}
        {slot(1, "фото")}
      </div>
    );
  }
  return (
    <div
      className="grid h-full w-full overflow-hidden"
      style={{
        gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)",
        gridTemplateRows: "minmax(0,1fr)",
        gap: "2px",
      }}
    >
      {slot(0, ph)}
      <div
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)",
          gridTemplateColumns: "minmax(0,1fr)",
          gap: "2px",
        }}
      >
        {slot(1, "фото")}
        {slot(2, "фото")}
      </div>
    </div>
  );
}

function WishCard({
  w,
  i,
  catById,
  onOpen,
  onCat,
}: {
  w: PersonalWish;
  i: number;
  catById: Map<string, WishCustomCategory>;
  onOpen: (id: string) => void;
  onCat: (k: string) => void;
}) {
  const imgs = w.images.length;
  const hasPhotos = imgs > 0;
  const size = gridSizeForWish(imgs, Boolean(w.description.trim()));
  return (
    <article
      className="v2-card-in group relative flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[var(--v2-shadow-card)] transition-all duration-300 hover:shadow-[var(--v2-shadow-cardHv)]"
      style={{
        gridColumn: `span ${size.col}`,
        gridRow: `span ${size.row}`,
        animationDelay: `${i * 30}ms`,
      }}
    >
      {hasPhotos ? (
        <div className="relative min-h-0 flex-1 bg-[var(--v2-ink-100)]">
          <CardImages images={w.images} />
          {imgs > 1 ? (
            <span className="pointer-events-none absolute left-3 top-3 v2-tnum inline-flex h-6 items-center gap-1 rounded-full bg-[var(--v2-ink-900)]/55 px-2 text-[11px] font-medium text-white backdrop-blur">
              <IcImages className="h-3 w-3" /> {imgs}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onOpen(w.id)}
            title="Открыть"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[var(--v2-ink-700)] opacity-0 backdrop-blur transition hover:bg-white group-hover:opacity-100"
          >
            <V2Icons.arrowR className="h-[17px] w-[17px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(w.id)}
          title="Открыть"
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)] opacity-0 transition hover:bg-[var(--v2-ink-200)] group-hover:opacity-100"
        >
          <V2Icons.arrowR className="h-[17px] w-[17px]" />
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
              hasPhotos ? "text-[16px] font-medium" : "v2-tighter text-[22px] font-light"
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
              className={`v2-tight mt-2 leading-relaxed text-[var(--v2-ink-500)] ${
                hasPhotos ? "text-[12.5px]" : "line-clamp-5 text-[13.5px]"
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
  onClose,
  onPrev,
  onNext,
  onDelete,
  onUpload,
  onRemoveImage,
  onPatch,
  uploading,
}: {
  w: PersonalWish;
  catById: Map<string, WishCustomCategory>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
  onUpload: (files: FileList | File[] | null) => void;
  onRemoveImage: (imageId: string) => void;
  onPatch: (patch: { scale?: WishScale; is_near?: boolean }) => void;
  uploading: boolean;
}) {
  const [n, setN] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setN(0);
  }, [w.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onPrev, onNext]);

  const imgs = w.images;
  const current = imgs[n] ?? imgs[0];
  const canAddMore = imgs.length < MAX_WISH_IMAGES;

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
              url={current.url}
              placeholder={
                canAddMore
                  ? "Перетащите фото или нажмите, чтобы добавить"
                  : "Достигнут лимит фото"
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
              <span className="v2-tighter text-[22px] font-light text-[var(--v2-ink-700)]">Без фото</span>
              <span className="v2-tight max-w-[28ch] text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">
                Можно оставить так или добавить изображение — карточка сама встанет в ленту.
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
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
        <div className="flex w-[400px] shrink-0 flex-col px-9 py-8">
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
            <p className="v2-tight mt-4 text-[15px] leading-relaxed text-[var(--v2-ink-600)]">{w.description}</p>
          ) : null}
          {w.note ? (
            <p className="mt-5 border-l-2 border-[var(--v2-ink-200)] pl-4 text-[14px] italic leading-relaxed text-[var(--v2-ink-500)]">
              {w.note}
            </p>
          ) : null}
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
                    onClick={() => onPatch({ scale: id })}
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
              onClick={() => onPatch({ is_near: !w.is_near })}
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
            <span className="v2-tight ml-2 text-[11.5px] text-[var(--v2-ink-400)]">← → между желаниями · Esc закрыть</span>
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-medium text-red-600 transition hover:bg-red-50"
            >
              <V2Icons.trash className="h-4 w-4" />
              Удалить
            </button>
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
                  Фото по желанию — перетащите или нажмите
                </span>
                <span className="v2-tight text-[11.5px] text-[var(--v2-ink-400)]">
                  можно сохранить и без фото · до {MAX_WISH_IMAGES} изображений
                </span>
              </button>
            ) : (
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((url, i) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--v2-ink-200)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
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
            accept="image/*"
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

  const openWish = useCallback((id: string) => setOpen(id), []);
  const step = useCallback(
    (d: number) =>
      setOpen((cur) => {
        if (!cur || !shown.length) return cur;
        const i = shown.findIndex((w) => w.id === cur);
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
      if (payload.files.length) {
        const fd = new FormData();
        payload.files.slice(0, MAX_WISH_IMAGES).forEach((f) => fd.append("files", f));
        const res = await fetch(apiUrl(`/api/v2/personal/wishes/${wish.id}/images`), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Не удалось загрузить фото");
      }
      await reload();
      setAdding(false);
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
      setError(`Можно добавить не больше ${MAX_WISH_IMAGES} фото`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      list.slice(0, room).forEach((f) => fd.append("files", f));
      const res = await fetch(apiUrl(`/api/v2/personal/wishes/${open}/images`), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить фото");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
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
      setError(e instanceof Error ? e.message : "Не удалось удалить фото");
    }
  };

  const deleteWish = async () => {
    if (!open) return;
    if (!confirm("Удалить это желание?")) return;
    try {
      await fetchJson(`/api/v2/personal/wishes/${open}`, { method: "DELETE" });
      setOpen(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const patchWish = async (id: string, patch: { scale?: WishScale; is_near?: boolean }) => {
    try {
      await fetchJson(`/api/v2/personal/wishes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const current = open ? items.find((w) => w.id === open) : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-16 pt-6">
      <div className="mb-7 flex items-end justify-between gap-8">
        <div>
          <h1 className="v2-tighter text-[54px] font-light leading-none text-[var(--v2-ink-900)]">Желания</h1>
          <p className="v2-tight mt-3 max-w-[56ch] text-[14.5px] text-[var(--v2-ink-500)]">{SUBS[mode]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pb-1">
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
            <div className="wish-masonry grid gap-[22px]">
              {shown.map((w, i) => (
                <WishCard
                  key={w.id}
                  w={w}
                  i={i}
                  catById={catById}
                  onOpen={openWish}
                  onCat={setCat}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {mode === "text" ? <TextMode /> : null}
      {mode === "day" ? <DayMode /> : null}

      {current ? (
        <Fullscreen
          w={current}
          catById={catById}
          onClose={() => setOpen(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onDelete={() => void deleteWish()}
          onUpload={(files) => void uploadToOpen(files)}
          onRemoveImage={(id) => void removeImage(id)}
          onPatch={(patch) => void patchWish(current.id, patch)}
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
