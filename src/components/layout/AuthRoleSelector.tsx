import { BookOpen, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth-store";

const roles = [
  { id: "student" as const, label: "Student", icon: GraduationCap },
  { id: "author" as const, label: "Author", icon: BookOpen },
];

export function AuthRoleSelector({
  value,
  onChange,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-full border border-[#E5E7EB] bg-[#F3F4F6] p-1">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#111111] shadow-sm transition-all duration-200 ease-out",
          value === "student" ? "left-1" : "left-[calc(50%+2px)]",
        )}
      />
      {roles.map((role) => {
        const active = value === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200",
              active ? "text-white" : "text-[#525252] hover:text-[#111111]",
            )}
          >
            <role.icon className="size-3.5" />
            {role.label}
          </button>
        );
      })}
    </div>
  );
}

export const ROLE_DEFAULTS: Record<UserRole, { email: string; password: string; portal: string }> = {
  student: {
    email: "student@gmail.com",
    password: "123456",
    portal: "Student Portal - games, XP & leaderboard",
  },
  author: {
    email: "author@gmail.com",
    password: "123456",
    portal: "Author Portal - quiz management & allocation",
  },
};
