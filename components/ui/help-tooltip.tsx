"use client";

import { Button } from "@/components/ui/button";

import { useId, useState } from "react";

type HelpTooltipProps = {
  label: string;
  text: string;
  align?: "left" | "right";
};

// Small "?" control used next to form labels. It opens on hover for mouse and
// on focus for keyboard; touch and pen toggle it on pointer-down, so the first
// tap opens it instead of being cancelled by the focus event.
export function HelpTooltip({ label, text, align = "left" }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center">
      <Button variant="ghost" size="sm"
        type="button"
        aria-label={`Ayuda: ${label}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") {
            setOpen((current) => !current);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex! min-h-5! h-5! w-5! items-center! justify-center! rounded-full! border! border-border-control! bg-surface! text-xs! font-bold! text-fg-muted! hover:bg-surface-tint! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!"
      >
        ?
      </Button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute top-full z-30 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-[10px] border border-border-control bg-surface p-2 text-left text-xs font-normal text-fg shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
