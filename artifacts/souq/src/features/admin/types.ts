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
  targetAdId: number | null;
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
  };
  highlights?: {
    adsPendingReview: number;
    reportsNew: number;
    supportOpen: number;
    adsPublishedToday: number;
  };
  statusCounts?: {
    ads: Record<string, number>;
    reports: Record<string, number>;
    support: Record<string, number>;
    users: Record<string, number>;
  };
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
};

export type AdminReport = {
  id: number;
  reporterId: number;
  reporterName: string | null;
  reporterEmail: string | null;
  targetUserId: number | null;
  targetAdId: number | null;
  targetType: "ad" | "user" | "unknown";
  reason: string;
  description: string | null;
  status: "pending" | "in_review" | "resolved" | "rejected" | "ignored" | string;
  createdAt: string | null;
};

export type AdminSupportTicket = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  category: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed" | string;
  priority: "low" | "normal" | "high" | "urgent" | string;
  relatedAdId: number | null;
  relatedUserId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

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
  status: "active" | "banned";
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
    emailVerified: boolean;
    status: "active" | "banned";
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
