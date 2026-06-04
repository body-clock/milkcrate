import { formatLastSynced } from "./dates";
import Row from "./row";

export default function LastSyncedRow({ dateStr }: { dateStr: string | null }) {
  return <Row dt="Last synced">{formatLastSynced(dateStr)}</Row>;
}
