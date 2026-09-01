/**
 * Резервная копия карточек сентября до редизайна (сентябрь 2026).
 * Откат UI: в home-season-band.tsx импортировать HomeSeasonBandLegacy.
 */
import type { HomeSeasonTask } from "./home-seed";

export const SEP_2026_TASKS_V1_BACKUP: HomeSeasonTask[] = [
  {
    id: "sep-webinar-time",
    text: "Начать считать вебинарные проекты и трату времени на них",
    href: "https://docs.google.com/document/d/1eGGnwy5yCqVFAMdmrvAcmv9iL85WxLol_zD3St8rBWk/edit?usp=sharing",
  },
  {
    id: "sep-urgent-rules",
    text: "Сформулировать правила срочных проектов",
    href: "https://docs.google.com/document/d/1eGGnwy5yCqVFAMdmrvAcmv9iL85WxLol_zD3St8rBWk/edit?usp=sharing",
  },
  {
    id: "sep-finance-thresholds",
    text: "Сформулировать финансовые пороги",
    href: "https://docs.google.com/document/d/1eGGnwy5yCqVFAMdmrvAcmv9iL85WxLol_zD3St8rBWk/edit?usp=sharing",
  },
  {
    id: "sep-lera-reglament",
    text: "Прописать регламент перед разговором с Лерой",
    href: "https://docs.google.com/document/d/18kGrtjAbPvvViHcE3pJnH-GkDDHKUH5NuHmALaFGVGw/edit?usp=sharing",
  },
  { id: "sep-portfolio", text: "Оформить портфолио агентства" },
  { id: "sep-model-fix", text: "Разобрать косяки прошлой модели и исправить" },
  { id: "sep-cv", text: "Сделать 2 CV — одно на поддержку, одно на ИИ-внедрение" },
  { id: "sep-reactivate", text: "Реактивировать базу" },
  { id: "sep-housing", text: "Разобраться с жильём" },
  { id: "sep-youtube-script", text: "Написать сценарий ютуб" },
];
