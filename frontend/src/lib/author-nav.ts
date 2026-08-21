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
];

export const authorBottomNavItems = authorNavItems.filter((item) => item.showInBottomNav);
export const authorQrNavItem = authorNavItems.find((item) => item.to === "/qr-file")!;
