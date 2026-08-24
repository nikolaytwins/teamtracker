"use client";

import type { PersonalWish } from "@/lib/v2/personal/personal-wishes-repo";
import { buildWishPhotoLayout } from "@/lib/v2/personal/wish-photo-layout";
import {
  distributeWishesMasonryColumns,
  wishMasonryColumnCount,
} from "@/lib/v2/personal/wish-masonry";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const MASONRY_GAP = 12;

function WishPhotoNatural({
  url,
  aspect,
  onAspect,
  onOpen,
}: {
  url: string;
  aspect?: number | null;
  onAspect?: (aspect: number) => void;
  onOpen?: () => void;
}) {
  const [localAspect, setLocalAspect] = useState(aspect ?? 4 / 3);
  const ratio = aspect ?? localAspect;

  const applyAspect = useCallback(
    (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const next = w / h;
      setLocalAspect(next);
      onAspect?.(next);
    },
    [onAspect]
  );

  useEffect(() => {
    if (aspect != null) setLocalAspect(aspect);
  }, [aspect]);

  const inner = (
    <div className="w-full overflow-hidden rounded-xl bg-[var(--v2-ink-100)]">
      <div className="w-full" style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="h-full w-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            applyAspect(img.naturalWidth, img.naturalHeight);
          }}
        />
      </div>
    </div>
  );

  if (!onOpen) return inner;
  return (
    <button type="button" onClick={onOpen} className="block w-full text-left">
      {inner}
    </button>
  );
}

function WishPhotoRow({
  images,
  sourceIndices,
  aspects,
  onAspectAt,
  onPhotoPress,
}: {
  images: PersonalWish["images"];
  sourceIndices: number[];
  aspects: Array<number | null>;
  onAspectAt: (sourceIndex: number, aspect: number) => void;
  onPhotoPress?: (index: number) => void;
}) {
  if (images.length === 0) return null;
  if (images.length === 1) {
    const src = sourceIndices[0]!;
    return (
      <WishPhotoNatural
        url={images[0]!.url}
        aspect={aspects[src]}
        onAspect={(a) => onAspectAt(src, a)}
        onOpen={onPhotoPress ? () => onPhotoPress(src) : undefined}
      />
    );
  }
  return (
    <div className="flex w-full items-start gap-2">
      {images.map((img, i) => {
        const src = sourceIndices[i]!;
        return (
          <div key={img.id} className="min-w-0 flex-1">
            <WishPhotoNatural
              url={img.url}
              aspect={aspects[src]}
              onAspect={(a) => onAspectAt(src, a)}
              onOpen={onPhotoPress ? () => onPhotoPress(src) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

function useWishPhotoAspects(images: PersonalWish["images"]) {
  const [aspects, setAspects] = useState<Array<number | null>>(() => images.map(() => null));

  useEffect(() => {
    setAspects(images.map(() => null));
    let cancelled = false;

    images.forEach((img, i) => {
      const probe = new window.Image();
      probe.onload = () => {
        if (cancelled) return;
        const w = probe.naturalWidth;
        const h = probe.naturalHeight;
        if (w <= 0 || h <= 0) return;
        setAspects((prev) => {
          if (prev[i] != null) return prev;
          const next = [...prev];
          next[i] = w / h;
          return next;
        });
      };
      probe.src = img.url;
    });

    return () => {
      cancelled = true;
    };
  }, [images]);

  const setAspectAt = useCallback((index: number, aspect: number) => {
    setAspects((prev) => {
      if (prev[index] === aspect) return prev;
      const next = [...prev];
      next[index] = aspect;
      return next;
    });
  }, []);

  return { aspects, setAspectAt };
}

/**
 * Раскладка: портреты парами в ряд, альбомные парами в ряд (не смешиваем в одной строке).
 */
export function WishPhotosInCard({
  images,
  onPhotoPress,
}: {
  images: PersonalWish["images"];
  onPhotoPress?: (index: number) => void;
}) {
  const { aspects, setAspectAt } = useWishPhotoAspects(images);

  const rows = useMemo(() => buildWishPhotoLayout(aspects), [aspects]);

  if (images.length === 0) return null;

  return (
    <div className="mt-0.5 flex w-full flex-col gap-2.5">
      {rows.map((row, ri) => (
        <WishPhotoRow
          key={row.indices.map((i) => images[i]?.id ?? i).join("-") || `row-${ri}`}
          images={row.indices.map((i) => images[i]!)}
          sourceIndices={row.indices}
          aspects={aspects}
          onAspectAt={setAspectAt}
          onPhotoPress={onPhotoPress}
        />
      ))}
    </div>
  );
}

export function useWishMasonryColumns(container: HTMLElement | null) {
  const [colCount, setColCount] = useState(3);

  useEffect(() => {
    if (!container) return;
    const measure = () => setColCount(wishMasonryColumnCount(container.clientWidth));
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(container);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [container]);

  return colCount;
}

export function WishesMasonryGrid({
  wishes,
  renderCard,
}: {
  wishes: PersonalWish[];
  renderCard: (w: PersonalWish, index: number) => ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const colCount = useWishMasonryColumns(container);
  const columns = useMemo(
    () => distributeWishesMasonryColumns(wishes, colCount, MASONRY_GAP),
    [wishes, colCount]
  );

  let index = 0;

  return (
    <div ref={setContainer} className="flex w-full items-start" style={{ gap: MASONRY_GAP }}>
      {columns.map((col, ci) => (
        <div key={`col-${ci}`} className="flex min-w-0 flex-1 flex-col" style={{ gap: MASONRY_GAP }}>
          {col.map((w) => {
            const cardIndex = index;
            index += 1;
            return (
              <div key={w.id} className="min-w-0">
                {renderCard(w, cardIndex)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
