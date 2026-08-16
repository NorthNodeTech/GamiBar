import { BarChart3, Gamepad2, Home, Plus, Trophy, type LucideIcon } from "lucide-react";

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
    to: "/author/create",
    label: "Tools",
    icon: Plus,
    match: (pathname) => pathname.startsWith("/author/create"),
  },
  {
    to: "/author/sessions",
    label: "Sessions",
    mobileLabel: "Sessions",
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
    label: "History",
    mobileLabel: "History",
    icon: Trophy,
    match: (pathname) => pathname.startsWith("/author/participated"),
  },
];
