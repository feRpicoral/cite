"use client";

import { FileText, LayoutDashboard, LogOut, MessagesSquare, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { signOutAction } from "@/components/sign-out-action";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  user: { email: string; name: string | null };
  org: { name: string };
}

export function AppSidebar({ user, org }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("app.nav");

  const items = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/documents", label: t("documents"), icon: FileText },
    { href: "/conversations", label: t("conversations"), icon: MessagesSquare },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  const initials = (user.name ?? user.email)
    .split(/[\s.@]+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-3">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-sm font-semibold">{org.name}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 px-3 pb-3">
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LocaleSwitcher />
          <div className="flex-1" />
          <form action={signOutAction}>
            <Button variant="ghost" size="icon-sm" type="submit" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <Separator />
        <div className="flex items-center gap-2 px-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col text-xs">
            <span className="truncate font-medium">{user.name ?? user.email.split("@")[0]}</span>
            <span className="text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
