import type { NextFunction, Request, Response } from "express";
import {
  hasAnyAdminPermission,
  loadAdminStaffContext,
  touchAdminStaffLastSeen,
  type AdminPermissionArea,
  type AdminStaffContext,
} from "../lib/admin-rbac";

declare global {
  namespace Express {
    interface Request {
      adminStaff?: AdminStaffContext;
    }
  }
}

export function requireAdminPermission(...areas: AdminPermissionArea[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = await loadAdminStaffContext(req);
      if (staff.isFounder || hasAnyAdminPermission(staff.roleKey, areas)) {
        req.adminStaff = staff;
        void touchAdminStaffLastSeen(staff.actorAdminId);
        return next();
      }
      return res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    } catch (err) {
      return next(err);
    }
  };
}
