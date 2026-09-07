import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function V2ImpulseRedirectPage() {
  redirect(appPath("/v2/agency/impulse"));
}
