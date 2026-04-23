import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthChangePassword } from "@workspace/api-client-react";

export default function AccountPassword() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const change = useAuthChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!isLoading && !user) return <Redirect to="/login?redirect=/account/password" />;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast({ title: "كلمة المرور قصيرة", description: "6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    change.mutate(
      { data: { currentPassword: current, newPassword: next } },
      {
        onSuccess: () => {
          toast({ title: "تم تغيير كلمة المرور" });
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: "تعذّر التغيير",
            description: e?.data?.error || "تأكد من كلمة المرور الحالية",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title="تغيير كلمة المرور" />
      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current">كلمة المرور الحالية</Label>
          <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="next">كلمة المرور الجديدة</Label>
          <Input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" disabled={change.isPending} className="mt-2 py-6 text-base font-bold">
          {change.isPending ? "جاري الحفظ..." : "تحديث كلمة المرور"}
        </Button>
      </form>
    </div>
  );
}
