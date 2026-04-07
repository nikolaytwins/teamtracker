import Navigation from "@/components/Navigation";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/80">
      <Navigation />
      {children}
    </div>
  );
}
