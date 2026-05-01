import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { adminLogout, getAdminLogs } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";
import type { AdminActivityLog } from "@/features/admin/types";

const T = {
  loading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a...",
  title: "\u0633\u062c\u0644 \u0627\u0644\u0623\u0646\u0634\u0637\u0629",
  subtitle:
    "\u0645\u062a\u0627\u0628\u0639\u0629 \u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0634\u0631\u0641\u064a\u0646 \u0648\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645",
  note:
    "\u064a\u062a\u0645 \u0639\u0631\u0636 \u0633\u062c\u0644 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u062d\u0642\u064a\u0642\u064a \u0627\u0644\u0645\u062e\u0632\u0646 \u0641\u064a \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
  actionTypeLabel: "\u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644\u064a\u0629",
  targetTypeLabel: "\u0646\u0648\u0639 \u0627\u0644\u0647\u062f\u0641",
  fromDateLabel: "\u0645\u0646 \u062a\u0627\u0631\u064a\u062e",
  toDateLabel: "\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e",
  searchLabel: "\u0628\u062d\u062b",
  searchPlaceholder:
    "\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0623\u0648 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644...",
  searchButton: "\u0628\u062d\u062b",
  emptyTitle: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a \u0623\u0646\u0634\u0637\u0629 \u0628\u0639\u062f",
  emptyBody:
    "\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0647\u0646\u0627 \u0628\u0639\u062f \u062a\u0641\u0639\u064a\u0644 \u0646\u0642\u0637\u0629 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0628\u0627\u0643\u0646\u062f.",
  thActionType: "\u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644\u064a\u0629",
  thActor: "\u0627\u0644\u0645\u0646\u0641\u0630",
  thTargetType: "\u0646\u0648\u0639 \u0627\u0644\u0647\u062f\u0641",
  thTargetId: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0647\u062f\u0641",
  thDate: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e/\u0627\u0644\u0648\u0642\u062a",
  thDetails: "\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
};

const ACTION_TYPE_OPTIONS = [
  { key: "all", label: "\u0643\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a" },
  { key: "ad", label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a" },
  { key: "report", label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a" },
  { key: "support", label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u062f\u0639\u0645" },
  { key: "user", label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646" },
  { key: "category", label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0623\u0642\u0633\u0627\u0645" },
  { key: "city", label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0645\u062f\u0646" },
];

const TARGET_TYPE_OPTIONS = [
  { key: "all", label: "\u0643\u0644 \u0627\u0644\u0623\u0647\u062f\u0627\u0641" },
  { key: "ad", label: "\u0625\u0639\u0644\u0627\u0646" },
  { key: "report", label: "\u0628\u0644\u0627\u063a" },
  { key: "support_ticket", label: "\u062a\u0630\u0643\u0631\u0629 \u062f\u0639\u0645" },
  { key: "user", label: "\u0645\u0633\u062a\u062e\u062f\u0645" },
  { key: "category", label: "\u0642\u0633\u0645" },
  { key: "city", label: "\u0645\u062f\u064a\u0646\u0629" },
  { key: "system", label: "\u0646\u0638\u0627\u0645" },
];

const ACTION_LABELS: Record<string, string> = {
  "ad.hide": "\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646",
  "ad.unhide": "\u062a\u0645 \u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0625\u0639\u0644\u0627\u0646",
  "ad.approve": "\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u0625\u0639\u0644\u0627\u0646",
  "ad.reject": "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0625\u0639\u0644\u0627\u0646",
  "ad.delete": "\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646",
  "report.resolve": "\u062a\u0645 \u062d\u0644 \u0627\u0644\u0628\u0644\u0627\u063a",
  "report.review": "\u062a\u0645 \u0648\u0636\u0639 \u0627\u0644\u0628\u0644\u0627\u063a \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  "report.ignore": "\u062a\u0645 \u062a\u062c\u0627\u0647\u0644 \u0627\u0644\u0628\u0644\u0627\u063a",
  "support.close": "\u062a\u0645 \u0625\u063a\u0644\u0627\u0642 \u062a\u0630\u0643\u0631\u0629 \u0627\u0644\u062f\u0639\u0645",
  "support.resolve": "\u062a\u0645 \u062d\u0644 \u062a\u0630\u0643\u0631\u0629 \u0627\u0644\u062f\u0639\u0645",
  "support.update": "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062a\u0630\u0643\u0631\u0629 \u0627\u0644\u062f\u0639\u0645",
  "user.block": "\u062a\u0645 \u062d\u0638\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  "user.unblock": "\u062a\u0645 \u0641\u0643 \u062d\u0638\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  "category.create": "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645",
  "category.update": "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0642\u0633\u0645",
  "category.hide": "\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u0642\u0633\u0645",
  "category.unhide": "\u062a\u0645 \u0625\u0638\u0647\u0627\u0631 \u0642\u0633\u0645",
  "category.delete": "\u062a\u0645 \u062d\u0630\u0641 \u0642\u0633\u0645",
  "city.create": "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0645\u062f\u064a\u0646\u0629",
  "city.update": "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062f\u064a\u0646\u0629",
  "city.hide": "\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u0645\u062f\u064a\u0646\u0629",
  "city.unhide": "\u062a\u0645 \u0625\u0638\u0647\u0627\u0631 \u0645\u062f\u064a\u0646\u0629",
  "city.delete": "\u062a\u0645 \u062d\u0630\u0641 \u0645\u062f\u064a\u0646\u0629",
};

function getActionDisplayLabel(actionKey: string): string {
  return ACTION_LABELS[actionKey] ?? actionKey;
}

export default function AdminLogsPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const [actionType, setActionType] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const logsQuery = useQuery({
    queryKey: ["admin", "logs", actionType, targetType, search, dateFrom, dateTo],
    queryFn: () =>
      getAdminLogs({
        actionType,
        targetType,
        q: search,
        from: dateFrom,
        to: dateTo,
      }),
    enabled: !meQuery.isLoading && !meQuery.isError,
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const logs: AdminActivityLog[] = logsQuery.data ?? [];

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
        {T.loading}
      </div>
    );
  }

  return (
    <AdminShell activeKey="logs" onLogout={handleLogout}>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <h1 className="text-2xl font-semibold">{T.title}</h1>
          <p className="text-sm text-slate-400">{T.subtitle}</p>
        </header>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-100">
            {T.note}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">{T.actionTypeLabel}</span>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                {ACTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-400">{T.targetTypeLabel}</span>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                {TARGET_TYPE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-400">{T.fromDateLabel}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-400">{T.toDateLabel}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <form
              className="text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <span className="mb-1 block text-slate-400">{T.searchLabel}</span>
              <div className="flex gap-2">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={T.searchPlaceholder}
                  className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
                >
                  {T.searchButton}
                </button>
              </div>
            </form>
          </div>

          {logsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center">
              <p className="text-base font-medium text-slate-100">{T.loading}</p>
            </div>
          ) : logsQuery.isError ? (
            <div className="rounded-xl border border-red-800/60 bg-red-900/20 p-8 text-center">
              <p className="text-base font-medium text-red-200">
                \u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0633\u062c\u0644 \u0627\u0644\u0623\u0646\u0634\u0637\u0629.
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center">
              <p className="text-base font-medium text-slate-100">{T.emptyTitle}</p>
              <p className="mt-2 text-sm text-slate-400">{T.emptyBody}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="px-2 py-2 text-right">{T.thActionType}</th>
                    <th className="px-2 py-2 text-right">{T.thActor}</th>
                    <th className="px-2 py-2 text-right">{T.thTargetType}</th>
                    <th className="px-2 py-2 text-right">{T.thTargetId}</th>
                    <th className="px-2 py-2 text-right">{T.thDate}</th>
                    <th className="px-2 py-2 text-right">{T.thDetails}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-900/70">
                      <td className="px-2 py-3">{getActionDisplayLabel(log.actionType)}</td>
                      <td className="px-2 py-3">{log.actor}</td>
                      <td className="px-2 py-3">{log.targetType}</td>
                      <td className="px-2 py-3">{log.targetId ?? "-"}</td>
                      <td className="px-2 py-3">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-3">{log.details}</td>
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
