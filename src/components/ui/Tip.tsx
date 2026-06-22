"use client";

import { Tooltip } from "@base-ui/react/tooltip";

export function TipProvider({ children }: { children: React.ReactNode }) {
  return <Tooltip.Provider delay={300}>{children}</Tooltip.Provider>;
}

/** تلميح سريع حول عنصر (Base UI Tooltip). */
export default function Tip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<span className="inline-flex" />}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-[80]">
          <Tooltip.Popup className="rounded-md bg-mushar-dark px-2 py-1 text-[11px] font-medium text-white shadow-lg">
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
