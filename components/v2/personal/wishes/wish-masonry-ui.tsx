"use client";

import type { PersonalWish } from "@/lib/v2/personal/personal-wishes-repo";
import {
  distributeWishesMasonryColumns,
  wishMasonryColumnCount,
} from "@/lib/v2/personal/wish-masonry";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const MASONRY_GAP = 12;

function WishPhotoNatural({ url, onOpen }: { url: string; onOpen?: () => void }) {
  const [aspect, setAspect] = useState(4 / 3);

  const inner = (
    <div className="w-full overflow-hidden rounded-xl bg-[var(--v2-ink-100)]">
      <div className="w-full" style={{ aspectRatio: aspect }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="h-full w-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setAspect(img.naturalWidth / img.naturalHeight);
            }
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
  baseIndex,
  onPhotoPress,
}: {
  images: PersonalWish["images"];
  baseIndex: number;
  onPhotoPress?: (index: number) => void;
}) {
  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <WishPhotoNatural
        url={images[0]!.url}
        onOpen={onPhotoPress ? () => onPhotoPress(baseIndex) : undefined}
      />
    );
  }
  return (
    <div className="flex w-full items-start gap-2">
      {images.map((img, i) => (
        <div key={img.id} className="min-w-0 flex-1">
          <WishPhotoNatural
            url={img.url}
            onOpen={onPhotoPress ? () => onPhotoPress(baseIndex + i) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

/** 1 фото — на всю ширину; 2 — один ряд; 3+ — сетка по 2 в ряд. */
export function WishPhotosInCard({
  images,
  onPhotoPress,
}: {
  images: PersonalWish["images"];
  onPhotoPress?: (index: number) => void;
}) {
  if (images.length === 0) return null;

  const rows: PersonalWish["images"][] = [];
  for (let i = 0; i < images.length; i += 2) {
    rows.push(images.slice(i, i + 2));
  }

  if (images.length === 1) {
    return (
      <div className="mt-0.5 flex flex-col gap-2.5">
        <WishPhotoNatural url={images[0]!.url} onOpen={onPhotoPress ? () => onPhotoPress(0) : undefined} />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="mt-0.5">
        <WishPhotoRow images={images} baseIndex={0} onPhotoPress={onPhotoPress} />
      </div>
    );
  }

  return (
    <div className="mt-0.5 flex w-full flex-col gap-2.5">
      {rows.map((pair, ri) => (
        <WishPhotoRow key={`row-${pair[0]?.id ?? ri}`} images={pair} baseIndex={ri * 2} onPhotoPress={onPhotoPress} />
      ))}
    </div>
  );
}

export function useWishMasonryColumns() {
  const [colCount, setColCount] = useState(3);

  useEffect(() => {
    const update = () => setColCount(wishMasonryColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return colCount;
}

export function WishesMasonryGrid({
  wishes,
  renderCard,
}: {
  wishes: PersonalWish[];
  renderCard: (w: PersonalWish, index: number) => ReactNode;
}) {
  const colCount = useWishMasonryColumns();
  const columns = useMemo(
    () => distributeWishesMasonryColumns(wishes, colCount, MASONRY_GAP),
    [wishes, colCount]
  );

  return (
    <div className="flex items-start" style={{ gap: MASONRY_GAP }}>
      {columns.map((col, ci) => (
        <div key={`col-${ci}`} className="flex min-w-0 flex-1 flex-col" style={{ gap: MASONRY_GAP }}>
          {col.map((w, wi) => renderCard(w, ci * 1000 + wi))}
        </div>
      ))}
    </div>
  );
}
