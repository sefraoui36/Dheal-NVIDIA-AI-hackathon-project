import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  children: ReactNode;
  title?: string;
  side?: "top" | "bottom" | "left" | "right";
  size?: number;
}

export function InfoTip({ children, title, side = "top", size = 14 }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // compute position when opening
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 288; // 18rem
    const POPOVER_H = 160; // approximate; used for flipping

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = rect.top - 8; // bottom of popover aligns here
        left = rect.left + rect.width / 2 - POPOVER_W / 2;
        break;
      case "bottom":
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - POPOVER_W / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - POPOVER_H / 2;
        left = rect.left - POPOVER_W - 8;
        break;
      case "right":
        top = rect.top + rect.height / 2 - POPOVER_H / 2;
        left = rect.right + 8;
        break;
    }

    // keep inside viewport
    left = Math.max(12, Math.min(left, window.innerWidth - POPOVER_W - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - POPOVER_H - 12));

    setCoords({ top, left });
  }, [open, side]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="More information"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="text-secondary/70 hover:text-secondary transition-colors cursor-help flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: size }}>
          info
        </span>
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: 288,
              zIndex: 9999,
            }}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl p-3 text-left"
          >
            {title && (
              <div className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                {title}
              </div>
            )}
            <div className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
              {children}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}