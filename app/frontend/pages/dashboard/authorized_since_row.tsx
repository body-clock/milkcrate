import Row from "./row";

function formatDate(dateStr: string | null, options: Intl.DateTimeFormatOptions): string {
  if (!dateStr) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, options).format(new Date(dateStr));
}

export default function AuthorizedSinceRow({ dateStr }: { dateStr: string | null }) {
  return (
    <Row dt="Authorized since">
      {formatDate(dateStr, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </Row>
  );
}
