import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getAdminMe } from "./api/auth";
import type { AdminPermissionArea, AdminRoleKey } from "./rbac";
import { canAccessRoute, defaultHomePath } from "./rbac";

function useAdminMeQuery() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: ({ signal }) => getAdminMe(signal),
    retry: false,
  });
}

type AdminAccess = {
  roleKey: AdminRoleKey;
  displayName: string;
  permissions: AdminPermissionArea[];
  isFounder: boolean;
  homePath: string;
  isLoading: boolean;
  can: (area: AdminPermissionArea) => boolean;
};

const FOUNDER_FALLBACK: AdminAccess = {
  roleKey: "founder",
  displayName: "Mohamed",
  permissions: [
    "dashboard.operations",
    "dashboard.moderation",
    "ads",
    "reports",
    "support",
    "users",
    "verification",
    "analytics",
    "settings",
    "billing",
    "plans",
    "cities",
    "categories",
    "logs",
    "system",
    "staff",
  ],
  isFounder: true,
  homePath: "/admin",
  isLoading: false,
  can: () => true,
};

const LOADING_ACCESS: AdminAccess = {
  roleKey: "moderator",
  displayName: "",
  permissions: [],
  isFounder: false,
  homePath: "/admin",
  isLoading: true,
  can: () => false,
};

export function useAdminAccess(): AdminAccess {
  const meQuery = useAdminMeQuery();
  const data = meQuery.data;

  if (meQuery.isLoading) {
    return LOADING_ACCESS;
  }

  if (!data?.isAdmin) {
    return { ...LOADING_ACCESS, isLoading: false };
  }

  const roleKey = (data.roleKey ?? "founder") as AdminRoleKey;
  const isFounder = Boolean(data.isFounder ?? roleKey === "founder");
  const permissions = (
    isFounder ? FOUNDER_FALLBACK.permissions : (data.permissions ?? [])
  ) as AdminPermissionArea[];

  return {
    roleKey,
    displayName: data.displayName ?? "Admin",
    permissions,
    isFounder,
    homePath: data.homePath ?? defaultHomePath(roleKey),
    isLoading: false,
    can: (area) => permissions.includes(area),
  };
}

export function useAdminRouteGuard(requiredPath?: string) {
  const [location, navigate] = useLocation();
  const access = useAdminAccess();
  const path = requiredPath ?? location;

  useEffect(() => {
    if (access.isLoading) return;
    if (!canAccessRoute(access.permissions, path, access.isFounder)) {
      navigate(access.homePath);
    }
  }, [access.isLoading, access.permissions, access.homePath, access.isFounder, path, navigate]);
}

export function useRequireAdmin() {
  const [, navigate] = useLocation();
  const meQuery = useAdminMeQuery();
  const access = useAdminAccess();

  useEffect(() => {
    if (meQuery.isError) {
      navigate("/admin-login");
      return;
    }
    if (meQuery.data && !meQuery.data.isAdmin) {
      navigate("/admin-login");
    }
  }, [meQuery.isError, meQuery.data, navigate]);

  useEffect(() => {
    if (access.isLoading || !meQuery.data?.isAdmin) return;
    const path = window.location.pathname;
    if (path === "/admin-login") return;
    if (meQuery.data.mustChangePassword && path !== "/admin/force-password-change") {
      navigate("/admin/force-password-change");
      return;
    }
    if (!canAccessRoute(access.permissions, path, access.isFounder)) {
      navigate(access.homePath);
    }
  }, [
    access.isLoading,
    access.permissions,
    access.homePath,
    access.isFounder,
    meQuery.data?.isAdmin,
    meQuery.data?.mustChangePassword,
    navigate,
  ]);

  return meQuery;
}
