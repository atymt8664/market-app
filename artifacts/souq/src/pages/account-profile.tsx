import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CitySelect } from "@/components/city-select";
import { useToast } from "@/hooks/use-toast";
import { useAuthUpdateProfile, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { t } from "@/i18n";

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
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title={t("account_profile.title")} />
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-primary/20 bg-card/70 p-4 md:p-5 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]"
          dir="rtl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-xs md:text-sm text-muted-foreground/95">
                {t("account_profile.name")}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="h-11 rounded-xl border-border/70 bg-background/70 px-3.5 focus-visible:ring-1 focus-visible:ring-primary/45"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone" className="text-xs md:text-sm text-muted-foreground/95">
                {t("account_profile.phone")}
              </Label>
              <Input
                id="phone"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={5}
                className="h-11 rounded-xl border-border/70 bg-background/70 px-3.5 focus-visible:ring-1 focus-visible:ring-primary/45"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Label className="text-xs md:text-sm text-muted-foreground/95">{t("account_profile.city")}</Label>
            <CitySelect
              value={city}
              onChange={setCity}
              className="h-11 rounded-xl border-border/70 bg-background/70 px-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/45 hover:bg-background/75"
            />
          </div>
          <div className="mt-6">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="h-11 w-full sm:w-auto sm:min-w-[200px] rounded-xl bg-primary text-black text-sm font-semibold shadow-[0_8px_18px_-12px_rgba(182,227,86,0.6)] hover:bg-primary/90"
            >
              {updateMutation.isPending ? t("account_profile.saving") : t("account_profile.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
