import Row from "./row";
import { formatLastSynced } from "./dates";

export default function LastSyncedRow({ dateStr }: { dateStr: string | null }) {
  return <Row dt="Last synced">{formatLastSynced(dateStr)}</Row>;
}
