import { Sparkles } from "lucide-react";
import { t } from "@/i18n";

type AdminComingSoonProps = {
  title: string;
  description?: string;
};

export function AdminComingSoon({
  title,
  description = t("p8.admin.common.coming_soon_description"),
}: AdminComingSoonProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}
