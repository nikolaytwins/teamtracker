import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { loadPersonalFinanceDashboard } from "@/lib/v2/personal/personal-finance-repo";
import {
  guessBudgetCategoryName,
  parseBankStatementCsv,
  parseBankStatementText,
  type ParsedStatementOp,
} from "@/lib/v2/personal/statement-import";

export type ImportPreviewItem = ParsedStatementOp & {
  budget_category_id: string | null;
  budget_category_name: string | null;
  selected: boolean;
  year: number;
  month: number;
};

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : String(text ?? "");
}

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  try {
    const contentType = request.headers.get("content-type") || "";
    let rawText = "";
    let source: "pdf" | "csv" | "text" = "text";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Прикрепите файл выписки" }, { status: 400 });
      }
      const name = file.name.toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());
      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        source = "pdf";
        rawText = await extractPdfText(buf);
      } else {
        source = "csv";
        rawText = buf.toString("utf-8");
      }
    } else {
      const body = await request.json();
      rawText = String(body.text ?? body.csv ?? "");
      source = body.format === "csv" ? "csv" : "text";
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "Пустая выписка" }, { status: 400 });
    }

    const parsed =
      source === "csv" || (!rawText.includes("Движение средств") && rawText.includes(";"))
        ? parseBankStatementCsv(rawText)
        : parseBankStatementText(rawText);

    if (parsed.operations.length === 0) {
      return NextResponse.json(
        {
          error: "Не удалось найти операции. Загрузите PDF Т-Банка с текстовым слоем или CSV.",
          warnings: parsed.warnings,
          bank: parsed.bank,
        },
        { status: 400 }
      );
    }

    // Load categories for months present in the statement
    const monthKeys = new Set(
      parsed.operations.map((op) => {
        const d = new Date(`${op.date}T12:00:00Z`);
        return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      })
    );

    const categoryMaps = new Map<string, { id: string; name: string }[]>();
    for (const key of monthKeys) {
      const [y, m] = key.split("-").map(Number);
      const dash = await loadPersonalFinanceDashboard(auth.ctx, y, m);
      categoryMaps.set(
        key,
        dash.budgetCategories.map((c) => ({ id: c.id, name: c.name }))
      );
    }

    const items: ImportPreviewItem[] = parsed.operations.map((op) => {
      const d = new Date(`${op.date}T12:00:00Z`);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const cats = categoryMaps.get(`${year}-${month}`) ?? [];
      const guessName = guessBudgetCategoryName(op.description);
      const matched = guessName ? cats.find((c) => c.name === guessName) : undefined;
      const fallback = cats.find((c) => c.name === "Прочее") ?? cats[0];
      const cat = matched ?? (op.txn_type === "expense" ? fallback : undefined);
      return {
        ...op,
        budget_category_id: cat?.id ?? null,
        budget_category_name: cat?.name ?? null,
        selected: true,
        year,
        month,
      };
    });

    const expenseTotal = items
      .filter((i) => i.txn_type === "expense")
      .reduce((s, i) => s + i.amount_rub, 0);
    const incomeTotal = items
      .filter((i) => i.txn_type === "income")
      .reduce((s, i) => s + i.amount_rub, 0);

    return NextResponse.json({
      bank: parsed.bank,
      source,
      skipped: parsed.skipped,
      warnings: parsed.warnings,
      items,
      summary: {
        count: items.length,
        expenseTotal,
        incomeTotal,
      },
    });
  } catch (e) {
    console.error("parse statement:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось разобрать выписку" },
      { status: 500 }
    );
  }
}
