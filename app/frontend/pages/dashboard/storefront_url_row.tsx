import Row from "./row";

export default function StorefrontUrlRow({ url }: { url: string }) {
  return (
    <Row dt="Storefront URL">
      <a href={url} className="text-mc-accent hover:opacity-80 transition-opacity">
        milkcrate.fm{url}
      </a>
    </Row>
  );
}
