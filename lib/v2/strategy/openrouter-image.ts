/** Генерация обложек статей через OpenRouter (GPT Image / совместимые модели). */

export async function generateStrategyCoverViaOpenRouter(input: {
  title: string;
  tag: string;
  promptExtra?: string;
}): Promise<{ b64: string; mime: string } | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const model =
    process.env.OPENROUTER_IMAGE_MODEL?.trim() || "google/gemini-2.5-flash-image-preview";

  const prompt = [
    "Editorial cover image for a personal strategy journal article.",
    "Cinematic still life or abstract metaphor, refined corporate aesthetic.",
    "Brand accent blue #3B6FF7 allowed subtly. No text, no logos, no readable words, no faces.",
    `Theme tag: ${input.tag}.`,
    `Article title: ${input.title}.`,
    input.promptExtra ?? "",
    "16:9 composition, high detail photograph or fine-art still life.",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.TEAM_TRACKER_PUBLIC_ORIGIN || "https://tt.twinlabs.ru",
      "X-Title": "Team Tracker Strategy Covers",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter image failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        images?: Array<{ image_url?: { url?: string } }>;
        content?: unknown;
      };
    }>;
  };

  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) return null;

  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    return { mime: m[1]!, b64: m[2]! };
  }

  const imgRes = await fetch(url);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const mime = imgRes.headers.get("content-type") || "image/png";
  return { mime, b64: buf.toString("base64") };
}
