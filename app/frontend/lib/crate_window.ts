export interface CrateWindowSlot<TRecord> {
  record: TRecord
  index: number
  offset: number
  isActive: boolean
}

const DEFAULT_BUILD_RADIUS = 2

export function buildCrateWindow<TRecord>(
  records: TRecord[],
  activeIndex: number,
  radius = DEFAULT_BUILD_RADIUS,
): CrateWindowSlot<TRecord>[] {
  if (records.length === 0) {return []}

  const clampedIndex = Math.min(Math.max(activeIndex, 0), records.length - 1)
  const start = Math.max(0, clampedIndex - radius)
  const end = Math.min(records.length - 1, clampedIndex + radius)

  const slots: CrateWindowSlot<TRecord>[] = []
  for (let index = start; index <= end; index += 1) {
    slots.push({
      record: records[index],
      index,
      offset: index - clampedIndex,
      isActive: index === clampedIndex,
    })
  }

  return slots
}
