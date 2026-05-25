"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { acceptInviteAction } from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptInviteAction({ token });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Welcome!");
      // Full reload so the (app) layout re-resolves the user's active org
      // and the new session takes effect everywhere.
      window.location.assign("/dashboard");
    });
  }

  function decline() {
    router.push("/dashboard");
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={decline} disabled={pending}>
        Not now
      </Button>
      <Button onClick={accept} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Accept invitation
      </Button>
    </div>
  );
}
