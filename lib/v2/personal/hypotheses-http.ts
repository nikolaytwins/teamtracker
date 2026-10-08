import { NextResponse } from "next/server";
import {
  PersonalHypothesesNotFoundError,
  PersonalHypothesesValidationError,
} from "@/lib/v2/personal/personal-hypotheses-repo";

export function hypothesesFail(error: unknown, fallback: string) {
  if (error instanceof PersonalHypothesesValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof PersonalHypothesesNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const message =
    error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  console.error(fallback, error);
  if (code === "42P01" || code === "PGRST205" || /does not exist|schema cache|v2_personal_hypothes/i.test(message)) {
    return NextResponse.json(
      { error: "Банк гипотез ещё не создан в базе. Примени миграцию 089_v2_personal_hypotheses.sql." },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
