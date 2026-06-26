"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { acceptInviteAction } from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";

interface AcceptInviteLabels {
  accept: string;
  decline: string;
  welcome: string;
}

export function AcceptInviteForm({ token, labels }: { token: string; labels: AcceptInviteLabels }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptInviteAction({ token });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(labels.welcome);
      // Full reload so the (app) layout re-resolves the user's active org
      // and the new session takes effect everywhere.
      window.location.assign("/dashboard");
    });
  }

  function decline() {
    router.push("/dashboard");
  }

  return (
    <div className="flex gap-2 pt-1">
      <Button onClick={accept} disabled={pending} className="flex-1">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {labels.accept}
      </Button>
      <Button variant="ghost" onClick={decline} disabled={pending}>
        {labels.decline}
      </Button>
    </div>
  );
}
