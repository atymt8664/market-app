export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  fetchUserPresenceBatch,
  getUserPresenceBatchQueryKey,
  invalidateUserPresenceBatchQueries,
  normalizePresenceUserIds,
  useUserPresenceBatch,
  type UserPresenceBatchResponse,
  type UserPresenceEntry,
} from "./user-presence-batch";
export {
  absorbAuthProfileCsrfFromResponse,
  clearAuthProfileCsrfToken,
  getAuthProfileCsrfTokenForRequest,
} from "./auth-profile-csrf";
export { setBaseUrl, setAuthTokenGetter, ApiError } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
