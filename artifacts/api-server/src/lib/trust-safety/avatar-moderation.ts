type AvatarFields = {
  avatarUrl?: string | null;
  avatarApprovedUrl?: string | null;
  avatarPendingReview?: boolean;
};

export function resolvePublicAvatarUrl(
  user: AvatarFields,
  viewerIsOwner: boolean,
): string | null {
  if (viewerIsOwner) {
    return user.avatarUrl ?? null;
  }
  if (user.avatarPendingReview) {
    return user.avatarApprovedUrl ?? null;
  }
  return user.avatarUrl ?? user.avatarApprovedUrl ?? null;
}

export function avatarPatchAfterUpload(
  user: AvatarFields,
  newUrl: string,
): {
  avatarUrl: string;
  avatarApprovedUrl: string | null;
  avatarPendingReview: boolean;
} {
  const hadApproved =
    Boolean(user.avatarApprovedUrl?.trim()) || Boolean(user.avatarUrl?.trim());
  if (!hadApproved) {
    return {
      avatarUrl: newUrl,
      avatarApprovedUrl: newUrl,
      avatarPendingReview: false,
    };
  }
  if (user.avatarApprovedUrl === newUrl || user.avatarUrl === newUrl) {
    return {
      avatarUrl: newUrl,
      avatarApprovedUrl: user.avatarApprovedUrl ?? newUrl,
      avatarPendingReview: false,
    };
  }
  return {
    avatarUrl: newUrl,
    avatarApprovedUrl: user.avatarApprovedUrl ?? user.avatarUrl ?? null,
    avatarPendingReview: true,
  };
}

export function avatarPatchAfterUrlChange(
  user: AvatarFields,
  newUrl: string | null,
): {
  avatarUrl: string | null;
  avatarApprovedUrl: string | null;
  avatarPendingReview: boolean;
} {
  if (newUrl === null) {
    return {
      avatarUrl: null,
      avatarApprovedUrl: null,
      avatarPendingReview: false,
    };
  }
  return avatarPatchAfterUpload(user, newUrl);
}

export function avatarPatchAfterAdminApprove(user: AvatarFields): {
  avatarApprovedUrl: string | null;
  avatarPendingReview: boolean;
} {
  return {
    avatarApprovedUrl: user.avatarUrl ?? null,
    avatarPendingReview: false,
  };
}

export function avatarPatchAfterAdminReject(user: AvatarFields): {
  avatarUrl: string | null;
  avatarPendingReview: boolean;
} {
  return {
    avatarUrl: user.avatarApprovedUrl ?? user.avatarUrl ?? null,
    avatarPendingReview: false,
  };
}
