import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminLogout,
  createAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
} from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminCategories, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

export default function AdminCategoriesPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const [qInput, setQInput] = useState(params.get("q") || "");
  const [q, setQ] = useState(params.get("q") || "");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    icon: "",
    subtitle: "",
  });
  const [newSubcategory, setNewSubcategory] = useState({
    categoryId: 0,
    name: "",
  });
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingSubtitle, setEditingSubtitle] = useState("");
  const [editingIcon, setEditingIcon] = useState("");
  const [editingSlug, setEditingSlug] = useState("");

  const categoriesQuery = useAdminCategories({ status, q });
  const categories = categoriesQuery.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
  };

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: async () => {
      await refresh();
      toast({ title: "\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0642\u0633\u0645 \u0628\u0646\u062c\u0627\u062d" });
    },
    onError: (error) => {
      toast({
        title: "\u062a\u0639\u0630\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0642\u0633\u0645",
        description: error instanceof Error ? error.message : "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateAdminCategory>[1] }) =>
      updateAdminCategory(id, payload),
    onSuccess: async () => {
      await refresh();
      toast({ title: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0642\u0633\u0645" });
    },
    onError: (error) => {
      toast({
        title: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0642\u0633\u0645",
        description: error instanceof Error ? error.message : "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: "category" | "subcategory" }) =>
      deleteAdminCategory(id, type),
    onSuccess: async () => {
      await refresh();
      toast({ title: "\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0639\u0646\u0635\u0631" });
    },
    onError: (error) => {
      toast({
        title: "\u062a\u0639\u0630\u0631 \u062d\u0630\u0641 \u0627\u0644\u0639\u0646\u0635\u0631",
        description: error instanceof Error ? error.message : "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639",
        variant: "destructive",
      });
    },
  });

  const categoryOptions = useMemo(
    () => categories.filter((item) => !item.isHidden),
    [categories],
  );

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
        {"\u062c\u0627\u0631\u0650 \u0627\u0644\u062a\u062d\u0645\u064a\u0644..."}
      </div>
    );
  }

  return (
    <AdminShell activeKey="categories" onLogout={handleLogout}>
      <div className="space-y-4" dir="rtl">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <h1 className="text-2xl font-semibold">{"\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0642\u0633\u0627\u0645"}</h1>
          <p className="text-sm text-slate-400">{"\u0625\u0636\u0627\u0641\u0629 \u0648\u062a\u0639\u062f\u064a\u0644 \u0648\u062a\u0646\u0638\u064a\u0645 \u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0648\u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0641\u0631\u0639\u064a\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0644\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646"}</p>
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
                <span className="mb-1 block text-slate-400">{"\u0628\u062d\u062b"}</span>
                <div className="flex gap-2">
                  <input
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    placeholder={"\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0642\u0633\u0645 \u0623\u0648 \u0627\u0644\u0641\u0631\u0639\u064a"}
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                  <button type="submit" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white">
                    {"\u0628\u062d\u062b"}
                  </button>
                </div>
              </label>
            </form>

            <label className="text-sm">
              <span className="mb-1 block text-slate-400">{"\u0627\u0644\u062d\u0627\u0644\u0629"}</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                <option value="all">{"\u0627\u0644\u0643\u0644"}</option>
                <option value="active">{"\u0638\u0627\u0647\u0631"}</option>
                <option value="hidden">{"\u0645\u062e\u0641\u064a"}</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <form
              className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategory.name.trim()) return;
                createMutation.mutate({
                  type: "category",
                  name: newCategory.name.trim(),
                  slug: newCategory.slug.trim() || undefined,
                  icon: newCategory.icon.trim() || "Tag",
                  subtitle: newCategory.subtitle.trim() || newCategory.name.trim(),
                });
                setNewCategory({ name: "", slug: "", icon: "", subtitle: "" });
              }}
            >
              <p className="text-sm font-medium">{"\u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645 \u0631\u0626\u064a\u0633\u064a"}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input value={newCategory.name} onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))} placeholder={"\u0627\u0633\u0645 \u0627\u0644\u0642\u0633\u0645"} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                <input value={newCategory.slug} onChange={(e) => setNewCategory((p) => ({ ...p, slug: e.target.value }))} placeholder={"\u0627\u0644\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0646\u0635\u064a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)"} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                <input value={newCategory.icon} onChange={(e) => setNewCategory((p) => ({ ...p, icon: e.target.value }))} placeholder={"\u0627\u0644\u0623\u064a\u0642\u0648\u0646\u0629 (\u0627\u0633\u0645 \u0623\u0648 \u0631\u0645\u0632)"} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                <input value={newCategory.subtitle} onChange={(e) => setNewCategory((p) => ({ ...p, subtitle: e.target.value }))} placeholder={"\u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u062e\u062a\u0635\u0631 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)"} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white cursor-pointer transition-all duration-200 hover:bg-emerald-500 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={createMutation.isPending}
              >
                {"\u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645"}
              </button>
            </form>

            <form
              className="rounded-xl border border-slate-800 bg-[#0a1020] p-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSubcategory.name.trim() || !newSubcategory.categoryId) return;
                createMutation.mutate({
                  type: "subcategory",
                  categoryId: newSubcategory.categoryId,
                  name: newSubcategory.name.trim(),
                });
                setNewSubcategory({ categoryId: 0, name: "" });
              }}
            >
              <p className="text-sm font-medium">{"\u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645 \u0641\u0631\u0639\u064a"}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <select
                  value={newSubcategory.categoryId || ""}
                  onChange={(e) => setNewSubcategory((p) => ({ ...p, categoryId: Number(e.target.value) }))}
                  className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm"
                >
                  <option value="">{"\u0627\u062e\u062a\u0631 \u0642\u0633\u0645\u064b\u0627 \u0631\u0626\u064a\u0633\u064a\u064b\u0627"}</option>
                  {categoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>{decodeEscapedUnicode(item.name)}</option>
                  ))}
                </select>
                <input value={newSubcategory.name} onChange={(e) => setNewSubcategory((p) => ({ ...p, name: e.target.value }))} placeholder={"\u0627\u0633\u0645 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0641\u0631\u0639\u064a"} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white cursor-pointer transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={createMutation.isPending}
              >
                {"\u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645 \u0641\u0631\u0639\u064a"}
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          {categoriesQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">{"\u062c\u0627\u0631\u0650 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0623\u0642\u0633\u0627\u0645..."}</div>
          ) : categoriesQuery.isError ? (
            <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">{"\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0623\u0642\u0633\u0627\u0645."}</div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0642\u0633\u0627\u0645."}</div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <article key={category.id} className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">
                        {decodeEscapedUnicode(category.name)}{" "}
                        <span className={`text-xs ${category.isHidden ? "text-amber-300" : "text-emerald-300"}`}>
                          ({category.isHidden ? "\u0645\u062e\u0641\u064a" : "\u0638\u0627\u0647\u0631"})
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">{"\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a"}: {category.adsCount} | {"\u0627\u0644\u062a\u0631\u062a\u064a\u0628"}: {category.sortOrder}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-blue-500 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 active:scale-[0.98]"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingName(decodeEscapedUnicode(category.name));
                          setEditingSlug(decodeEscapedUnicode(category.slug));
                          setEditingIcon(decodeEscapedUnicode(category.icon));
                          setEditingSubtitle(decodeEscapedUnicode(category.subtitle));
                        }}
                      >
                        {"\u062a\u0639\u062f\u064a\u0644"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-indigo-500 hover:shadow-[0_0_0_1px_rgba(129,140,248,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 active:scale-[0.98]"
                        onClick={() =>
                          updateMutation.mutate({
                            id: category.id,
                            payload: { type: "category", sortOrder: category.sortOrder - 1 },
                          })
                        }
                      >
                        {"\u0644\u0644\u0623\u0639\u0644\u0649"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-violet-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 active:scale-[0.98]"
                        onClick={() =>
                          updateMutation.mutate({
                            id: category.id,
                            payload: { type: "category", sortOrder: category.sortOrder + 1 },
                          })
                        }
                      >
                        {"\u0644\u0644\u0623\u0633\u0641\u0644"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs text-white bg-amber-600 cursor-pointer transition-all duration-200 hover:bg-amber-500 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 active:scale-[0.98]"
                        onClick={() =>
                          updateMutation.mutate({
                            id: category.id,
                            payload: { type: "category", isHidden: !category.isHidden },
                          })
                        }
                      >
                        {category.isHidden ? "\u0625\u0638\u0647\u0627\u0631" : "\u0625\u062e\u0641\u0627\u0621"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-red-500 hover:shadow-[0_0_0_1px_rgba(248,113,113,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 active:scale-[0.98]"
                        onClick={() => {
                          if (confirm("\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645\u061f")) {
                            deleteMutation.mutate({ id: category.id, type: "category" });
                          }
                        }}
                      >
                        {"\u062d\u0630\u0641"}
                      </button>
                    </div>
                  </div>

                  {editingCategoryId === category.id ? (
                    <form
                      className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate({
                          id: category.id,
                          payload: {
                            type: "category",
                            name: editingName.trim(),
                            slug: editingSlug.trim(),
                            icon: editingIcon.trim(),
                            subtitle: editingSubtitle.trim(),
                          },
                        });
                        setEditingCategoryId(null);
                      }}
                    >
                      <input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                      <input value={editingSlug} onChange={(e) => setEditingSlug(e.target.value)} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                      <input value={editingIcon} onChange={(e) => setEditingIcon(e.target.value)} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                      <input value={editingSubtitle} onChange={(e) => setEditingSubtitle(e.target.value)} autoComplete="off" className="rounded-lg border border-slate-700 bg-[#08101d] px-3 py-2 text-sm" />
                      <div className="md:col-span-2 flex gap-2">
                        <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">{"\u062d\u0641\u0638"}</button>
                        <button type="button" className="rounded-lg bg-slate-700 px-3 py-2 text-sm" onClick={() => setEditingCategoryId(null)}>{"\u0625\u0644\u063a\u0627\u0621"}</button>
                      </div>
                    </form>
                  ) : null}

                  <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                    {category.subcategories.length === 0 ? (
                      <p className="text-xs text-slate-400">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0642\u0633\u0627\u0645 \u0641\u0631\u0639\u064a\u0629."}</p>
                    ) : (
                      category.subcategories.map((sub) => (
                        <div key={sub.id} className="rounded-lg border border-slate-800 bg-[#08101d] px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm text-slate-100">
                                {decodeEscapedUnicode(sub.name)}{" "}
                                <span className={`text-xs ${sub.isHidden ? "text-amber-300" : "text-emerald-300"}`}>
                                  ({sub.isHidden ? "\u0645\u062e\u0641\u064a" : "\u0638\u0627\u0647\u0631"})
                                </span>
                              </p>
                              <p className="text-xs text-slate-400">{"\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a"}: {sub.adsCount} | {"\u0627\u0644\u062a\u0631\u062a\u064a\u0628"}: {sub.sortOrder}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-blue-500 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 active:scale-[0.98]"
                              onClick={() => {
                                setEditingSubcategoryId(sub.id);
                                setEditingName(decodeEscapedUnicode(sub.name));
                              }}
                            >
                              {"\u062a\u0639\u062f\u064a\u0644"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-indigo-500 hover:shadow-[0_0_0_1px_rgba(129,140,248,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 active:scale-[0.98]"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: sub.id,
                                  payload: { type: "subcategory", sortOrder: sub.sortOrder - 1 },
                                })
                              }
                            >
                              {"\u0644\u0644\u0623\u0639\u0644\u0649"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-violet-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 active:scale-[0.98]"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: sub.id,
                                  payload: { type: "subcategory", sortOrder: sub.sortOrder + 1 },
                                })
                              }
                            >
                              {"\u0644\u0644\u0623\u0633\u0641\u0644"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs text-white bg-amber-600 cursor-pointer transition-all duration-200 hover:bg-amber-500 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 active:scale-[0.98]"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: sub.id,
                                  payload: { type: "subcategory", isHidden: !sub.isHidden },
                                })
                              }
                            >
                              {sub.isHidden ? "\u0625\u0638\u0647\u0627\u0631" : "\u0625\u062e\u0641\u0627\u0621"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white cursor-pointer transition-all duration-200 hover:bg-red-500 hover:shadow-[0_0_0_1px_rgba(248,113,113,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 active:scale-[0.98]"
                              onClick={() => {
                                if (confirm("\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0641\u0631\u0639\u064a\u061f")) {
                                  deleteMutation.mutate({ id: sub.id, type: "subcategory" });
                                }
                              }}
                            >
                              {"\u062d\u0630\u0641"}
                            </button>
                            </div>
                          </div>
                          {editingSubcategoryId === sub.id ? (
                            <form
                              className="mt-2 flex flex-wrap gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                updateMutation.mutate({
                                  id: sub.id,
                                  payload: { type: "subcategory", name: editingName.trim() },
                                });
                                setEditingSubcategoryId(null);
                              }}
                            >
                              <input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoComplete="off"
                                className="min-w-[220px] flex-1 rounded-lg border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm"
                              />
                              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                                {"\u062d\u0641\u0638"}
                              </button>
                              <button type="button" className="rounded-lg bg-slate-700 px-3 py-2 text-sm" onClick={() => setEditingSubcategoryId(null)}>
                                {"\u0625\u0644\u063a\u0627\u0621"}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
