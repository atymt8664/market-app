import { useCallback, useState } from "react";
import { Redirect } from "wouter";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import {
  fetchUserDevices,
  revokeUserDevice,
  UserDevicesApiError,
  type UserDeviceDto,
} from "@/lib/user-devices-api";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_CARD_TITLE,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export const userDevicesQueryKey = () => ["account", "devices"] as const;

function formatDeviceRegistered(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale === "de" ? "de" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function deviceLabel(device: UserDeviceDto): string {
  if (device.deviceLabel?.trim()) return device.deviceLabel.trim();
  return device.isCurrent
    ? t("settings.devices.current_device")
    : t("settings.devices.unknown_device");
}

function DeviceRow({
  device,
  textDir,
  revoking,
  onRevoke,
}: {
  device: UserDeviceDto;
  textDir: "rtl" | "ltr";
  revoking: boolean;
  onRevoke?: () => void;
}) {
  const { locale } = useLocale();

  return (
    <article className="px-3 py-3 md:px-4" dir={textDir}>
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary">
          {device.isCurrent ? (
            <Smartphone className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          ) : (
            <Monitor className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-[15px] font-semibold text-foreground">{deviceLabel(device)}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/90">
            {t("settings.devices.registered_label")}: {formatDeviceRegistered(device.createdAt, locale)}
          </p>
        </div>
        {device.isCurrent ? (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {t("settings.devices.current_badge")}
          </span>
        ) : null}
      </div>
      {!device.isCurrent && onRevoke ? (
        <div className="mt-2.5">
          <button
            type="button"
            disabled={revoking}
            onClick={onRevoke}
            className={cn(
              SETTINGS_OUTLINE_BUTTON,
              "!min-h-10 w-full border-destructive/40 py-2 text-xs text-destructive-foreground sm:w-auto",
            )}
          >
            {revoking ? "…" : t("settings.devices.remove_one")}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default function AccountSecurityDevices() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const {
    data: devices = [],
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: userDevicesQueryKey(),
    queryFn: fetchUserDevices,
    enabled: Boolean(user),
  });

  const loadErrorMessage = (() => {
    if (!isError || !error) return t("settings.devices.load_failed");
    if (error instanceof UserDevicesApiError) {
      if (error.status === 404) return t("settings.devices.load_failed_missing_api");
      if (error.status === 401 || error.status === 403) return t("settings.devices.load_failed_auth");
    }
    return t("settings.devices.load_failed");
  })();

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security/devices" />;
  }

  const textDir = locale === "ar" ? "rtl" : "ltr";
  const loading = isPending && devices.length === 0;
  const currentDevice = devices.find((d) => d.isCurrent);
  const otherDevices = devices.filter((d) => !d.isCurrent);
  const hasAny = devices.length > 0;

  const refreshDevices = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userDevicesQueryKey() });
  }, [queryClient]);

  const handleRemoveOne = useCallback(
    async (deviceId: number) => {
      setRevokingId(deviceId);
      try {
        await revokeUserDevice(deviceId);
        await refreshDevices();
        toast({ title: t("settings.devices.remove_success") });
      } catch {
        toast({ title: t("settings.devices.remove_failed"), variant: "destructive" });
      } finally {
        setRevokingId(null);
      }
    },
    [refreshDevices, toast],
  );

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader
        title={t("settings.ia.security.devices")}
        backFallback="/account/security"
      />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        {loading || (isFetching && devices.length === 0) ? (
          <div className={`${SETTINGS_CARD} flex min-h-[12rem] items-center justify-center`}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : isError ? (
          <div className={`${SETTINGS_CARD} px-4 py-6 text-center`} dir={textDir}>
            <p className="text-sm leading-relaxed text-muted-foreground">{loadErrorMessage}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(SETTINGS_OUTLINE_BUTTON, "mt-4 !min-h-10 px-4 text-xs")}
            >
              {t("settings.devices.retry")}
            </button>
          </div>
        ) : !hasAny ? (
          <div className={`${SETTINGS_CARD} px-4 py-8 text-center text-sm text-muted-foreground`} dir={textDir}>
            {t("settings.devices.empty_all")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <section>
              <h2 className={`${SETTINGS_CARD_TITLE} mb-2 px-0.5`}>
                {t("settings.devices.current_section")}
              </h2>
              <div className={SETTINGS_CARD_SHELL}>
                {currentDevice ? (
                  <DeviceRow device={currentDevice} textDir={textDir} revoking={false} />
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground" dir={textDir}>
                    {t("settings.devices.current_device")}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className={`${SETTINGS_CARD_TITLE} mb-2 px-0.5`}>
                {t("settings.devices.others_section")}
              </h2>
              {otherDevices.length > 0 ? (
                <div className={`${SETTINGS_CARD_SHELL} overflow-hidden`}>
                  {otherDevices.map((device, index) => (
                    <div
                      key={device.deviceId}
                      className={index < otherDevices.length - 1 ? "border-b border-primary/10" : ""}
                    >
                      <DeviceRow
                        device={device}
                        textDir={textDir}
                        revoking={revokingId === device.deviceId}
                        onRevoke={() => void handleRemoveOne(device.deviceId)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${SETTINGS_CARD} px-4 py-6 text-center text-sm text-muted-foreground`} dir={textDir}>
                  {t("settings.devices.empty_others")}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
