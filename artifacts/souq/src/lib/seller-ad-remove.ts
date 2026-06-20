import {
  ApiError,
  getAuthProfileCsrfTokenForRequest,
  getDeleteAdUrl,
} from "@workspace/api-client-react";

export type SellerAdRemoveOutcome = "hard_deleted" | "archived";

const AD_LIFECYCLE_OUTCOME_HEADER = "X-Ad-Lifecycle-Outcome";

/**
 * Seller ad remove with lifecycle outcome (archive vs hard delete).
 * Reads `X-Ad-Lifecycle-Outcome` from a successful DELETE response.
 */
export async function removeSellerAd(adId: number): Promise<SellerAdRemoveOutcome> {
  const csrf = getAuthProfileCsrfTokenForRequest();
  const response = await fetch(getDeleteAdUrl(adId), {
    method: "DELETE",
    credentials: "include",
    headers: csrf ? { "X-CSRF-Token": csrf } : {},
  });

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    throw new ApiError(response, data, {
      method: "DELETE",
      url: getDeleteAdUrl(adId),
    });
  }

  const outcome = response.headers.get(AD_LIFECYCLE_OUTCOME_HEADER);
  return outcome === "archived" ? "archived" : "hard_deleted";
}
