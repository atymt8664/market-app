import { useLocation } from "wouter";
import { adminLogout } from "@/features/admin/api";
import { AdminComingSoon } from "@/features/admin/components/admin-coming-soon";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";

export default function AdminLogsPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">Ã«—Ì «· Õ„Ì·...</div>;
  }

  return (
    <AdminShell activeKey="logs" onLogout={handleLogout}>
      <AdminComingSoon title="”Ã· «·‰‘«ÿ« " />
    </AdminShell>
  );
}
