"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

const CreateOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export type CreateOrgState = { error?: string };

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // Slug must be unique; suffix a short random tail to avoid collisions on
  // common names ("acme", "personal") without forcing a UI dedupe loop.
  const tail = Math.random().toString(36).slice(2, 6);
  return `${base || "org"}-${tail}`;
}

export async function createOrgAction(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const parsed = CreateOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid organization name." };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prisma = getPrisma();
  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      memberships: {
        create: { userId: user.id, role: "ADMIN" },
      },
    },
  });

  await setActiveOrg(user.id, org.id);
  redirect("/dashboard");
}
