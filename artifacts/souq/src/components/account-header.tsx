import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export function AccountHeader({ title, backTo = "/settings" }: { title: string; backTo?: string }) {
  const [, navigate] = useLocation();
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">{title}</h1>
      </div>
    </header>
  );
}
