import type { NextConfig } from "next";

/**
 * Поддомен (tt.twinlabs.ru): соберите и запустите с TEAM_TRACKER_ROOT_DOMAIN=1 — без basePath, приложение с корня /.
 * Иначе префикс /pm-board (как за nginx location /pm-board).
 */
const root =
  process.env.TEAM_TRACKER_ROOT_DOMAIN === "1" ||
  process.env.TEAM_TRACKER_ROOT_DOMAIN === "true";

const basePath = root ? "" : "/pm-board";

const nextConfig: NextConfig = {
  /** Сборка даёт `.next/standalone` — деплой на слабый VPS без `npm run build` на сервере (см. .github/workflows/deploy.yml). */
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
