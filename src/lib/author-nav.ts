import { Gamepad2, Home, Plus, Trophy, type LucideIcon } from "lucide-react";

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
    label: "Create",
    icon: Plus,
    match: (pathname) => pathname.startsWith("/author/create"),
  },
  {
    to: "/author/sessions",
    label: "My Games",
    mobileLabel: "My Games",
    icon: Gamepad2,
    match: (pathname) => pathname.startsWith("/author/sessions"),
  },
  {
    to: "/author/participated",
    label: "Participated Games",
    mobileLabel: "Participated",
    icon: Trophy,
    match: (pathname) => pathname.startsWith("/author/participated"),
  },
];
