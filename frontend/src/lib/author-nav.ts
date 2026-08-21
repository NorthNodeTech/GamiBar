import { CreditCard, Gamepad2, Home, QrCode, Trophy, Wrench, type LucideIcon } from "lucide-react";

export type AuthorNavItem = {
  to: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  showInBottomNav?: boolean;
};

export const authorNavItems: AuthorNavItem[] = [
  {
    to: "/author",
    label: "Home",
    icon: Home,
    match: (pathname) => pathname === "/author" || pathname === "/author/",
    showInBottomNav: true,
  },
  {
    to: "/author/tools",
    label: "Tools",
    icon: Wrench,
    match: (pathname) =>
      pathname.startsWith("/author/tools") || pathname.startsWith("/author/create"),
    showInBottomNav: true,
  },
  {
    to: "/qr-file",
    label: "QRFile",
    mobileLabel: "QRFile",
    icon: QrCode,
    match: (pathname) => pathname.startsWith("/qr-file") || pathname.startsWith("/author/qr-file"),
    showInBottomNav: false,
  },
  {
    to: "/author/sessions",
    label: "My sessions",
    mobileLabel: "My sessions",
    icon: Gamepad2,
    match: (pathname) => pathname.startsWith("/author/sessions"),
    showInBottomNav: true,
  },
  {
    to: "/author/billing",
    label: "Billing",
    icon: CreditCard,
    match: (pathname) => pathname.startsWith("/author/billing"),
    showInBottomNav: false,
  },
  {
    to: "/author/participated",
    label: "Participated games",
    mobileLabel: "Participated",
    icon: Trophy,
    match: (pathname) => pathname.startsWith("/author/participated"),
    showInBottomNav: true,
  },
];

export const authorBottomNavItems = authorNavItems.filter((item) => item.showInBottomNav);
export const authorQrNavItem = authorNavItems.find((item) => item.to === "/qr-file")!;
