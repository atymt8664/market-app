import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AdminLoginMotionRootProps = {
  children: ReactNode;
  className: string;
};

/** Isolated framer-motion shell — lazy-loaded from admin-login (P8M-2). */
export default function AdminLoginMotionRoot({ children, className }: AdminLoginMotionRootProps) {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={className} dir={dir}>
      {children}
    </motion.div>
  );
}
