import { PriceAndActions } from "@/components/price_and_actions";
import { RecordMeta } from "@/components/record_meta";
import { ScoreSection } from "@/components/score_section";
import { TagPills } from "@/components/tag_pills";
import type { Listing } from "@/types/inertia";

const MAX_GENRES = 4;
const MAX_STYLES = 4;
const NOTES_CLASS = "text-xs text-mc-text-dim leading-relaxed line-clamp-4";

function buildTags(listing: Listing) {
  return [
    ...listing.genres.slice(0, MAX_GENRES).map((g) => ({ label: g, dim: false })),
    ...listing.styles.slice(0, MAX_STYLES).map((s) => ({ label: s, dim: true })),
  ];
}

function buildMeta(listing: Listing) {
  return [listing.format, listing.label, listing.year, listing.condition]
    .filter(Boolean)
    .join(" · ");
}

interface RecordDetailsContentProps {
  listing: Listing;
  inPile: boolean;
  addToPile: (r: Listing) => void;
  removeFromPile: (id: number) => void;
  showScore: boolean;
  onToggleScore: () => void;
}

export default function RecordDetailsContent(props: RecordDetailsContentProps) {
  return (
    <>
      <RecordMeta
        title={props.listing.title}
        artist={props.listing.artist}
        meta={buildMeta(props.listing)}
      />
      <TagPills tags={buildTags(props.listing)} />
      {props.listing.notes && <p className={NOTES_CLASS}>{props.listing.notes}</p>}
      <PriceAndActions
        listing={props.listing}
        inPile={props.inPile}
        onAdd={() => props.addToPile(props.listing)}
        onRemove={() => props.removeFromPile(props.listing.id)}
      />
      <ScoreSection show={props.showScore} listing={props.listing} onToggle={props.onToggleScore} />
    </>
  );
}
