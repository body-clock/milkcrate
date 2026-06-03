export interface CrateWindowSlot<TRecord> {
  record: TRecord;
  index: number;
  offset: number;
  isActive: boolean;
}

const DEFAULT_BUILD_RADIUS = 2;

function clampIndex(index: number, max: number): number {
  return Math.min(Math.max(index, 0), max);
}

// eslint-disable-next-line eslint/max-lines-per-function
export function buildCrateWindow<TRecord>(
  records: TRecord[],
  activeIndex: number,
  radius = DEFAULT_BUILD_RADIUS,
): CrateWindowSlot<TRecord>[] {
  if (records.length === 0) {
    return [];
  }

  const lastIndex = records.length - 1;
  const clampedIndex = clampIndex(activeIndex, lastIndex);
  const start = clampIndex(clampedIndex - radius, lastIndex);
  const end = clampIndex(clampedIndex + radius, lastIndex);

  return Array.from({ length: end - start + 1 }, (_, i) => {
    const index = start + i;
    return {
      record: records[index],
      index,
      offset: index - clampedIndex,
      isActive: index === clampedIndex,
    };
  });
}
