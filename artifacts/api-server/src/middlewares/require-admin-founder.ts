import type { NextFunction, Request, Response } from "express";
import { loadAdminStaffContext } from "../lib/admin-rbac";

/** Founder / Super Admin only — for assign/reassign workflows (P8M-1). */
export function requireAdminFounder() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
      if (!staff.isFounder) {
        return res.status(403).json({
          error: "Forbidden",
          code: "RBAC_DENIED",
          title: "صلاحية غير كافية",
          description: "إسناد المهام للموظفين متاح للمؤسس فقط.",
          nextStep: "استخدم استلام/إلغاء الإسناد أو تواصل مع المؤسس.",
        });
      }
      req.adminStaff = staff;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
