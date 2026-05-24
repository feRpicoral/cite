"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-input bg-background focus-within:border-ring focus-within:ring-ring/30 flex items-end gap-2 rounded-2xl border px-3 py-2 shadow-sm transition-shadow focus-within:ring-3"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Ask a question…"
        className="placeholder:text-muted-foreground max-h-40 min-h-[36px] w-full resize-none border-0 bg-transparent px-1 py-1.5 text-sm outline-none"
      />
      <Button
        type="submit"
        size="icon-sm"
        disabled={disabled || value.trim().length === 0}
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </form>
  );
}
