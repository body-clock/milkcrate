import React from "react";
import { motion } from "framer-motion";
import RecordTile from "./record_tile";
import { useTactileHover } from "@/hooks/use_tactile_hover";
import { springTactile, springPress, SCALE_HOVER } from "@/lib/motion_tokens";
import type { Crate } from "../types/inertia";

interface BaseCrateShelfProps {
  crate: Crate;
  /** Maximum number of record thumbnails to show. Defaults to 4. */
  previewCount?: number;
  /** Optional meta text shown beside the crate name (e.g. today's date). */
  meta?: string;
  /** Optional explicit open-action label for touch-friendly affordance. */
  openLabel?: string;
  /** Header text size: "featured" (text-base) or "genre" (text-sm, default). */
  headerSize?: "featured" | "genre";
  /** When true, enables thumbnail hover scale on non-compact viewports. */
  tactileThumbnails?: boolean;
  /** Additional class for the outer container (used by CrateCard to strip border). */
  className?: string;
}

interface StaticCrateShelfProps extends BaseCrateShelfProps {
  interactive?: false;
  onSelectCrate?: never;
  isHovered?: never;
}

interface InteractiveCrateShelfProps extends BaseCrateShelfProps {
  interactive: true;
  /** Callback for crate selection. Receives slug and optional record index. */
  onSelectCrate: (slug: string, startIndex?: number) => void;
  /** External hover state override — when CrateCard wraps this shelf. */
  isHovered?: boolean;
}

export type CrateShelfProps = StaticCrateShelfProps | InteractiveCrateShelfProps;

// ── Shared layout skeleton ─────────────────────────────────────

function CrateShelfLayout({
  crate,
  previewCount,
  headerSize = "genre",
  meta,
  openLabel,
  isHovered,
  interactive,
  onSelectCrate,
  tactileThumbnails,
  gridCols,
  headerProps: { className: headerClassName, ...headerProps },
}: {
  crate: Crate;
  previewCount: number;
  headerSize?: "featured" | "genre";
  meta?: string;
  openLabel?: string;
  isHovered: boolean;
  interactive: boolean;
  onSelectCrate?: (slug: string, startIndex?: number) => void;
  tactileThumbnails: boolean;
  gridCols: number;
  headerProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const innerHoverScale = 1 + (SCALE_HOVER - 1) / 2;
  const nameClass = headerSize === "featured" ? "text-base font-semibold" : "text-sm font-semibold";

  const headerContent = (
    <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-1">
      <span className={`mc-section-name ${nameClass} truncate flex-1`}>{crate.name}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {interactive && openLabel ? (
          <motion.span
            className="text-[10px] text-mc-accent font-bold uppercase tracking-widest"
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -4 }}
            transition={springTactile}
          >
            {openLabel}
          </motion.span>
        ) : null}
        <span className="mc-section-count text-xs">{meta ?? crate.count}</span>
      </div>
    </div>
  );

  const handleSelectRecord = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCrate?.(crate.slug, index);
  };

  return (
    <>
      {/* Header */}
      <div className={`px-3 pt-3 pb-1.5 ${headerClassName ?? ""}`} {...headerProps}>
        {headerContent}
      </div>

      {/* Record grid */}
      {crate.records.length > 0 ? (
        <div
          className="grid gap-1.5 px-3 pb-3 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {crate.records.slice(0, previewCount).map((record, i) =>
            interactive ? (
              <button
                key={record.id}
                type="button"
                className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg-card"
                onClick={(e) => handleSelectRecord(i, e)}
                aria-label={`Open ${crate.name} at ${record.title ?? "record"}`}
              >
                <motion.div
                  animate={{ scale: isHovered ? innerHoverScale : 1 }}
                  transition={springTactile}
                >
                  <RecordTile
                    listing={record}
                    imageLoading="lazy"
                    tactileHover={tactileThumbnails}
                  />
                </motion.div>
              </button>
            ) : (
              <RecordTile key={record.id} listing={record} imageLoading="lazy" />
            ),
          )}
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center text-mc-text-dim text-xs px-3 pb-3">
          No records yet
        </div>
      )}
    </>
  );
}

function gridColumnCount(previewCount: number) {
  if (previewCount <= 4) return 2;
  if (previewCount <= 6) return 3;

  return 4;
}

// ── Static variant ──────────────────────────────────────────────

function StaticCrateShelf(params: StaticCrateShelfProps) {
  const {
    crate,
    previewCount = 4,
    meta,
    headerSize = "genre",
    tactileThumbnails = false,
    className,
  } = params;
  const gridCols = gridColumnCount(previewCount);
  const containerClassName = [
    "flex flex-col w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden text-left",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <CrateShelfLayout
        crate={crate}
        previewCount={previewCount}
        meta={meta}
        headerSize={headerSize}
        isHovered={false}
        interactive={false}
        tactileThumbnails={tactileThumbnails}
        gridCols={gridCols}
        headerProps={{}}
      />
    </div>
  );
}

// ── Interactive variant ─────────────────────────────────────────

function InteractiveCrateShelf(params: InteractiveCrateShelfProps) {
  const {
    crate,
    onSelectCrate,
    previewCount = 4,
    meta,
    openLabel,
    headerSize = "genre",
    tactileThumbnails = false,
    className,
    isHovered: externalHovered,
  } = params;
  const gridCols = gridColumnCount(previewCount);

  // When wrapped by CrateCard (or another parent that manages hover), use the
  // external hover state. Otherwise, compute our own.
  const ownsHover = externalHovered === undefined;
  const internal = useTactileHover();
  const isHovered = ownsHover ? internal.isHovered : externalHovered!;
  const isPressed = ownsHover ? internal.isPressed : false;
  const containerClassName = [
    "flex flex-col w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden text-left",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleSelectCrate = () => {
    onSelectCrate?.(crate.slug);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectCrate();
    }
  };

  return (
    <motion.div
      className={containerClassName}
      animate={{
        scale: isPressed ? 0.99 : isHovered ? 1.008 : 1,
      }}
      transition={isPressed ? springPress : springTactile}
      {...(ownsHover ? internal.handlers : {})}
    >
      <CrateShelfLayout
        crate={crate}
        previewCount={previewCount}
        meta={meta}
        openLabel={openLabel}
        headerSize={headerSize}
        isHovered={isHovered}
        interactive={true}
        onSelectCrate={onSelectCrate}
        tactileThumbnails={tactileThumbnails}
        gridCols={gridCols}
        headerProps={{
          role: "button",
          tabIndex: 0,
          onClick: handleSelectCrate,
          onKeyDown: handleKeyDown,
          className:
            "cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg-card",
          "aria-label": `Open ${crate.name}`,
        }}
      />
    </motion.div>
  );
}

// ── Public component ────────────────────────────────────────────

/**
 * A visual crate/shelf layout — name header + grid of RecordTile
 * thumbnails. Delegates to StaticCrateShelf or InteractiveCrateShelf
 * based on the `interactive` prop.
 */
export default function CrateShelf(props: CrateShelfProps) {
  if (props.interactive) {
    return <InteractiveCrateShelf {...props} />;
  }

  return <StaticCrateShelf {...props} />;
}
