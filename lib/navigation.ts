import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  MessagesSquare,
  Package,
  Megaphone,
  Palette,
  ScanEye,
  Bot,
  Workflow,
  Wallet,
  ChartNoAxesCombined,
  Plug,
  History,
  Settings,
  Store,
  Telescope,
  Mail,
  SlidersHorizontal,
  GitBranch,
  Brain,
} from "lucide-react";
export const navigation = [
  {
    label: "Home",
    items: [{ name: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Build",
    items: [
      { name: "Store", href: "/store", icon: Store },
      { name: "Products", href: "/products", icon: Package },
      { name: "Research", href: "/research", icon: Telescope },
    ],
  },
  {
    label: "Run",
    items: [
      { name: "Orders", href: "/orders", icon: ShoppingBag },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Inbox", href: "/inbox", icon: MessagesSquare },
    ],
  },
  {
    label: "Grow",
    items: [
      { name: "Ads", href: "/ads", icon: Megaphone },
      { name: "Creatives", href: "/creatives", icon: Palette },
      { name: "Competitors", href: "/competitors", icon: ScanEye },
      { name: "Marketing", href: "/marketing", icon: Mail },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Brain", href: "/brain", icon: Brain },
      {
        name: "Control Center",
        href: "/control-center",
        icon: SlidersHorizontal,
      },
      { name: "Flows", href: "/flows", icon: GitBranch },
      { name: "AI Team", href: "/ai-team", icon: Bot },
      { name: "Automations", href: "/automations", icon: Workflow },
    ],
  },
  {
    label: "Money",
    items: [
      { name: "Finance", href: "/finance", icon: Wallet },
      { name: "Reports", href: "/reports", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "Manage",
    items: [
      { name: "Integrations", href: "/integrations", icon: Plug },
      { name: "Activity", href: "/activity", icon: History },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
