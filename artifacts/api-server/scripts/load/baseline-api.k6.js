/**
 * k6 baseline load script — Phase 7A.5 foundation.
 * Usage: k6 run -e API_BASE_URL=https://api.souq-arab.com scripts/load/baseline-api.k6.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.API_BASE_URL || "https://api.souq-arab.com";

export const options = {
  scenarios: {
    ads_list: {
      executor: "constant-vus",
      vus: Number(__ENV.K6_VUS || 5),
      duration: __ENV.K6_DURATION || "30s",
      exec: "adsList",
    },
    ads_search: {
      executor: "constant-vus",
      vus: Number(__ENV.K6_SEARCH_VUS || 3),
      duration: __ENV.K6_DURATION || "30s",
      exec: "adsSearch",
      startTime: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
  },
};

export function adsList() {
  const res = http.get(`${baseUrl}/api/ads?limit=20`, {
    headers: { Accept: "application/json" },
    tags: { name: "ads_list" },
  });
  check(res, {
    "ads list 200": (r) => r.status === 200,
    "has request id": (r) => Boolean(r.headers["X-Request-Id"]),
  });
  sleep(0.5);
}

export function adsSearch() {
  const res = http.get(`${baseUrl}/api/ads?q=test&limit=10`, {
    headers: { Accept: "application/json" },
    tags: { name: "ads_search" },
  });
  check(res, {
    "ads search 200": (r) => r.status === 200,
  });
  sleep(0.75);
}

export function setup() {
  const health = http.get(`${baseUrl}/api/readyz`);
  check(health, { "readyz ok": (r) => r.status === 200 });
}
