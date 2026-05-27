import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACE_TABLE_WRAP } from "@/features/admin/admin-interaction-classes";

export const ADMIN_VIRTUAL_ROW_THRESHOLD = 25;
const DEFAULT_ROW_HEIGHT = 56;
const OVERSCAN = 5;

type AdminScrollableTableProps<T> = {
  items: T[];
  minWidth: string;
  head: ReactNode;
  getRowKey: (item: T, index: number) => string | number;
  renderRow: (item: T, index: number) => ReactNode;
  rowHeight?: number;
  virtualThreshold?: number;
  maxHeight?: number;
  className?: string;
  tableClassName?: string;
};

function AdminScrollableTableInner<T>({
  items,
  minWidth,
  head,
  getRowKey,
  renderRow,
  rowHeight = DEFAULT_ROW_HEIGHT,
  virtualThreshold = ADMIN_VIRTUAL_ROW_THRESHOLD,
  maxHeight = 560,
  className,
  tableClassName,
}: AdminScrollableTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  const useVirtual = items.length > virtualThreshold;

  const windowSlice = useMemo(() => {
    if (!useVirtual) {
      return { start: 0, end: items.length, paddingTop: 0, paddingBottom: 0 };
    }
    const visible = Math.ceil(maxHeight / rowHeight) + OVERSCAN;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - Math.floor(OVERSCAN / 2));
    const end = Math.min(items.length, start + visible);
    return {
      start,
      end,
      paddingTop: start * rowHeight,
      paddingBottom: Math.max(0, (items.length - end) * rowHeight),
    };
  }, [items.length, maxHeight, rowHeight, scrollTop, useVirtual]);

  const visibleItems = useMemo(
    () => (useVirtual ? items.slice(windowSlice.start, windowSlice.end) : items),
    [items, useVirtual, windowSlice.end, windowSlice.start],
  );

  return (
    <div
      ref={scrollRef}
      onScroll={useVirtual ? onScroll : undefined}
      className={cn(SURFACE_TABLE_WRAP, useVirtual && "overflow-auto", className)}
      style={useVirtual ? { maxHeight } : undefined}
    >
      <table className={cn("w-full text-sm", minWidth, tableClassName)}>
        <thead
          className={cn(
            "border-b border-primary/25 bg-zinc-900/50 text-muted-foreground",
            useVirtual && "sticky top-0 z-10 shadow-[0_1px_0_0_hsl(var(--primary)/0.2)]",
          )}
        >
          {head}
        </thead>
        <tbody>
          {useVirtual && windowSlice.paddingTop > 0 ? (
            <tr aria-hidden style={{ height: windowSlice.paddingTop }}>
              <td colSpan={100} />
            </tr>
          ) : null}
          {visibleItems.map((item, i) => {
            const index = useVirtual ? windowSlice.start + i : i;
            return <FragmentRow key={getRowKey(item, index)}>{renderRow(item, index)}</FragmentRow>;
          })}
          {useVirtual && windowSlice.paddingBottom > 0 ? (
            <tr aria-hidden style={{ height: windowSlice.paddingBottom }}>
              <td colSpan={100} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const AdminScrollableTable = memo(AdminScrollableTableInner) as typeof AdminScrollableTableInner;
