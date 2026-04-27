import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { adminLogout, deleteAdminAd, updateAdminAdStatus } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminAds, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminAd } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "مقبول" },
  { key: "rejected", label: "مرفوض" },
  { key: "hidden", label: "مخفي" },
] as const;

function statusLabel(status: string) {
  if (status === "pending") return "قيد المراجعة";
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "hidden") return "مخفي";
  return status;
}

export default function AdminAdsPage() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const [status, setStatus] = useState(params.get("status") || "all");
  const [searchInput, setSearchInput] = useState(params.get("q") || "");
  const [search, setSearch] = useState(params.get("q") || "");
  const [selectedAd, setSelectedAd] = useState<AdminAd | null>(null);
  const [sortBy, setSortBy] = useState(params.get("sort") || "created");
  const focusId = Number(params.get("focusId") || 0);

  const adsQuery = useAdminAds({ status, q: search });
  const visibleAds = useMemo(() => {
    const list = [...(adsQuery.data ?? [])];
    if (sortBy === "views") {
      list.sort((a, b) => b.views - a.views);
    }
    return list;
  }, [adsQuery.data, sortBy]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== "all") next.set("status", status);
    if (search) next.set("q", search);
    if (sortBy !== "created") next.set("sort", sortBy);
    if (selectedAd?.id) next.set("focusId", String(selectedAd.id));
    const qs = next.toString();
    const nextUrl = `/admin/ads${qs ? `?${qs}` : ""}`;
    if (`${location}${window.location.search}` !== nextUrl) {
      navigate(nextUrl, { replace: true });
    }
  }, [status, search, sortBy, selectedAd, location, navigate]);

  useEffect(() => {
    if (!focusId || !visibleAds.length) return;
    const target = visibleAds.find((ad) => ad.id === focusId);
    if (target) setSelectedAd(target);
  }, [focusId, visibleAds]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "approved" | "rejected" | "hidden" }) =>
      updateAdminAdStatus(id, nextStatus),
    onSuccess: async (_res, variables) => {
      if (selectedAd?.id === variables.id) {
        setSelectedAd((prev) => (prev ? { ...prev, status: variables.nextStatus } : prev));
      }
      await refresh();
      toast({
        title: "تم تحديث الحالة",
        description: `تم تغيير حالة الإعلان إلى ${statusLabel(variables.nextStatus)}`,
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث الحالة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminAd(id),
    onSuccess: async () => {
      setSelectedAd(null);
      await refresh();
      toast({
        title: "تم حذف الإعلان",
        description: "تم حذف الإعلان من قاعدة البيانات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل حذف الإعلان",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
        جاري تحميل لوحة التحكم...
      </div>
    );
  }

  return (
    <AdminShell activeKey="ads" onLogout={handleLogout}>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <h1 className="text-2xl font-semibold">إدارة الإعلانات</h1>
          <p className="text-sm text-slate-400">إدارة جميع الإعلانات وحالات المراجعة بشكل مباشر</p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              className="flex w-full max-w-xl gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث بالعنوان، الوصف، المدينة، اسم البائع..."
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-4 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <button type="submit" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white">
                بحث
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatus(item.key)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    status === item.key
                      ? "bg-indigo-500/20 text-indigo-200"
                      : "bg-[#0a1020] text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSortBy("created")}
                className={`rounded-lg px-3 py-1 text-sm ${
                  sortBy === "created" ? "bg-indigo-500/20 text-indigo-200" : "bg-[#0a1020] text-slate-300 hover:bg-slate-800"
                }`}
              >
                الأحدث
              </button>
              <button
                type="button"
                onClick={() => setSortBy("views")}
                className={`rounded-lg px-3 py-1 text-sm ${
                  sortBy === "views" ? "bg-indigo-500/20 text-indigo-200" : "bg-[#0a1020] text-slate-300 hover:bg-slate-800"
                }`}
              >
                الأعلى مشاهدة
              </button>
            </div>
          </div>

          {adsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              جاري تحميل الإعلانات...
            </div>
          ) : adsQuery.isError ? (
            <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
              تعذر تحميل الإعلانات. حاول التحديث مرة أخرى.
            </div>
          ) : visibleAds.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              لا يوجد إعلانات مطابقة للفلاتر الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="px-2 py-2 text-right">#</th>
                    <th className="px-2 py-2 text-right">العنوان</th>
                    <th className="px-2 py-2 text-right">المدينة</th>
                    <th className="px-2 py-2 text-right">السعر</th>
                    <th className="px-2 py-2 text-right">الحالة</th>
                    <th className="px-2 py-2 text-right">المشاهدات</th>
                    <th className="px-2 py-2 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAds.map((ad) => (
                    <tr key={ad.id} className="border-b border-slate-900/70">
                      <td className="px-2 py-3">{ad.id}</td>
                      <td className="px-2 py-3">
                        <p className="line-clamp-1 font-medium">{ad.title}</p>
                        <p className="text-xs text-slate-400">{ad.categoryName || "بدون تصنيف"}</p>
                      </td>
                      <td className="px-2 py-3">{ad.city}</td>
                      <td className="px-2 py-3">{ad.price === null ? "غير محدد" : `${ad.price} €`}</td>
                      <td className="px-2 py-3">{statusLabel(ad.status)}</td>
                      <td className="px-2 py-3">{ad.views}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAd(ad)}
                            className="rounded-lg bg-slate-700 px-2 py-1 text-xs text-white"
                          >
                            التفاصيل
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: ad.id, nextStatus: "approved" })}
                            disabled={statusMutation.isPending || deleteMutation.isPending}
                            className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white"
                          >
                            قبول
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: ad.id, nextStatus: "rejected" })}
                            disabled={statusMutation.isPending || deleteMutation.isPending}
                            className="rounded-lg bg-amber-600 px-2 py-1 text-xs text-white"
                          >
                            رفض
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: ad.id, nextStatus: "hidden" })}
                            disabled={statusMutation.isPending || deleteMutation.isPending}
                            className="rounded-lg bg-slate-600 px-2 py-1 text-xs text-white"
                          >
                            إخفاء
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف الإعلان؟")) {
                                deleteMutation.mutate(ad.id);
                              }
                            }}
                            disabled={statusMutation.isPending || deleteMutation.isPending}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedAd &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0d1324] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">تفاصيل الإعلان #{selectedAd.id}</h2>
              <button type="button" onClick={() => setSelectedAd(null)} className="rounded-lg bg-slate-700 px-3 py-1 text-sm">
                إغلاق
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <p><span className="text-slate-400">العنوان:</span> {selectedAd.title}</p>
              <p><span className="text-slate-400">الحالة:</span> {statusLabel(selectedAd.status)}</p>
              <p><span className="text-slate-400">المدينة:</span> {selectedAd.city}</p>
              <p><span className="text-slate-400">السعر:</span> {selectedAd.price === null ? "غير محدد" : `${selectedAd.price} €`}</p>
              <p><span className="text-slate-400">البائع:</span> {selectedAd.sellerName}</p>
              <p><span className="text-slate-400">الهاتف:</span> {selectedAd.sellerPhone}</p>
              <p><span className="text-slate-400">التصنيف:</span> {selectedAd.categoryName || "بدون تصنيف"}</p>
              <p><span className="text-slate-400">المشاهدات:</span> {selectedAd.views}</p>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-[#0a1020] p-3">
              <p className="mb-1 text-xs text-slate-400">الوصف</p>
              <p className="text-sm leading-6">{selectedAd.description}</p>
            </div>
            <div className="mt-4">
              <a href={`/ad/${selectedAd.id}`} target="_blank" className="rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white">
                عرض صفحة الإعلان
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </AdminShell>
  );
}
