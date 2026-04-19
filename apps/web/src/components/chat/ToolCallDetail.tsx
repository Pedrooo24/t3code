import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "~/lib/utils";

export function ToolCallDetail({
  payload,
  className,
}: {
  payload: unknown;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const json = (() => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return "[unserializable payload]";
    }
  })();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className={cn("mt-1 rounded-md border border-border/40 bg-muted/20", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/30 px-2 py-1">
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/55">
          Raw payload
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/55 hover:text-foreground/75"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-2 py-1.5 font-mono text-[10px] leading-4 text-muted-foreground/85 wrap-break-word">
        {json}
      </pre>
    </div>
  );
}
