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

  if (!isLoading && !user) return <Redirect to="/login?redirect=/account/profile" />;

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
      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">الاسم</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input id="phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>المدينة</Label>
          <CitySelect value={city} onChange={setCity} />
        </div>
        <Button type="submit" disabled={updateMutation.isPending} className="mt-2 py-6 text-base font-bold">
          {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </form>
    </div>
  );
}
