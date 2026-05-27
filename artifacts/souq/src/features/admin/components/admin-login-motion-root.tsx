import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AdminLoginMotionRootProps = {
  children: ReactNode;
  className: string;
};

/** Isolated framer-motion shell — lazy-loaded from admin-login (P8M-2). */
export default function AdminLoginMotionRoot({ children, className }: AdminLoginMotionRootProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={className} dir="rtl">
      {children}
    </motion.div>
  );
}
