import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { CitySelect } from "@/components/city-select";
import { useToast } from "@/hooks/use-toast";
import { useAuthUpdateProfile, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { t } from "@/i18n";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_DROPDOWN_TRIGGER,
  SETTINGS_INPUT,
  SETTINGS_LABEL,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";

export default function AccountProfile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useAuthUpdateProfile();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setCity(user.city || "");
    }
  }, [user]);

  if (!isLoading && !user) return <Redirect to="/guest-welcome?redirect=/account/profile" />;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { data: { name: name.trim(), phone: phone.trim(), city: city.trim() } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
          toast({ title: t("account_profile.saved") });
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: t("account_profile.save_failed"),
            description: e?.data?.error || t("common.try_again"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className={`flex min-h-[100dvh] w-full flex-col ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("account_profile.title")} />
      <div className={`${SETTINGS_MAIN_COLUMN} py-5`}>
        <form onSubmit={onSubmit} className={SETTINGS_CARD} dir="rtl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={SETTINGS_LABEL}>
                {t("account_profile.name")}
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className={SETTINGS_INPUT}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className={SETTINGS_LABEL}>
                {t("account_profile.phone")}
              </label>
              <input
                id="phone"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={5}
                className={cn(SETTINGS_INPUT, "text-left")}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <span className={SETTINGS_LABEL}>{t("account_profile.city")}</span>
            <CitySelect
              value={city}
              onChange={setCity}
              className={cn(SETTINGS_DROPDOWN_TRIGGER, "h-auto min-h-[3rem] py-3")}
            />
          </div>
          <div className={`${SETTINGS_ACTION_PANEL} mt-6`}>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className={SETTINGS_PRIMARY_BUTTON}
            >
              {updateMutation.isPending ? t("account_profile.saving") : t("account_profile.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
