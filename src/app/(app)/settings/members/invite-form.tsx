"use client";

import { Check, Copy, Link2, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createInviteAction } from "./actions";

export function InviteMemberForm() {
  const router = useRouter();
  const t = useTranslations("settings.members.invite");
  const tRole = useTranslations("settings.role");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submit() {
    startTransition(async () => {
      const result = await createInviteAction({
        email: email.trim() === "" ? undefined : email.trim(),
        role,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUrl(result.url);
      setEmail("");
      setCopied(false);
      router.refresh();
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Two explicit rows (labels, then controls) so labels stay aligned and
            controls hug them even if a password manager inflates the email
            input's height — column-level item heights can't bleed across. */}
        <div className="grid grid-cols-1 items-start gap-x-3 gap-y-2 sm:grid-cols-[1fr_9rem_auto]">
          <Label htmlFor="invite-email" className="sm:col-start-1 sm:row-start-1">
            {t("emailLabel")}
          </Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            placeholder={t("emailPlaceholder")}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="self-start sm:col-start-1 sm:row-start-2"
          />
          <Label htmlFor="invite-role" className="sm:col-start-2 sm:row-start-1">
            {t("roleLabel")}
          </Label>
          <div className="self-start sm:col-start-2 sm:row-start-2">
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
              disabled={pending}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{tRole("MEMBER")}</SelectItem>
                <SelectItem value="ADMIN">{tRole("ADMIN")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={submit}
            disabled={pending}
            className="self-start sm:col-start-3 sm:row-start-2"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t("generate")}
          </Button>
        </div>

        {url && (
          <div className="bg-muted/40 border-border flex items-center gap-2 rounded-lg border px-3 py-2">
            <Link2 className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
              {url}
            </span>
            <span className="text-muted-foreground hidden shrink-0 font-mono text-[10px] sm:inline">
              {t("expiresIn")}
            </span>
            <Button
              variant={copied ? "secondary" : "outline"}
              size="sm"
              onClick={copy}
              className={copied ? "text-success" : undefined}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
