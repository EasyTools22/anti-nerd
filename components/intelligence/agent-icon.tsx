import {
  Store,
  Telescope,
  Megaphone,
  Palette,
  MessagesSquare,
  Wallet,
  Package,
  ScanEye,
  Bot,
} from "lucide-react";
const icons = {
  store: Store,
  research: Telescope,
  ads: Megaphone,
  creative: Palette,
  support: MessagesSquare,
  finance: Wallet,
  operations: Package,
  competitor: ScanEye,
};
export function AgentIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = icons[id as keyof typeof icons] ?? Bot;
  return <Icon size={size} />;
}
