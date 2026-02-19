import type { ReactNode } from "react";
import { requirePremiumServer } from "@/lib/premiumGate";

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  await requirePremiumServer("/messages");

  return children;
}
