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
          toast({ title: "تم حفظ التغييرات" });
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: "تعذّر الحفظ",
            description: e?.data?.error || "حاول مرة أخرى",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title="الملف الشخصي" />
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card/70 p-4 md:p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>المدينة</Label>
            <CitySelect value={city} onChange={setCity} />
          </div>
          <div className="pt-1">
            <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto sm:min-w-[180px] py-2.5 text-sm font-bold">
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </form>
        </div>
      </div>
  );
}
