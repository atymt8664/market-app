import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { adminLogout, createAdminCity, updateAdminCity } from "@/features/admin/api";
import {
  ADMIN_TABLE_ROW,
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_SEARCH,
  BTN_TBL_OUTLINE,
  BTN_TBL_TOGGLE,
  BTN_TOOLBAR_OUTLINE,
  BTN_TOOLBAR_PRIMARY,
  CARD_SHELL,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminCities, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminCity } from "@/features/admin/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const fieldClass =
  "rounded-xl border border-primary/25 bg-zinc-900/80 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

const initialDraft = {
  name: "",
  countryCode: "DE",
  countryName: "Germany",
};

const VISIBILITY_FILTER_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "active", label: "ظاهرة" },
  { value: "hidden", label: "مخفية" },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function AdminCitiesPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const [qInput, setQInput] = useState(params.get("q") || "");
  const [q, setQ] = useState(params.get("q") || "");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [countryCode, setCountryCode] = useState(params.get("countryCode") || "all");

  const [addOpen, setAddOpen] = useState(false);
  const [draftCreate, setDraftCreate] = useState(initialDraft);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [draftEdit, setDraftEdit] = useState<{
    id: number;
    name: string;
    countryCode: string;
    countryName: string;
  } | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const [pendingVisibility, setPendingVisibility] = useState<{
    city: AdminCity;
    nextHidden: boolean;
  } | null>(null);

  const citiesQuery = useAdminCities({ status, q, countryCode });
  const countries = citiesQuery.data?.countries ?? [];
  const cities = citiesQuery.data?.cities ?? [];

  const countryOptions = useMemo(() => {
    const options = countries.map((item) => ({
      code: item.code,
      name: item.name,
    }));
    if (draftCreate.countryCode && !options.some((item) => item.code === draftCreate.countryCode)) {
      options.unshift({ code: draftCreate.countryCode, name: draftCreate.countryName });
    }
    if (draftEdit?.countryCode && !options.some((item) => item.code === draftEdit.countryCode)) {
      options.unshift({ code: draftEdit.countryCode, name: draftEdit.countryName });
    }
    return options;
  }, [countries, draftCreate.countryCode, draftCreate.countryName, draftEdit]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status !== "all") p.set("status", status);
    if (countryCode !== "all") p.set("countryCode", countryCode);
    const qs = p.toString();
    const next = qs ? `/admin/cities?${qs}` : "/admin/cities";
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [q, status, countryCode]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "logs"] });
  };

  const createMutation = useMutation({
    mutationFn: createAdminCity,
    onSuccess: async () => {
      await refresh();
      toast({ title: "تمت إضافة المدينة بنجاح" });
    },
    onError: (error) => {
      toast({
        title: "تعذر إضافة المدينة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateAdminCity>[1] }) =>
      updateAdminCity(id, payload),
    onSuccess: async () => {
      await refresh();
      toast({ title: "تم تحديث بيانات المدينة" });
    },
    onError: (error) => {
      toast({
        title: "تعذر تحديث المدينة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const validateDraft = (d: { name: string; countryCode: string; countryName: string }) => {
    const errs: Record<string, string> = {};
    if (!d.name.trim()) errs.name = "اسم المدينة مطلوب";
    if (!d.countryCode.trim()) errs.countryCode = "رمز الدولة مطلوب";
    else if (d.countryCode.trim().length < 2) errs.countryCode = "رمز الدولة غير صالح";
    if (!d.countryName.trim()) errs.countryName = "اسم الدولة مطلوب";
    return errs;
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const openEdit = (city: AdminCity) => {
    setEditFieldErrors({});
    setDraftEdit({
      id: city.id,
      name: city.name,
      countryCode: city.countryCode,
      countryName: city.countryName,
    });
    setEditOpen(true);
  };

  const submitCreate = () => {
    const errs = validateDraft(draftCreate);
    setCreateFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: "تحقق من الحقول", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        name: draftCreate.name.trim(),
        countryCode: draftCreate.countryCode.trim().toUpperCase(),
        countryName: draftCreate.countryName.trim(),
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setDraftCreate(initialDraft);
          setCreateFieldErrors({});
        },
      },
    );
  };

  const submitEdit = () => {
    if (!draftEdit) return;
    const errs = validateDraft(draftEdit);
    setEditFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: "تحقق من الحقول", variant: "destructive" });
      return;
    }
    updateMutation.mutate(
      {
        id: draftEdit.id,
        payload: {
          name: draftEdit.name.trim(),
          countryCode: draftEdit.countryCode.trim().toUpperCase(),
          countryName: draftEdit.countryName.trim(),
        },
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          setDraftEdit(null);
          setEditFieldErrors({});
        },
      },
    );
  };

  const confirmVisibilityChange = () => {
    if (!pendingVisibility) return;
    updateMutation.mutate(
      {
        id: pendingVisibility.city.id,
        payload: { isHidden: pendingVisibility.nextHidden },
      },
      {
        onSuccess: () => setPendingVisibility(null),
      },
    );
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  return (
    <AdminShell activeKey="cities" onLogout={handleLogout}>
      <div className="space-y-5" dir="rtl">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" aria-hidden />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">إدارة المدن</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              إضافة وتعديل المدن، وإخفاؤها أو إظهارها — مع عدد الإعلانات المرتبطة بكل مدينة (من قاعدة البيانات).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              className={BTN_TOOLBAR_OUTLINE}
              title={citiesQuery.isFetching ? "جاري التحديث..." : undefined}
              onClick={() => refresh()}
              disabled={citiesQuery.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 text-primary", citiesQuery.isFetching && "animate-spin")} aria-hidden />
              تحديث القائمة
            </Button>
            <Button
              type="button"
              className={cn(BTN_TOOLBAR_PRIMARY, "shadow-[0_0_18px_-8px_hsl(var(--primary)/0.35)]")}
              onClick={() => {
                setCreateFieldErrors({});
                setDraftCreate(initialDraft);
                setAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              إضافة مدينة
            </Button>
          </div>
        </header>

        <section className={cn(CARD_SHELL, "p-4 md:p-5")}>
          <div className="mb-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
              <form
                className="lg:col-span-7"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQ(qInput.trim());
                }}
              >
                <Label className="mb-1.5 block text-sm text-muted-foreground">بحث</Label>
                <div className="flex gap-2">
                  <Input
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    placeholder="اسم المدينة أو الدولة أو الرمز"
                    autoComplete="off"
                    className={cn(fieldClass, "h-10 flex-1")}
                  />
                  <Button type="submit" className={cn(BTN_SEARCH, "h-10")}>
                    <Search className="h-4 w-4" aria-hidden />
                    بحث
                  </Button>
                </div>
              </form>

              <div className="space-y-2 lg:col-span-5" dir="rtl">
                <Label className="block text-sm text-muted-foreground">الظهور</Label>
                <div className="flex flex-wrap gap-2">
                  {VISIBILITY_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={adminPillBtn(status === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <Label className="block text-sm text-muted-foreground">الدولة</Label>
              <div className="flex max-h-[min(40vh,14rem)] flex-wrap gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-zinc-950/50 p-2 ring-1 ring-primary/10 sm:max-h-none sm:overflow-visible">
                <button
                  type="button"
                  onClick={() => setCountryCode("all")}
                  className={adminPillBtn(countryCode === "all")}
                >
                  الكل
                </button>
                {countries.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setCountryCode(item.code)}
                    className={cn(
                      adminPillBtn(countryCode === item.code),
                      "max-w-full min-w-0 text-right",
                    )}
                    title={`${item.name} (${item.code})`}
                  >
                    <span className="block truncate">
                      {item.name}{" "}
                      <span className="tabular-nums text-muted-foreground">({item.code})</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-zinc-900/40 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{cities.length.toLocaleString("ar-EG")}</span> مدينة ضمن
            نتائج التصفية الحالية
            {citiesQuery.isFetching ? (
              <span className="mr-2 inline-flex items-center gap-1 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                جاري التحديث...
              </span>
            ) : null}
          </div>
        </section>

        <section className={cn(CARD_SHELL, "overflow-hidden p-0")}>
          {citiesQuery.isLoading ? (
            <div className="p-10 text-center text-muted-foreground">جارٍ تحميل المدن...</div>
          ) : citiesQuery.isError ? (
            <div className="border border-red-500/30 bg-red-950/20 p-10 text-center text-red-100">
              تعذر تحميل المدن.
              <Button variant="outline" className={cn(BTN_MODAL_GHOST, "mt-4")} onClick={() => citiesQuery.refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : cities.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">لا توجد مدن مطابقة للتصفية.</div>
          ) : (
            <>
              <div className="hidden md:block">
                <div className={SURFACE_TABLE_WRAP}>
                  <table className="w-full min-w-[880px] border-collapse text-right text-sm">
                    <thead>
                      <tr className="border-b border-primary/20 bg-zinc-900/50 text-muted-foreground">
                        <th className="px-4 py-3 font-medium">المدينة</th>
                        <th className="px-4 py-3 font-medium">الدولة</th>
                        <th className="px-4 py-3 font-medium tabular-nums">الإعلانات</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">تاريخ الإضافة</th>
                        <th className="px-4 py-3 font-medium">آخر تحديث</th>
                        <th className="px-4 py-3 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cities.map((city) => (
                        <tr key={city.id} className={ADMIN_TABLE_ROW}>
                          <td className="px-4 py-3 font-medium text-foreground">{city.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {city.countryName}{" "}
                            <span className="text-xs text-muted-foreground/80">({city.countryCode})</span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {city.adsCount.toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                city.isHidden
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                  : "border-primary/40 bg-primary/10 text-primary",
                              )}
                            >
                              {city.isHidden ? "مخفية" : "ظاهرة"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                            {formatDate(city.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                            {formatDate(city.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={BTN_TBL_OUTLINE}
                                onClick={() => openEdit(city)}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                تعديل
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={BTN_TBL_TOGGLE}
                                onClick={() =>
                                  setPendingVisibility({
                                    city,
                                    nextHidden: !city.isHidden,
                                  })
                                }
                              >
                                {city.isHidden ? (
                                  <>
                                    <Eye className="h-3.5 w-3.5" aria-hidden />
                                    إظهار
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                                    إخفاء
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {cities.map((city) => (
                  <article key={city.id} className={cn(SUB_CARD, "p-4 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)]")}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-foreground">{city.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {city.countryName} ({city.countryCode})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          الإعلانات:{" "}
                          <span className="tabular-nums font-medium text-foreground">
                            {city.adsCount.toLocaleString("ar-EG")}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground/90">
                          أضيفت: {formatDate(city.createdAt)}
                        </p>
                        <p className="text-[11px] text-muted-foreground/90">
                          حُدِّثت: {formatDate(city.updatedAt)}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            city.isHidden
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                              : "border-primary/40 bg-primary/10 text-primary",
                          )}
                        >
                          {city.isHidden ? "مخفية" : "ظاهرة"}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={BTN_TBL_OUTLINE}
                          onClick={() => openEdit(city)}
                        >
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={BTN_TBL_TOGGLE}
                          onClick={() =>
                            setPendingVisibility({
                              city,
                              nextHidden: !city.isHidden,
                            })
                          }
                        >
                          {city.isHidden ? "إظهار" : "إخفاء"}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setCreateFieldErrors({});
            setDraftCreate(initialDraft);
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-lg rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
          onPointerDownOutside={(e) => {
            if (createMutation.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (createMutation.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle className="text-lg font-semibold text-foreground">إضافة مدينة</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              أدخل اسم المدينة ورمز الدولة واسم الدولة كما ستُعرض في المنصة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="city-name">اسم المدينة</Label>
              <Input
                id="city-name"
                value={draftCreate.name}
                onChange={(e) => setDraftCreate((p) => ({ ...p, name: e.target.value }))}
                className={cn(fieldClass, "h-10", createFieldErrors.name && "border-red-500/50")}
                autoComplete="off"
              />
              {createFieldErrors.name ? (
                <p className="text-xs text-red-400">{createFieldErrors.name}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cc">رمز الدولة</Label>
                <Input
                  id="cc"
                  value={draftCreate.countryCode}
                  onChange={(e) =>
                    setDraftCreate((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))
                  }
                  className={cn(fieldClass, "h-10 uppercase", createFieldErrors.countryCode && "border-red-500/50")}
                  autoComplete="off"
                />
                {createFieldErrors.countryCode ? (
                  <p className="text-xs text-red-400">{createFieldErrors.countryCode}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cn">اسم الدولة</Label>
                <Input
                  id="cn"
                  value={draftCreate.countryName}
                  onChange={(e) => setDraftCreate((p) => ({ ...p, countryName: e.target.value }))}
                  className={cn(fieldClass, "h-10", createFieldErrors.countryName && "border-red-500/50")}
                  autoComplete="off"
                />
                {createFieldErrors.countryName ? (
                  <p className="text-xs text-red-400">{createFieldErrors.countryName}</p>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:justify-start sm:gap-2 sm:space-x-0">
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={createMutation.isPending}
              title={createMutation.isPending ? "جاري الحفظ..." : undefined}
              onClick={submitCreate}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              disabled={createMutation.isPending}
              onClick={() => setAddOpen(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setDraftEdit(null);
            setEditFieldErrors({});
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-lg rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
          onPointerDownOutside={(e) => {
            if (updateMutation.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (updateMutation.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle className="text-lg font-semibold text-foreground">تعديل مدينة</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              تعديل الاسم أو الدولة يحدّث السجل في قاعدة البيانات؛ إن وُجدت إعلانات مرتبطة بالاسم السابق راجع
              أثر ذلك على الإعلانات.
            </DialogDescription>
          </DialogHeader>
          {draftEdit ? (
            <>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">اسم المدينة</Label>
                  <Input
                    id="edit-name"
                    value={draftEdit.name}
                    onChange={(e) => setDraftEdit((p) => (p ? { ...p, name: e.target.value } : p))}
                    className={cn(fieldClass, "h-10", editFieldErrors.name && "border-red-500/50")}
                    autoComplete="off"
                  />
                  {editFieldErrors.name ? <p className="text-xs text-red-400">{editFieldErrors.name}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-country-select">الدولة</Label>
                  <select
                    id="edit-country-select"
                    value={draftEdit.countryCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const sel = countryOptions.find((item) => item.code === code);
                      setDraftEdit((p) =>
                        p
                          ? {
                              ...p,
                              countryCode: code,
                              countryName: sel?.name ?? p.countryName,
                            }
                          : p,
                      );
                    }}
                    className={cn(fieldClass, "h-10 w-full cursor-pointer")}
                  >
                    <option value="">اختر الدولة</option>
                    {countryOptions.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-cn">اسم الدولة (للعرض)</Label>
                  <Input
                    id="edit-cn"
                    value={draftEdit.countryName}
                    onChange={(e) =>
                      setDraftEdit((p) => (p ? { ...p, countryName: e.target.value } : p))
                    }
                    className={cn(fieldClass, "h-10", editFieldErrors.countryName && "border-red-500/50")}
                    autoComplete="off"
                  />
                  {editFieldErrors.countryName ? (
                    <p className="text-xs text-red-400">{editFieldErrors.countryName}</p>
                  ) : null}
                </div>
              </div>
              <DialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:justify-start sm:gap-2 sm:space-x-0">
                <Button
                  type="button"
                  className={BTN_MODAL_PRIMARY}
                  disabled={updateMutation.isPending}
                  title={updateMutation.isPending ? "جاري الحفظ..." : undefined}
                  onClick={submitEdit}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      جاري الحفظ...
                    </>
                  ) : (
                    "حفظ التعديلات"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={BTN_MODAL_GHOST}
                  disabled={updateMutation.isPending}
                  onClick={() => setEditOpen(false)}
                >
                  إلغاء
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingVisibility !== null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setPendingVisibility(null);
        }}
      >
        <AlertDialogContent
          dir="rtl"
          className="max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">
              {pendingVisibility?.nextHidden ? "تأكيد إخفاء المدينة" : "تأكيد إظهار المدينة"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {pendingVisibility ? (
                <>
                  {pendingVisibility.nextHidden ? (
                    <>
                      سيتم إخفاء «{pendingVisibility.city.name}» ({pendingVisibility.city.countryCode}) عن قوائم اختيار
                      المدن للمستخدمين. يمكنك إعادة الإظهار لاحقًا.
                    </>
                  ) : (
                    <>
                      سيتم إظهار «{pendingVisibility.city.name}» ({pendingVisibility.city.countryCode}) مجددًا في
                      القوائم.
                    </>
                  )}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              disabled={updateMutation.isPending}
              className={cn(buttonVariants({ variant: "outline", size: "default" }), BTN_MODAL_GHOST, "mt-0")}
            >
              إلغاء
            </AlertDialogCancel>
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={updateMutation.isPending || !pendingVisibility}
              title={updateMutation.isPending ? "جاري التنفيذ..." : undefined}
              onClick={confirmVisibilityChange}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  جاري التنفيذ...
                </>
              ) : pendingVisibility?.nextHidden ? (
                <>
                  <EyeOff className="h-4 w-4" aria-hidden />
                  تأكيد الإخفاء
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" aria-hidden />
                  تأكيد الإظهار
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
