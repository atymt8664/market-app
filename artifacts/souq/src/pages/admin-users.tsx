import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminLogout, updateAdminUserStatus } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminUsers, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "banned", label: "محظور" },
];

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const usersQuery = useAdminUsers({ status, q: search });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const stats = useMemo(() => {
    const total = users.length;
    const banned = users.filter((u) => u.status === "banned").length;
    const active = total - banned;
    return { total, active, banned };
  }, [users]);

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "active" | "banned" }) =>
      updateAdminUserStatus(id, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "تم تحديث حالة المستخدم" });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث الحالة",
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
        جاري التحميل...
      </div>
    );
  }

  return (
    <AdminShell activeKey="users" onLogout={handleLogout}>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-100">
            إدارة المستخدمين
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            إدارة حسابات المستخدمين وحالات الحظر
          </p>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
            <p className="text-xs text-slate-400">
              إجمالي المستخدمين
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
            <p className="text-xs text-slate-400">
              المستخدمون النشطون
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">{stats.active}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
            <p className="text-xs text-slate-400">
              المستخدمون المحظورون
            </p>
            <p className="mt-2 text-2xl font-semibold text-red-300">{stats.banned}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form
              className="flex w-full max-w-2xl gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="البحث عن مستخدم"
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-4 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
              >
                بحث
              </button>
            </form>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-[#0a1020] p-1">
              {STATUS_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatus(item.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    status === item.key
                      ? "bg-indigo-500/20 text-indigo-200"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              جاري تحميل المستخدمين...
            </div>
          ) : usersQuery.isError ? (
            <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
              فشل تحميل المستخدمين
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              لا يوجد مستخدمون
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="px-2 py-2 text-right">رقم المستخدم</th>
                    <th className="px-2 py-2 text-right">الاسم</th>
                    <th className="px-2 py-2 text-right">البريد الإلكتروني</th>
                    <th className="px-2 py-2 text-right">الحالة</th>
                    <th className="px-2 py-2 text-right">تاريخ التسجيل</th>
                    <th className="px-2 py-2 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-900/70 transition hover:bg-slate-900/40"
                    >
                      <td className="px-2 py-3">{user.id}</td>
                      <td className="px-2 py-3 font-medium text-slate-100">{user.name}</td>
                      <td className="px-2 py-3 text-slate-300">{user.email}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            user.status === "banned"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-emerald-500/20 text-emerald-200"
                          }`}
                        >
                          {user.status === "banned" ? "محظور" : "نشط"}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700"
                          >
                            التفاصيل
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              statusMutation.mutate({
                                id: user.id,
                                nextStatus: user.status === "banned" ? "active" : "banned",
                              })
                            }
                            disabled={statusMutation.isPending}
                            className={`rounded-lg px-3 py-1 text-xs text-white disabled:opacity-60 ${
                              user.status === "banned"
                                ? "bg-emerald-600 hover:bg-emerald-500"
                                : "bg-amber-600 hover:bg-amber-500"
                            }`}
                          >
                            {user.status === "banned" ? "فك الحظر" : "حظر"}
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
    </AdminShell>
  );
}