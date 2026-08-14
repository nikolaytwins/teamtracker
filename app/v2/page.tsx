import { redirect } from "next/navigation";
import { appPath } from "@/lib/api-url";

export default function V2IndexPage() {
  redirect(appPath("/v2/home"));
}
