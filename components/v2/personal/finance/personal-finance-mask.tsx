"use client";

import { createContext, useContext } from "react";
import {
  formatPersonalRub,
  formatPersonalRubShort,
  formatPersonalRubSigned,
} from "@/lib/v2/personal/formatters";

const MaskCtx = createContext(false);

export function PersonalMaskProvider({
  masked,
  children,
}: {
  masked: boolean;
  children: React.ReactNode;
}) {
  return <MaskCtx.Provider value={masked}>{children}</MaskCtx.Provider>;
}

export function PersonalAmt({
  v,
  short,
  signed,
  className = "",
}: {
  v: number;
  short?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const masked = useContext(MaskCtx);
  const text = signed
    ? formatPersonalRubSigned(v)
    : short
      ? formatPersonalRubShort(v)
      : formatPersonalRub(v);
  return (
    <span
      className={`v2-tnum tabular-nums transition-all duration-300 ${masked ? "select-none blur-[7px]" : ""} ${className}`}
    >
      {text}
    </span>
  );
}
