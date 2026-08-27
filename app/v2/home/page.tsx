import { V2PersonalHomeClient } from "@/components/v2/home/v2-personal-home-client";

/** Данные подгружаются на клиенте — без блокирующего SSR к Supabase. */
export default function V2HomePage() {
  return <V2PersonalHomeClient />;
}
