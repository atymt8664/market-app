import { useEffect, useState } from "react";

const API_BASE =
  "https://796954c8-8650-4692-8c58-ccaa3bfea85b-00-2ptjcbj5jjblu.kirk.replit.dev:3000";

type AdminAd = {
  id: number;
  title: string;
  price: number | null;
  city: string;
  categoryName?: string;
  status?: "pending" | "approved" | "rejected" | "hidden";
};
type AdminReport = {
  id: number;
  reporterId: number;
  targetUserId: number | null;
  targetAdId: number | null;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
};

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loadingAds, setLoadingAds] = useState(true);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/me`, {
      credentials: "include",
    }).then((res) => {
      if (!res.ok) {
        window.location.href = "/admin-login";
        return;
      }

      setChecking(false);

      // جلب الإعلانات
      fetch(`${API_BASE}/api/admin/ads?status=${statusFilter}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setAds(Array.isArray(data) ? data : []))
        .finally(() => setLoadingAds(false));

      // 🔥 جلب البلاغات (هون تحطه)
      fetch(`${API_BASE}/api/reports/admin`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setReports(Array.isArray(data) ? data : []));
    });
  }, [statusFilter]);

  const handleLogout = async () => {
    setLoadingLogout(true);
    await fetch(`${API_BASE}/api/admin-logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/admin-login";
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("هل أنت متأكد من حذف الإعلان؟");
    if (!confirmDelete) return;

    try {
      setDeletingId(id);

      const res = await fetch(`${API_BASE}/api/admin/ads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        alert("فشل الحذف");
        return;
      }

      // حذف من الواجهة مباشرة
      setAds((prev) => prev.filter((ad) => ad.id !== id));
    } catch {
      alert("خطأ أثناء الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  const [activeTab, setActiveTab] = useState("reports");

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        جاري التحقق...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:flex w-64 flex-col bg-card border-r border-border p-4">
        <h2 className="text-xl font-bold mb-6">سوق العرب</h2>

        <nav className="flex flex-col gap-3 text-sm">
          <button
            onClick={() => setActiveTab("home")}
            className="text-left hover:text-primary"
          >
            الرئيسية
          </button>

          <button
            onClick={() => setActiveTab("ads")}
            className="text-left hover:text-primary"
          >
            الإعلانات
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className="text-left text-red-500 font-bold"
          >
            البلاغات
          </button>

          <button
            onClick={() => setActiveTab("support")}
            className="text-left hover:text-primary"
          >
            الدعم
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className="text-left hover:text-primary"
          >
            المستخدمين
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className="text-left hover:text-primary"
          >
            الإحصائيات
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className="text-left hover:text-primary"
          >
            الإعدادات
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">لوحة التحكم (Admin)</h1>

          <button
            onClick={handleLogout}
            disabled={loadingLogout}
            className="px-4 py-2 rounded-xl bg-red-500 text-white"
          >
            {loadingLogout ? "..." : "تسجيل الخروج"}
          </button>
        </div>

        {activeTab === "home" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/20">
              <p className="text-sm">عدد الإعلانات</p>
              <p className="text-3xl font-bold tracking-tight">{ads.length}</p>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-green-500/20 to-green-700/20 border border-green-500/20">
              <p className="text-sm">حالة اللوحة</p>
              <p className="text-3xl font-bold text-green-400 tracking-tight">
                نشطة
              </p>
            </div>
          </div>
        )}

        <div className="border rounded-2xl p-4 space-y-4">
          <h2 className="text-xl font-bold">إدارة الإعلانات</h2>
          <div className="border rounded-2xl p-4 space-y-4">
            <h2 className="text-xl font-bold mb-4">📊 إدارة البلاغات</h2>

            {reports.length === 0 ? (
              <p>لا يوجد بلاغات</p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl p-4 bg-card border border-border flex justify-between items-center hover:bg-muted/30 transition"
                >
                  <div>
                    <p className="text-sm">سبب البلاغ: {report.reason}</p>

                    {report.description && (
                      <p className="text-xs text-gray-400">
                        الوصف: {report.description}
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      إعلان: {report.targetAdId || "—"}
                    </p>

                    <p className="text-xs text-gray-400">
                      مستخدم: {report.targetUserId || "—"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {report.targetAdId && (
                      <a
                        href={`/ad/${report.targetAdId}`}
                        target="_blank"
                        className="px-3 py-1 text-sm rounded-lg bg-blue-500 text-white text-center"
                      >
                        عرض الإعلان
                      </a>
                    )}

                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs rounded-lg bg-green-500 text-white">
                        قبول
                      </button>

                      <button className="px-3 py-1 text-xs rounded-lg bg-yellow-500 text-black">
                        رفض
                      </button>

                      <button className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white">
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {loadingAds ? (
            <p>جاري التحميل...</p>
          ) : ads.length === 0 ? (
            <p>لا يوجد إعلانات</p>
          ) : (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { key: "pending", label: "قيد المراجعة" },
                  { key: "approved", label: "مقبول" },
                  { key: "rejected", label: "مرفوض" },
                  { key: "hidden", label: "مخفي" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setStatusFilter(item.key)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      statusFilter === item.key
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="border rounded-xl p-3 flex justify-between items-center"
                >
                  {/* معلومات الإعلان */}
                  <div>
                    <h3 className="font-bold">{ad.title}</h3>

                    <p className="text-xs">
                      الحالة:
                      {ad.status === "approved" && (
                        <span className="text-green-500"> مقبول</span>
                      )}
                      {ad.status === "pending" && (
                        <span className="text-yellow-500"> قيد المراجعة</span>
                      )}
                      {ad.status === "rejected" && (
                        <span className="text-red-500"> مرفوض</span>
                      )}
                      {ad.status === "hidden" && (
                        <span className="text-gray-400"> مخفي</span>
                      )}
                    </p>

                    <p className="text-sm">
                      {ad.categoryName || "بدون تصنيف"} • {ad.city}
                    </p>

                    <p className="text-xs text-gray-400">ID: {ad.id}</p>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex flex-col gap-2 items-end">
                    <p className="font-bold">
                      {ad.price === null ? "غير محدد" : `${ad.price} €`}
                    </p>

                    <a
                      href={`/ad/${ad.id}`}
                      target="_blank"
                      className="px-3 py-1 text-sm rounded-lg bg-blue-500 text-white text-center"
                    >
                      عرض
                    </a>

                    <button
                      onClick={async () => {
                        setLoadingId(ad.id);

                        const res = await fetch(
                          `/api/admin/ads/${ad.id}/status`,
                          {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "approved" }),
                          },
                        );

                        if (res.ok) {
                          setAds((prev) =>
                            prev.map((a) =>
                              a.id === ad.id ? { ...a, status: "approved" } : a,
                            ),
                          );
                        }

                        setLoadingId(null);
                      }}
                      className="px-3 py-1 text-sm rounded-lg bg-green-500 text-white"
                    >
                      {loadingId === ad.id ? "⏳..." : "موافقة"}
                    </button>

                    <button
                      onClick={async () => {
                        setLoadingId(ad.id);

                        const res = await fetch(
                          `/api/admin/ads/${ad.id}/status`,
                          {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "rejected" }),
                          },
                        );

                        if (res.ok) {
                          setAds((prev) =>
                            prev.map((a) =>
                              a.id === ad.id ? { ...a, status: "rejected" } : a,
                            ),
                          );
                        }

                        setLoadingId(null);
                      }}
                      className="px-3 py-1 text-sm rounded-lg bg-yellow-500 text-white"
                    >
                      {loadingId === ad.id ? "⏳..." : "رفض"}
                    </button>

                    <button
                      onClick={async () => {
                        await fetch(`/api/admin/ads/${ad.id}/status`, {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "hidden" }),
                        });

                        setAds((prev) =>
                          prev.map((a) =>
                            a.id === ad.id ? { ...a, status: "hidden" } : a,
                          ),
                        );
                      }}
                      className="px-3 py-1 text-sm rounded-lg bg-gray-500 text-white"
                    >
                      إخفاء
                    </button>

                    <button
                      onClick={() => handleDelete(ad.id)}
                      disabled={deletingId === ad.id}
                      className="px-3 py-1 text-sm rounded-lg bg-red-500 text-white"
                    >
                      {deletingId === ad.id ? "..." : "حذف"}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
