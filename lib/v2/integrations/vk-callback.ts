export type VkCallbackBody = {
  type: string;
  group_id?: number;
  secret?: string;
  object?: unknown;
};

export class VkWebhookConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VkWebhookConfigError";
  }
}

export function getVkConfirmationResponse(): string {
  const value = process.env.VK_CALLBACK_CONFIRMATION?.trim();
  if (!value) {
    throw new VkWebhookConfigError("VK_CALLBACK_CONFIRMATION не задан");
  }
  return value;
}

export function verifyVkCallbackSecret(body: VkCallbackBody): boolean {
  const expected = process.env.VK_CALLBACK_SECRET?.trim();
  if (!expected) return true;
  return body.secret === expected;
}

export function verifyVkGroupId(groupId: number | undefined): boolean {
  const expected = process.env.VK_GROUP_ID?.trim();
  if (!expected) return true;
  if (groupId == null) return false;
  return String(groupId) === expected;
}
