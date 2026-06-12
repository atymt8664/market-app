import { useLocation } from "wouter";
import {
  BellRing,
  KeyRound,
  Lock,
  Monitor,
  ScrollText,
  Smartphone,
} from "lucide-react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import {
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";
import {
  SETTINGS_ROW_DIVIDER,
  SettingsHubRow,
  SettingsHubSection,
} from "@/components/settings-hub-list";
import { appendReturnToQuery, stashReturnTarget } from "@/lib/return-navigation";
import { t } from "@/i18n";

/** Security hub only — tighter secondary copy; does not alter global hub tokens. */
const SETTINGS_SECURITY_HUB_ROW_HINT =
  "mt-0.5 block w-full max-w-56 text-[10px] leading-[1.15] text-muted-foreground/65 text-pretty";

const SECURITY_HUB_ROW = {
  labelClassName: SETTINGS_HUB_LIST_ROW_LABEL,
  hintClassName: SETTINGS_SECURITY_HUB_ROW_HINT,
  hintLineClamp: 2 as const,
  dividerClassName: SETTINGS_ROW_DIVIDER,
};

export default function AccountSecurity() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (!isLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security" />;
  }

  const leaveHub = (path: string) => () => {
    stashReturnTarget("/account/security");
    navigate(appendReturnToQuery(path, "/account/security"));
  };

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("account_info.security.title")} backFallback="/settings" />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <SettingsHubSection>
          <SettingsHubRow
            icon={<Lock className="w-4 h-4" />}
            label={t("settings.security_center.password")}
            hint={t("settings.security_center.password_hint")}
            onClick={leaveHub("/account/password")}
            {...SECURITY_HUB_ROW}
          />
          <SettingsHubRow
            icon={<Monitor className="w-4 h-4" />}
            label={t("settings.ia.security.active_sessions")}
            hint={t("settings.sessions.hub_hint")}
            onClick={leaveHub("/account/security/sessions")}
            {...SECURITY_HUB_ROW}
          />
          <SettingsHubRow
            icon={<Smartphone className="w-4 h-4" />}
            label={t("settings.ia.security.devices")}
            hint={t("settings.devices.hub_hint")}
            onClick={leaveHub("/account/security/devices")}
            {...SECURITY_HUB_ROW}
          />
          <SettingsHubRow
            icon={<KeyRound className="w-4 h-4" />}
            label={t("settings.security_center.two_factor")}
            hint={t("settings.two_factor.hub_hint")}
            onClick={leaveHub("/account/security/two-factor")}
            {...SECURITY_HUB_ROW}
          />
          <SettingsHubRow
            icon={<ScrollText className="w-4 h-4" />}
            label={t("settings.ia.security.security_log")}
            hint={t("settings.security_log.hub_hint")}
            onClick={leaveHub("/account/security/log")}
            {...SECURITY_HUB_ROW}
          />
          <SettingsHubRow
            icon={<BellRing className="w-4 h-4" />}
            label={t("settings.ia.security.security_alerts")}
            hint={t("settings.security_alerts.hub_hint")}
            onClick={leaveHub("/account/security/alerts")}
            {...SECURITY_HUB_ROW}
          />
        </SettingsHubSection>
      </div>
    </div>
  );
}
