import Row from "./row";

export default function TotalListingsRow({ count }: { count: number | null }) {
  return <Row dt="Total listings">{count?.toLocaleString() ?? "—"}</Row>;
}
