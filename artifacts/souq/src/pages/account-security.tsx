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
  SETTINGS_HUB_LIST_ROW_HINT,
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
import { appendReturnToQuery } from "@/lib/return-navigation";
import { t } from "@/i18n";

export default function AccountSecurity() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (!isLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security" />;
  }

  const leaveHub = (path: string) => () => {
    navigate(appendReturnToQuery(path, "/account/security"));
  };

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("account_info.security.title")} />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <SettingsHubSection>
          <SettingsHubRow
            icon={<Lock className="w-4 h-4" />}
            label={t("settings.security_center.password")}
            hint={t("settings.security_center.password_hint")}
            onClick={leaveHub("/account/password")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Monitor className="w-4 h-4" />}
            label={t("settings.ia.security.active_sessions")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Smartphone className="w-4 h-4" />}
            label={t("settings.ia.security.devices")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<KeyRound className="w-4 h-4" />}
            label={t("settings.security_center.two_factor")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<ScrollText className="w-4 h-4" />}
            label={t("settings.ia.security.security_log")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<BellRing className="w-4 h-4" />}
            label={t("settings.ia.security.security_alerts")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
        </SettingsHubSection>
      </div>
    </div>
  );
}
