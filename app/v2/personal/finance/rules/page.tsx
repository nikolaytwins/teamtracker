import { PersonalFinanceRulesClient } from "@/components/v2/personal/finance/personal-finance-rules-client";
import { loadFinanceDistributionRules } from "@/lib/v2/personal/finance-distribution-rules";

export default function PersonalFinanceRulesPage() {
  const { title, body } = loadFinanceDistributionRules();
  return <PersonalFinanceRulesClient title={title} body={body} />;
}
