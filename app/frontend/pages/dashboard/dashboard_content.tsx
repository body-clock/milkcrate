import type { DashboardProps } from "@/types/inertia";

import DashboardCards from "./dashboard_cards";

interface DashboardContentProps {
  store: DashboardProps["store"];
  showWelcome: boolean;
  setShowWelcome: (v: boolean) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

export default function DashboardContent(props: DashboardContentProps) {
  return <DashboardCards {...props} />;
}
