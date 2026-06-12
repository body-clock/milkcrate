import { FlashBanner } from "./flash_banner";

export function FlashBannerIfNotice({ notice, alert }: { notice?: string; alert?: string }) {
  if (!notice && !alert) {
    return null;
  }
  return <FlashBanner notice={notice} alert={alert} />;
}
