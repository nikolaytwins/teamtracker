import { NextRequest, NextResponse } from "next/server";
import {
  getVkConfirmationResponse,
  verifyVkCallbackSecret,
  verifyVkGroupId,
  VkCallbackBody,
  VkWebhookConfigError,
} from "@/lib/v2/integrations/vk-callback";

const plainText = { "Content-Type": "text/plain; charset=utf-8" } as const;

/**
 * VK Callback API (сообщество → Работа с API → Callback API).
 * confirmation: plain-text ответ VK_CALLBACK_CONFIRMATION.
 * Остальные события: "ok" (обработка сообщений — через OpenClaw vk-plugin на VPS Софии).
 */
export async function POST(request: NextRequest) {
  try {
    getVkConfirmationResponse();
  } catch (error) {
    if (error instanceof VkWebhookConfigError) {
      console.error("integrations/vk/webhook:", error.message);
      return new NextResponse("VK webhook not configured", { status: 503, headers: plainText });
    }
    throw error;
  }

  let body: VkCallbackBody;
  try {
    body = (await request.json()) as VkCallbackBody;
  } catch {
    return new NextResponse("bad request", { status: 400, headers: plainText });
  }

  if (!verifyVkCallbackSecret(body)) {
    return new NextResponse("forbidden", { status: 403, headers: plainText });
  }

  if (!verifyVkGroupId(body.group_id)) {
    return new NextResponse("forbidden", { status: 403, headers: plainText });
  }

  if (body.type === "confirmation") {
    return new NextResponse(getVkConfirmationResponse(), { status: 200, headers: plainText });
  }

  if (body.type === "message_new") {
    console.info("integrations/vk/webhook message_new (no handler yet)", {
      group_id: body.group_id,
    });
  }

  return new NextResponse("ok", { status: 200, headers: plainText });
}
