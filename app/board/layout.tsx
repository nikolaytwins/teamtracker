import AppShell from "@/components/AppShell";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
