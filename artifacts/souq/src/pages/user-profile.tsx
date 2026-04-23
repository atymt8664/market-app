import { useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  Eye,
  UserPlus,
  UserCheck,
  Loader2,
} from "lucide-react";
import { AvatarCircle } from "@/components/avatar-circle";
import {
  useGetUserProfile,
  getGetUserProfileQueryKey,
  useFollowUser,
  useUnfollowUser,
  useRecordProfileView,
  useListAds,
  getListAdsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";

export default function UserProfile() {
  const params = useParams();
  const userId = Number(params.id);
  const { user: me } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const profileKey = getGetUserProfileQueryKey(userId);
  const { data: profile, isLoading } = useGetUserProfile(userId, {
    query: { queryKey: profileKey, enabled: !!userId },
  });

  const recordView = useRecordProfileView();
  const viewedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!userId || viewedRef.current === userId) return;
    viewedRef.current = userId;
    recordView.mutate(
      { userId },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: profileKey }),
        onError: () => {},
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const adsKey = getListAdsQueryKey({});
  const { data: allAds } = useListAds(
    {},
    { query: { queryKey: adsKey, enabled: !!userId } },
  );
  const userAds = (allAds ?? []).filter((a) => a.userId === userId);

  const followMut = useFollowUser();
  const unfollowMut = useUnfollowUser();

  const patchProfile = (
    patch: Partial<NonNullable<typeof profile>>,
  ) => {
    queryClient.setQueryData<NonNullable<typeof profile>>(profileKey, (old) =>
      old ? { ...old, ...patch } : old,
    );
  };

  const toggleFollow = () => {
    if (!profile) return;
    if (!me) {
      navigate(`/login?redirect=/users/${userId}`);
      return;
    }
    const willFollow = !profile.isFollowing;
    const prev = {
      isFollowing: profile.isFollowing,
      followerCount: profile.followerCount,
    };
    patchProfile({
      isFollowing: willFollow,
      followerCount: profile.followerCount + (willFollow ? 1 : -1),
    });
    const onSuccess = (r: {
      isFollowing: boolean;
      followerCount: number;
      followingCount: number;
    }) =>
      patchProfile({
        isFollowing: r.isFollowing,
        followerCount: r.followerCount,
        followingCount: r.followingCount,
      });
    const onError = () => patchProfile(prev);
    if (willFollow)
      followMut.mutate({ userId }, { onSuccess, onError });
    else unfollowMut.mutate({ userId }, { onSuccess, onError });
  };

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPending = followMut.isPending || unfollowMut.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all"
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg truncate">{profile.name}</h1>
      </header>

      <div className="bg-gradient-to-b from-primary to-primary/80 px-4 pt-6 pb-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <AvatarCircle name={profile.name} src={profile.avatarUrl} size={80} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{profile.name}</h2>
            {profile.city && (
              <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.city}</span>
              </div>
            )}
            <div className="text-[11px] opacity-75 mt-0.5">
              عضو منذ {new Date(profile.createdAt).toLocaleDateString("ar")}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-1 mt-5 bg-black/20 rounded-2xl p-3">
          <Stat label="إعلانات" value={profile.adCount} />
          <Stat label="متابعون" value={profile.followerCount} />
          <Stat label="يتابع" value={profile.followingCount} />
          <Stat
            label="مشاهدات"
            value={profile.profileViews}
            icon={<Eye className="w-3.5 h-3.5" />}
          />
        </div>

        {!profile.isSelf && (
          <Button
            onClick={toggleFollow}
            disabled={isPending}
            className={`w-full mt-4 py-5 font-bold text-base gap-2 ${
              profile.isFollowing
                ? "bg-white/15 hover:bg-white/25 text-white"
                : "bg-white text-primary hover:bg-white/90"
            }`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : profile.isFollowing ? (
              <>
                <UserCheck className="w-5 h-5" /> يتم المتابعة
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> متابعة
              </>
            )}
          </Button>
        )}
      </div>

      <div className="px-4 py-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">إعلانات {profile.name}</h3>
          <span className="text-muted-foreground text-xs">
            {userAds.length} إعلان
          </span>
        </div>

        {!allAds ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))}
          </div>
        ) : userAds.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            لا توجد إعلانات حالياً
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {userAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-lg font-bold">
          {value.toLocaleString("ar")}
        </span>
      </div>
      <span className="text-[10px] opacity-80 mt-0.5">{label}</span>
    </div>
  );
}
