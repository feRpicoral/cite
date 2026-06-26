export default function ConversationLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="h-14 shrink-0 border-b" />
      <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
        <span className="animate-cite-spin size-4 rounded-full border-2 border-current border-t-transparent" />
      </div>
    </div>
  );
}
