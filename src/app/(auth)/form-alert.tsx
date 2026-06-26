import { CircleAlert } from "lucide-react";

export function FormAlert({ title, body }: { title: React.ReactNode; body?: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="bg-destructive/8 ring-destructive/25 flex items-start gap-2.5 rounded-lg p-3 text-left ring-1"
    >
      <CircleAlert className="text-destructive mt-px size-4 shrink-0" strokeWidth={2.2} />
      <div className="space-y-0.5">
        <p className="text-destructive text-[13px] font-semibold">{title}</p>
        {body && <p className="text-destructive/80 text-xs leading-snug">{body}</p>}
      </div>
    </div>
  );
}
