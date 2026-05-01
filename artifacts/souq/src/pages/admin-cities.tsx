import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminLogout, createAdminCity, updateAdminCity } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminCities, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";

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
  const [newCity, setNewCity] = useState({
    name: "",
    countryCode: "DE",
    countryName: "Germany",
  });
  const [editingCityId, setEditingCityId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCountryCode, setEditingCountryCode] = useState("");
  const [editingCountryName, setEditingCountryName] = useState("");

  const citiesQuery = useAdminCities({ status, q, countryCode });
  const countries = citiesQuery.data?.countries ?? [];
  const cities = citiesQuery.data?.cities ?? [];

  const countryOptions = useMemo(() => {
    const options = countries.map((item) => ({
      code: item.code,
      name: item.name,
    }));
    if (!options.some((item) => item.code === newCity.countryCode)) {
      options.unshift({ code: newCity.countryCode, name: newCity.countryName });
    }
    return options;
  }, [countries, newCity.countryCode, newCity.countryName]);

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

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <AdminShell activeKey="cities" onLogout={handleLogout}>
      <div className="space-y-4" dir="rtl">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <h1 className="text-2xl font-semibold">إدارة المدن</h1>
          <p className="text-sm text-slate-400">
            إضافة وتعديل وإخفاء وإظهار المدن مع عرض عدد الإعلانات المرتبطة بها
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <form
              className="lg:col-span-2"
              onSubmit={(e) => {
                e.preventDefault();
                setQ(qInput.trim());
              }}
            >
              <label className="text-sm">
                <span className="mb-1 block text-slate-400">بحث</span>
                <div className="flex gap-2">
                  <input
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    placeholder="ابحث باسم المدينة أو الدولة"
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    بحث
                  </button>
                </div>
              </label>
            </form>

            <label className="text-sm">
              <span className="mb-1 block text-slate-400">الدولة</span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                <option value="all">الكل</option>
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-400">الحالة</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                <option value="all">الكل</option>
                <option value="active">نشطة</option>
                <option value="hidden">مخفية</option>
              </select>
            </label>
          </div>

          <form
            className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCity.name.trim() || !newCity.countryCode.trim() || !newCity.countryName.trim()) {
                return;
              }
              createMutation.mutate({
                name: newCity.name.trim(),
                countryCode: newCity.countryCode.trim().toUpperCase(),
                countryName: newCity.countryName.trim(),
              });
              setNewCity((prev) => ({ ...prev, name: "" }));
            }}
          >
            <p className="text-sm font-medium">إضافة مدينة جديدة</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                value={newCity.name}
                onChange={(e) => setNewCity((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="اسم المدينة"
                autoComplete="off"
                className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm"
              />
              <input
                value={newCity.countryCode}
                onChange={(e) =>
                  setNewCity((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))
                }
                placeholder="رمز الدولة (مثل DE)"
                autoComplete="off"
                className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm uppercase"
              />
              <input
                value={newCity.countryName}
                onChange={(e) => setNewCity((prev) => ({ ...prev, countryName: e.target.value }))}
                placeholder="اسم الدولة"
                autoComplete="off"
                className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white cursor-pointer transition-all duration-200 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={createMutation.isPending}
            >
              إضافة مدينة
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          {citiesQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              جارٍ تحميل المدن...
            </div>
          ) : citiesQuery.isError ? (
            <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
              تعذر تحميل المدن.
            </div>
          ) : cities.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              لا توجد مدن مطابقة.
            </div>
          ) : (
            <div className="space-y-3">
              {cities.map((city) => (
                <article key={city.id} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">
                        {city.name}{" "}
                        <span className="text-xs text-slate-400">
                          ({city.countryName} - {city.countryCode})
                        </span>{" "}
                        <span className={`text-xs ${city.isHidden ? "text-amber-300" : "text-emerald-300"}`}>
                          ({city.isHidden ? "مخفية" : "نشطة"})
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        الإعلانات المرتبطة: {city.adsCount}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-blue-500 active:scale-[0.98]"
                        onClick={() => {
                          setEditingCityId(city.id);
                          setEditingName(city.name);
                          setEditingCountryCode(city.countryCode);
                          setEditingCountryName(city.countryName);
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs text-white bg-amber-600 cursor-pointer transition-all duration-200 hover:bg-amber-500 active:scale-[0.98]"
                        onClick={() =>
                          updateMutation.mutate({
                            id: city.id,
                            payload: { isHidden: !city.isHidden },
                          })
                        }
                      >
                        {city.isHidden ? "إظهار" : "إخفاء"}
                      </button>
                    </div>
                  </div>

                  {editingCityId === city.id ? (
                    <form
                      className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate({
                          id: city.id,
                          payload: {
                            name: editingName.trim(),
                            countryCode: editingCountryCode.trim().toUpperCase(),
                            countryName: editingCountryName.trim(),
                          },
                        });
                        setEditingCityId(null);
                      }}
                    >
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoComplete="off"
                        className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm"
                      />
                      <select
                        value={editingCountryCode}
                        onChange={(e) => {
                          const selected = countryOptions.find((item) => item.code === e.target.value);
                          setEditingCountryCode(e.target.value);
                          if (selected) setEditingCountryName(selected.name);
                        }}
                        className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm"
                      >
                        <option value="">اختر الدولة</option>
                        {countryOptions.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name} ({item.code})
                          </option>
                        ))}
                      </select>
                      <input
                        value={editingCountryName}
                        onChange={(e) => setEditingCountryName(e.target.value)}
                        autoComplete="off"
                        className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-700 px-3 py-2 text-sm"
                          onClick={() => setEditingCityId(null)}
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
