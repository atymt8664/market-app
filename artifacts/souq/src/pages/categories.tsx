import { useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/category-icon";
import { motion } from "framer-motion";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";

export default function Categories() {
  const { locale } = useLocale();
  const { data: categories, isLoading } = useListCategories();
  const hasArabicText = (value?: string | null) =>
    !!value && /[\u0600-\u06FF]/.test(value);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center gap-4">
        <Link href="/">
          <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-xl">{t("categories.title")}</h1>
      </header>

      <div className="flex flex-col">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="w-5 h-5 rounded-full" />
            </div>
          ))
        ) : (
          categories?.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.id}`}>
              <div className="flex items-center gap-4 p-4 border-b border-border hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center group-active:scale-95 transition-transform border border-primary/20">
                  <CategoryIcon name={cat.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="font-semibold text-base">
                    {getCreateAdTaxonomyLabel(locale, cat.name)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {cat.subtitle
                      ? (() => {
                          const mapped = getCreateAdTaxonomyLabel(locale, cat.subtitle);
                          if (locale !== "ar" && hasArabicText(mapped)) {
                            return t("category.subtitle");
                          }
                          return mapped;
                        })()
                      : t("category.subtitle")}
                  </p>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}
