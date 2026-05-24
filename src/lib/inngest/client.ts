import { eventType, Inngest, staticSchema } from "inngest";

export const documentUploaded = eventType("document/uploaded", {
  schema: staticSchema<{ orgId: string; documentId: string }>(),
});

export const inngest = new Inngest({ id: "cite" });
