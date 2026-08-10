import { createFileRoute, redirect } from "@tanstack/react-router";
import { Volume2, VolumeX, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/ui/reveal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStoredAuth, useAuth } from "@/lib/auth-store";
import { usePlayer } from "@/lib/player-store";
import { useTheme } from "@/lib/theme-store";
import { sound } from "@/lib/sound";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    const auth = getStoredAuth();
    if (!auth) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Settings - GamiBar" },
      { name: "description", content: "Manage your GamiBar account, gameplay and notification preferences." },
      { property: "og:title", content: "Settings - GamiBar" },
      { property: "og:description", content: "Account, gameplay and notification preferences." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const { player } = usePlayer();
  const { isDark, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(() => !sound.getIsMuted());
  const [reducedMotion, setReducedMotion] = useState(false);
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);

  const handleSoundToggle = (enabled: boolean) => {
    const currentlyMuted = sound.getIsMuted();
    if (enabled !== !currentlyMuted) {
      sound.toggleMute();
    }
    setSoundEnabled(enabled);
    if (enabled) {
      sound.playSnap();
      toast.success("Sound effects enabled");
    } else {
      toast.info("Sound effects muted");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <PageHeader eyebrow="Settings" title="Preferences" subtitle="Tune how GamiBar behaves for you." />

      <Reveal className="panel mt-10 p-7">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" defaultValue={player.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user?.email ?? ""} readOnly />
          </div>
        </div>
        <Button className="mt-6" onClick={() => toast.success("Settings saved.")}>
          Save changes
        </Button>
      </Reveal>

      <Reveal delay={0.04} className="panel mt-4 p-7">
        <h2 className="font-semibold">Appearance</h2>
        <div className="mt-5 rounded-xl border border-border bg-elevated/50 p-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              {isDark ? (
                <Moon className="mt-0.5 size-5 text-[var(--gamibar-brand)]" />
              ) : (
                <Sun className="mt-0.5 size-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium">Dark mode</p>
                <p className="text-xs text-muted-foreground">
                  Switch the entire site to a dark theme for low-light environments.
                </p>
              </div>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={(enabled) => setTheme(enabled ? "dark" : "light")}
            />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.06} className="panel mt-4 p-7">
        <h2 className="font-semibold">Sound & audio</h2>
        <div className="mt-5 rounded-xl border border-border bg-elevated/50 p-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              {soundEnabled ? (
                <Volume2 className="mt-0.5 size-5 text-emerald-600" />
              ) : (
                <VolumeX className="mt-0.5 size-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">UI sound effects</p>
                <p className="text-xs text-muted-foreground">
                  Hover snaps, combo cues, XP chimes and completion sounds.
                </p>
              </div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={handleSoundToggle} />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="panel mt-4 p-7">
        <h2 className="font-semibold">Gameplay & notifications</h2>
        <div className="mt-5 divide-y divide-border">
          <ToggleRow
            label="Reduced motion"
            desc="Minimise background and transition animation."
            checked={reducedMotion}
            onChange={setReducedMotion}
          />
          <ToggleRow
            label="Weekly summary email"
            desc="Progress digest every Monday."
            checked={weeklyEmail}
            onChange={setWeeklyEmail}
          />
          {user?.role === "student" && (
            <ToggleRow
              label="Show me on the leaderboard"
              desc="Display your name in cohort rankings."
              checked={showOnLeaderboard}
              onChange={setShowOnLeaderboard}
            />
          )}
        </div>
      </Reveal>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
