import { PersonalTransactionsClient } from "@/components/v2/personal/finance/personal-transactions-client";

export default async function PersonalTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : undefined;
  const month = sp.month ? Number(sp.month) : undefined;
  return (
    <PersonalTransactionsClient
      initialYear={year && Number.isFinite(year) ? year : undefined}
      initialMonth={month && Number.isFinite(month) && month >= 1 && month <= 12 ? month : undefined}
    />
  );
}
