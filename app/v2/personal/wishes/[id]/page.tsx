import { WishGoalPage } from "@/components/v2/personal/wishes/wish-goal-page";

type Props = { params: Promise<{ id: string }> };

export default async function PersonalWishGoalPage({ params }: Props) {
  const { id } = await params;
  return <WishGoalPage wishId={id} />;
}
