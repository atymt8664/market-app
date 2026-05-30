import { Link } from "wouter";
import { useMemo } from "react";
import {
  useGetUserFollowers,
  useGetUserFollowing,
  useGetUserProfileViewers,
  useUserPresenceBatch,
  getGetUserFollowersQueryKey,
  getGetUserFollowingQueryKey,
  getGetUserProfileViewersQueryKey,
} from "@workspace/api-client-react";
import { AvatarCircle } from "@/components/avatar-circle";
import { UserPresenceBadge } from "@/components/user-presence-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

const rowShell =
  "flex min-h-[3.25rem] items-start gap-3 rounded-xl border border-primary/25 bg-[#0A0A0A]/80 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-black/85";

export function ProfileStatsListsPanel({
  sheet,
  profileUserId,
  isSelf,
  viewerUserId,
}: {
  sheet: "followers" | "following" | "views";
  profileUserId: number;
  isSelf: boolean;
  /** Current logged-in user; presence batch disabled when missing or ≤0. */
  viewerUserId?: number;
}) {
  const { locale } = useLocale();
  const dir = locale === "en" || locale === "de" ? "ltr" : "rtl";
  const align = dir === "rtl" ? "text-right" : "text-left";

  const followersQ = useGetUserFollowers(profileUserId, {
    query: {
      queryKey: getGetUserFollowersQueryKey(profileUserId),
      enabled: sheet === "followers" && profileUserId > 0,
      retry: false,
    },
  });
  const followingQ = useGetUserFollowing(profileUserId, {
    query: {
      queryKey: getGetUserFollowingQueryKey(profileUserId),
      enabled: sheet === "following" && profileUserId > 0,
      retry: false,
    },
  });
  const viewersQ = useGetUserProfileViewers(profileUserId, {
    query: {
      queryKey: getGetUserProfileViewersQueryKey(profileUserId),
      enabled: sheet === "views" && profileUserId > 0 && isSelf,
      retry: false,
    },
  });

  const presenceTargets = useMemo(() => {
    const vid = typeof viewerUserId === "number" && viewerUserId > 0 ? viewerUserId : 0;
    if (!vid) return [];
    if (sheet === "followers" && followersQ.data?.length) {
      return followersQ.data.map((r) => r.userId);
    }
    if (sheet === "following" && followingQ.data?.length) {
      return followingQ.data.map((r) => r.userId);
    }
    if (sheet === "views" && isSelf && viewersQ.data?.items?.length) {
      return viewersQ.data.items
        .map((r) => r.userId)
        .filter((id): id is number => typeof id === "number" && id > 0);
    }
    return [];
  }, [
    sheet,
    isSelf,
    viewerUserId,
    followersQ.data,
    followingQ.data,
    viewersQ.data,
  ]);

  const presenceQ = useUserPresenceBatch(presenceTargets, {
    enabled: presenceTargets.length > 0,
  });

  if (sheet === "views" && !isSelf) {
    return (
      <p className={cn("text-sm leading-relaxed text-muted-foreground", align)}>
        {t("profile.stats.sheet.viewers_private")}
      </p>
    );
  }

  const activeQ =
    sheet === "followers"
      ? followersQ
      : sheet === "following"
        ? followingQ
        : viewersQ;

  if (activeQ.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[3.25rem] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (activeQ.isError) {
    return (
      <p className={cn("text-sm text-destructive", align)}>
        {t("profile.stats.sheet.list_load_error")}
      </p>
    );
  }

  if (sheet === "views" && viewersQ.data) {
    const { items, anonymousDistinctCount } = viewersQ.data;
    return (
      <div className="space-y-3" dir={dir}>
        {items.length === 0 && anonymousDistinctCount === 0 ? (
          <p className={cn("text-sm leading-relaxed text-muted-foreground", align)}>
            {t("profile.stats.sheet.empty_views_list")}
          </p>
        ) : null}
        <div className="space-y-2">
          {items.map((row) => {
            const key = `${row.userId ?? "anon"}-${row.lastViewedAt}`;
            if (row.userId != null) {
              return (
                <Link key={key} href={`/users/${row.userId}`} className={cn(rowShell)}>
                  <AvatarCircle
                    name={row.name}
                    src={row.avatarUrl ?? undefined}
                    size={40}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="truncate font-medium text-foreground">{row.name}</div>
                    <UserPresenceBadge
                      entry={presenceQ.data?.byUserId[String(row.userId)]}
                      isLoading={presenceQ.isPending}
                      variant="compact"
                    />
                    <div className="truncate text-xs text-muted-foreground">
                      {formatRelativeTime(row.lastViewedAt)}
                    </div>
                  </div>
                </Link>
              );
            }
            return (
              <div key={key} className={cn(rowShell, "cursor-default")}>
                <AvatarCircle
                  name={row.name}
                  src={row.avatarUrl ?? undefined}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{row.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatRelativeTime(row.lastViewedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {anonymousDistinctCount > 0 ? (
          <p className={cn("text-xs leading-relaxed text-muted-foreground", align)}>
            {t("profile.stats.sheet.viewers_anonymous_hint", {
              count: anonymousDistinctCount,
            })}
          </p>
        ) : null}
      </div>
    );
  }

  const list =
    sheet === "followers"
      ? followersQ.data
      : sheet === "following"
        ? followingQ.data
        : null;

  if (!list) {
    return null;
  }

  if (list.length === 0) {
    return (
      <p className={cn("text-sm leading-relaxed text-muted-foreground", align)}>
        {t("profile.stats.sheet.empty_follow_list")}
      </p>
    );
  }

  return (
    <div className="space-y-2" dir={dir}>
      {list.map((row) => (
        <Link key={row.userId} href={`/users/${row.userId}`} className={cn(rowShell)}>
          <AvatarCircle name={row.name} src={row.avatarUrl ?? undefined} size={40} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate font-medium text-foreground">{row.name}</span>
            <UserPresenceBadge
              entry={presenceQ.data?.byUserId[String(row.userId)]}
              isLoading={presenceQ.isPending}
              variant="compact"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
