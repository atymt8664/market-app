/** HH:MM (24h) in the given IANA timezone. */
export function localTimeHm(now: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour}:${minute}`;
  } catch {
    const h = now.getUTCHours().toString().padStart(2, "0");
    const m = now.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
}

function hmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** True when device push should be suppressed for quiet hours. */
export function isWithinQuietHours(
  now: Date,
  startHm: string,
  endHm: string,
  timezone: string,
): boolean {
  const current = hmToMinutes(localTimeHm(now, timezone));
  const start = hmToMinutes(startHm);
  const end = hmToMinutes(endHm);
  if (current === null || start === null || end === null) return false;
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}
