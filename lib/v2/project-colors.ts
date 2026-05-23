export type ProjectColor = { tint: string; bg: string; ink?: string };

/** Палитра как в HTML-макете «Мои задачи v2». */
export const V2_PROJECT_COLORS: ProjectColor[] = [
  { tint: "#3B6FF7", bg: "#E6EDFF" },
  { tint: "#E40521", bg: "#FEEFF0" },
  { tint: "#005BFF", bg: "#E5EEFF" },
  { tint: "#FF335F", bg: "#FFE3EA" },
  { tint: "#00A046", bg: "#E2F5E9" },
  { tint: "#FC3F1D", bg: "#FFE9E3" },
  { tint: "#0F4C9C", bg: "#E2EAF6" },
  { tint: "#FFDD2D", bg: "#FFF7CC", ink: "#7A5C00" },
  { tint: "#0A0A0B", bg: "#EEEEF1" },
];

export function pickProjectColor(index: number): ProjectColor {
  return V2_PROJECT_COLORS[index % V2_PROJECT_COLORS.length]!;
}

export function projectAvatarInk(color: { tint: string | null; ink?: string | null }): string {
  return color.ink ?? color.tint ?? "#333";
}
