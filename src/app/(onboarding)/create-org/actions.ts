"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { slugify } from "@/lib/slug";
import { createServerSupabase } from "@/lib/supabase/server";

const CreateOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export type CreateOrgState = { error?: string };

export async function createOrgAction(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const parsed = CreateOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid organization name." };
  }

  const slug = slugify(parsed.data.name);
  if (!slug) return { error: "Choose a name with at least one letter or number." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prisma = getPrisma();
  let org;
  try {
    org = await prisma.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        memberships: {
          create: { userId: user.id, role: "ADMIN" },
        },
      },
    });
  } catch (err) {
    // Unique violation on the slug — the URL is taken.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `The URL cite.app/${slug} is taken. Try a different name.` };
    }
    throw err;
  }

  await setActiveOrg(user.id, org.id);
  redirect("/dashboard");
}
