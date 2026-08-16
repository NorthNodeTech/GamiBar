import { BarChart3, Gamepad2, Home, Trophy, Wrench, type LucideIcon } from "lucide-react";

export type AuthorNavItem = {
  to: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const authorNavItems: AuthorNavItem[] = [
  {
    to: "/author",
    label: "Home",
    icon: Home,
    match: (pathname) => pathname === "/author" || pathname === "/author/",
  },
  {
    to: "/author/tools",
    label: "Tools",
    icon: Wrench,
    match: (pathname) =>
      pathname.startsWith("/author/tools") || pathname.startsWith("/author/create"),
  },
  {
    to: "/author/sessions",
    label: "My sessions",
    mobileLabel: "My sessions",
    icon: Gamepad2,
    match: (pathname) => pathname.startsWith("/author/sessions"),
  },
  {
    to: "/author/reports",
    label: "Reports",
    mobileLabel: "Reports",
    icon: BarChart3,
    match: (pathname) => pathname.startsWith("/author/reports"),
  },
  {
    to: "/author/participated",
    label: "Participated games",
    mobileLabel: "Participated",
    icon: Trophy,
    match: (pathname) => pathname.startsWith("/author/participated"),
  },
];
