export type DashboardTotals = {
  users: number;
  ads: number;
  reports: number;
  views: number;
};

export type DashboardReport = {
  id: number;
  reason: string;
  status: string;
  createdAt: string | null;
  reporterName: string | null;
  reporterAvatarUrl?: string | null;
  targetAdId: number | null;
  targetUserId?: number | null;
  /** عنوان الإعلان عند وجود `targetAdId` */
  targetAdTitle?: string | null;
  targetAdSellerName?: string | null;
  /** صاحب الإعلان من جدول المستخدمين عند الربط بـ `ads.user_id` */
  targetAdOwnerAvatarUrl?: string | null;
  targetAdOwnerName?: string | null;
  /** المستخدم المستهدف مباشرة من البلاغ (`target_user_id`) */
  targetProfileName?: string | null;
  targetProfileAvatarUrl?: string | null;
};

export type DashboardSupportTicket = {
  id: number;
  subject: string;
  status: string;
  createdAt: string | null;
  userName: string | null;
};

export type DashboardTopAd = {
  id: number;
  title: string;
  views: number;
  status: string;
  city: string;
};

export type DashboardTopCity = {
  city: string;
  adsCount: number;
  totalViews: number;
};

export type DashboardAdsStatus = {
  status: string;
  value: number;
};

export type AdminDashboardResponse = {
  totals: DashboardTotals;
  latestReports: DashboardReport[];
  latestSupportTickets: DashboardSupportTicket[];
  topAds: DashboardTopAd[];
  topCities: DashboardTopCity[];
  adsStatus: DashboardAdsStatus[];
  badges?: {
    adsPendingReview: number;
    reportsOpen: number;
    supportOpen: number;
    usersNewToday: number;
    verificationOpen?: number;
  };
  highlights?: {
    adsPendingReview: number;
    reportsNew: number;
    supportOpen: number;
    adsPublishedToday: number;
    /** إجمالي الإعلانات ذات featured=true (جميع الحالات؛ الظهور العام يشترط approved) */
    featuredAdsCount?: number;
  };
  statusCounts?: {
    ads: Record<string, number>;
    reports: Record<string, number>;
    support: Record<string, number>;
    users: Record<string, number>;
  };
  rbac?: {
    roleKey: string;
    displayName: string;
    permissions: string[];
    isFounder: boolean;
  };
  noc?: AdminNocSnapshot;
};

export type AdminNocQueueItem = {
  key: string;
  labelKey: string;
  count: number;
  href: string;
};

export type AdminNocNeedsActionItem = {
  key: string;
  labelKey: string;
  count: number;
  href: string;
  severity: "critical" | "warning" | "info";
  dataAvailable: boolean;
};

export type AdminNocActivityActor = {
  id: number | null;
  roleKey:
    | "founder"
    | "moderator"
    | "support"
    | "verification"
    | "analyst"
    | "admin_manager"
    | "finance_manager"
    | "system"
    | "user";
  displayName?: string | null;
};

export type AdminNocActivityItem = {
  id: string;
  kind: "admin_action" | "ad_created" | "report_created" | "user_registered" | "support_created";
  createdAt: string;
  href: string | null;
  actor: AdminNocActivityActor;
  actionKey: string;
  target: {
    type: string;
    id: number | null;
  } | null;
  reason: string | null;
  context: Record<string, string>;
};

export type AdminNocPriorityLevel = "critical" | "warning" | "normal";

export type AdminNocPriorityItem = {
  key: string;
  level: AdminNocPriorityLevel;
  labelKey: string;
  count: number;
  href: string | null;
  dataAvailable: boolean;
};

export type AdminNocExecutiveHeader = {
  companyName: string;
  founderName: string;
  founderRoleKey: "founder";
  permissionsKey: string;
  lastUpdatedAt: string;
  today: {
    newUsers: number;
    newAds: number;
    newReports: number;
    newSupport: number;
  };
  interventionCount: number;
};

export type AdminNocUserIntelligence = {
  onlineNow: number;
  activeLast5Minutes: number;
  activeToday: number;
  newUsersToday: number;
  blockedUsers: number;
  pendingVerification: number;
  pendingVerificationDataAvailable: boolean;
};

export type AdminNocSystemHealthKey =
  | "api"
  | "websocket"
  | "ram"
  | "cpu"
  | "database"
  | "redis"
  | "storage"
  | "push_worker"
  | "queue_worker"
  | "p95_latency";

export type AdminNocSystemHealthItem = {
  key: AdminNocSystemHealthKey;
  status: "ok" | "warn" | "fail" | "muted" | "unconfigured";
  value: string | number | null;
  hintParams?: Record<string, string | number>;
};

export type AdminNocFounderIdentity = {
  displayName: string;
  roleKey: "founder";
  roleLabelKey: string;
  permissionsLabelKey: string;
};

export type AdminNocSnapshot = {
  executiveHeader: AdminNocExecutiveHeader;
  founderIdentity: AdminNocFounderIdentity;
  userIntelligence: AdminNocUserIntelligence;
  priorityItems: AdminNocPriorityItem[];
  systemHealthGrid: AdminNocSystemHealthItem[];
  needsActionNow: AdminNocNeedsActionItem[];
  liveSystemStatus: {
    onlineUsersNow: number;
    activeLast5Minutes: number;
    todayActiveUsers: number;
    pendingAds: number;
    openReports: number;
    openSupportTickets: number;
    avatarReviewPending: number;
    verificationPending: number;
    criticalIssues: number;
    apiHealth: {
      healthz: "ok";
      readyz: "ready" | "not_ready";
      dbLatencyMs: number | null;
    };
    websocket: {
      connectionsCurrent: number;
      usersWithOpenSockets: number;
      authFailuresTotal: number;
      disconnectsTotal: number;
    };
    apiLatency: {
      count: number;
      p50Ms: number | null;
      p95Ms: number | null;
      avgMs: number | null;
    };
    ram: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    cpu:
      | {
          available: true;
          cores: number;
          loadAvg1m: number;
          loadAvg5m: number | null;
          source: "node:os.loadavg";
        }
      | {
          available: false;
          reason: "loadavg_unavailable";
        };
  };
  queueCenter: AdminNocQueueItem[];
  recentActivity: AdminNocActivityItem[];
};

export type AdminStatsPeriod = "today" | "7d" | "30d" | "all";

export type AdminStatsResponse = {
  period: AdminStatsPeriod;
  generatedAt: string;
  totals: {
    users: number;
    ads: number;
    reports: number;
    supportTickets: number;
    views: number;
    cities: number;
    categories: number;
  };
  users: {
    newToday: number;
    newWeek: number;
    newMonth: number;
  };
  ads: {
    publishedToday: number;
    pending: number;
    approved: number;
    rejected: number;
    hidden: number;
  };
  reports: {
    total: number;
    new: number;
    inReview: number;
    resolved: number;
    open: number;
  };
  support: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  periodMetrics: {
    users: number;
    ads: number;
    reports: number;
    supportTickets: number;
    views: number;
  };
  topCities: Array<{
    city: string;
    adsCount: number;
    totalViews: number;
  }>;
  topCategories: Array<{
    id: number;
    name: string;
    adsCount: number;
    totalViews: number;
  }>;
  topAds: Array<{
    id: number;
    title: string;
    views: number;
    city: string;
    status: string;
    createdAt: string | null;
  }>;
  analyticsFoundation?: {
    messagesToday: number;
    reportsToday: number;
    reportResolutionRatePct: number | null;
    supportResolutionRatePct: number | null;
    userGrowth: {
      today: number;
      week: number;
      month: number;
    };
  };
};

export type AdminSettings = {
  appName: string;
  appVersion: string;
  supportEmail: string;
  requireAdApproval: boolean;
  reportsEnabled: boolean;
  supportEnabled: boolean;
  termsPath: string;
  privacyPath: string;
  updatedAt: string | null;
  updatedByAdminId: number | null;
};

export type AdminSettingsUpdateInput = {
  appName: string;
  appVersion: string;
  supportEmail: string;
  requireAdApproval: boolean;
  reportsEnabled: boolean;
  supportEnabled: boolean;
  termsPath: string;
  privacyPath: string;
};

export type AdminSlaIntel = {
  slaState: "within" | "approaching" | "exceeded";
  slaDueAt: string | null;
  slaMinutesRemaining: number | null;
};

export type AdminAd = {
  id: number;
  userId: number;
  title: string;
  description: string;
  price: number | null;
  priceType: string;
  type: string;
  city: string;
  images: string[];
  categoryId: number;
  categoryName: string | null;
  subcategoryId: number | null;
  subcategoryName: string | null;
  sellerName: string;
  sellerPhone: string;
  featured: boolean;
  status: "pending" | "approved" | "rejected" | "hidden";
  createdAt: string;
  views: number;
  assignment?: {
    staffId: number | null;
    staffName: string | null;
    roleKey: string | null;
    assignedAt: string | null;
    assignedByAdminId: number | null;
    assignedByName: string | null;
  };
} & AdminSlaIntel;

export type AdminReport = {
  id: number;
  reporterId: number;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterAvatarUrl?: string | null;
  targetUserId: number | null;
  targetAdId: number | null;
  relatedConversationId?: number | null;
  targetType: "ad" | "user" | "conversation" | "unknown";
  reason: string;
  description: string | null;
  status: "open" | "under_review" | "resolved" | "rejected" | string;
  createdAt: string | null;
  assignment?: {
    staffId: number | null;
    staffName: string | null;
    roleKey: string | null;
    assignedAt: string | null;
    assignedByAdminId: number | null;
    assignedByName: string | null;
  };
  /** عند الإبلاغ عن إعلان */
  targetAdTitle?: string | null;
  targetAdSellerName?: string | null;
  targetAdOwnerAvatarUrl?: string | null;
  targetAdOwnerName?: string | null;
  /** عند الإبلاغ عن مستخدم */
  targetProfileName?: string | null;
  targetProfileAvatarUrl?: string | null;
} & AdminSlaIntel;

export type AdminSupportTicket = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl?: string | null;
  category: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed" | string;
  priority: "low" | "normal" | "high" | "urgent" | string;
  relatedAdId: number | null;
  relatedUserId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignment?: {
    staffId: number | null;
    staffName: string | null;
    roleKey: string | null;
    assignedAt: string | null;
    assignedByAdminId: number | null;
    assignedByName: string | null;
  };
} & AdminSlaIntel;

export type AdminSupportMessage = {
  id: number;
  ticketId: number;
  userId: number | null;
  adminId: number | null;
  message: string;
  createdAt: string | null;
};

export type AdminActivityLog = {
  id: number;
  actionType: string;
  actor: string;
  actorAdminId: number | null;
  actorDisplayName: string | null;
  actorRoleKey: string | null;
  targetType: string;
  targetId: number | null;
  createdAt: string | null;
  details: string;
};

export type AdminSubcategory = {
  id: number;
  categoryId: number;
  name: string;
  sortOrder: number;
  isHidden: boolean;
  status: "active" | "hidden";
  adsCount: number;
};

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string;
  subtitle: string;
  sortOrder: number;
  isHidden: boolean;
  status: "active" | "hidden";
  adsCount: number;
  subcategories: AdminSubcategory[];
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatarPendingReview?: boolean;
  emailVerified?: boolean;
  status: "active" | "banned";
  lastSeenAt: string | null;
  createdAt: string | null;
};

export type AdminUserDetails = {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    city: string;
    avatarUrl: string | null;
    avatarPendingReview?: boolean;
    emailVerified: boolean;
    status: "active" | "banned";
    lastSeenAt: string | null;
    createdAt: string | null;
  };
  stats: {
    adsCount: number;
    reportsCount: number;
    supportTicketsCount: number;
  };
  ads: Array<{
    id: number;
    title: string;
    status: string;
    city: string;
    views: number;
    createdAt: string | null;
  }>;
  reports: Array<{
    id: number;
    reason: string;
    description: string | null;
    status: string;
    targetAdId: number | null;
    reporterName: string | null;
    createdAt: string | null;
  }>;
  supportTickets: Array<{
    id: number;
    category: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string | null;
  }>;
};

export type AdminCity = {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  isHidden: boolean;
  status: "active" | "hidden";
  adsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminCityCountry = {
  code: string;
  name: string;
};

export type AdminCitiesResponse = {
  countries: AdminCityCountry[];
  cities: AdminCity[];
};

export type AdminStaffStatus = "active" | "suspended" | "disabled";

export type AdminStaffListItem = {
  id: number;
  adminActorId: number;
  displayName: string;
  roleKey: import("./rbac").AdminRoleKey;
  departmentKey: import("./rbac").AdminDepartmentKey;
  loginEmail: string | null;
  hasCredentialAccount: boolean;
  mustChangePassword: boolean;
  status: AdminStaffStatus;
  isActive: boolean;
  isFounder: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  activeSessions: number;
  assignedItemsCount: number;
  operationsToday: number;
  reportsProcessedToday: number;
  ticketsProcessedToday: number;
  lastActivityAt: string | null;
  lastActivityAction: string | null;
  sessionStatus: "online" | "offline" | "suspended" | "disabled";
};

export type AdminStaffSessionView = {
  sessionId: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type AdminStaffActivityEntry = {
  id: number;
  action: string;
  targetType: string;
  targetId: number | null;
  reason: string | null;
  deepLink: string | null;
  createdAt: string;
};

export type AdminStaffDetailResponse = {
  staff: AdminStaffListItem;
  sessions: AdminStaffSessionView[];
  activity: AdminStaffActivityEntry[];
};

export type AdminStaffMetaResponse = {
  departments: Array<{
    key: import("./rbac").AdminDepartmentKey;
    labelKey: string;
    roles: Array<{ key: import("./rbac").AdminRoleKey; labelKey: string }>;
  }>;
  founderProtected: boolean;
};

export type AdminStaffCreateResponse = {
  staff: AdminStaffListItem;
  temporaryPassword: string;
  oneTimeReveal: true;
};

export type VerificationRequestStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_info";

export type VerificationRequestType =
  | "identity"
  | "seller"
  | "business"
  | "phone"
  | "email";

export type VerificationDocument = {
  id: number;
  kind: string;
  url: string;
  label: string | null;
  createdAt: string;
};

export type VerificationActivityEntry = {
  id: number;
  actorAdminId: number | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
};

export type VerificationRequest = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  type: VerificationRequestType;
  status: VerificationRequestStatus;
  isUrgent: boolean;
  notes: string | null;
  rejectionReason: string | null;
  assignment: import("./staff-workflow-types").StaffAssignment;
  escalatedAt: string | null;
  escalatedByAdminId: number | null;
  escalatedByName: string | null;
  escalationNote: string | null;
  createdAt: string;
  updatedAt: string;
} & AdminSlaIntel;

export type VerificationRequestDetail = VerificationRequest & {
  documents: VerificationDocument[];
  activity: VerificationActivityEntry[];
};

export type VerificationStats = {
  total: number;
  pendingReview: number;
  underReview: number;
  approved: number;
  rejected: number;
  unassigned: number;
  mine: number;
  urgent: number;
  escalation: number;
  slaExceeded: number;
  slaWithin: number;
  slaApproaching: number;
};
