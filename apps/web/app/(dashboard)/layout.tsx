"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bell,
  Calendar,
  FileText,
  GitBranch,
  Home,
  Lock,
  MessageCircle,
  Settings,
  Shield,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "alerts" | "hitl";
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: Home },
  { href: "/compliance-feed", label: "Compliance Feed", Icon: Bell, badgeKey: "alerts" },
  { href: "/obligation-graph", label: "Obligation Graph", Icon: GitBranch },
  { href: "/gst-filing", label: "GST Filing", Icon: FileText },
  { href: "/payroll", label: "Payroll", Icon: Calendar },
  { href: "/assistant", label: "AI Assistant", Icon: MessageCircle },
  { href: "/hitl", label: "HITL Approvals", Icon: Shield, badgeKey: "hitl" },
  { href: "/audit-trail", label: "Audit Trail", Icon: Lock },
  { href: "/admin", label: "Admin Panel", Icon: Settings },
];

function AgentStatusIndicator({ running }: { running: boolean }) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-white/70">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          running ? "bg-emerald-400 animate-pulse" : "bg-white/30"
        )}
      />
      <span>{running ? "AGENTS: RUNNING" : "AGENTS: IDLE"}</span>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const ws = useWebSocket({ url: "ws://localhost:8000/ws/retrigger" });

  const badges = useMemo(() => ({ alerts: 0, hitl: 0 }), []);

  if (ws.lastEvent?.event === "regulation_change") {
    toast({
      title: "Regulation change detected",
      description: String(ws.lastEvent?.message ?? "A portal update triggered retriggering."),
    });
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 w-[240px] border-r border-white/10 bg-black/30 backdrop-blur">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center font-mono">
                R
              </div>
              <div>
                <div className="text-sm font-semibold leading-none">RegGraph AI</div>
                <div className="text-[11px] font-mono text-white/50">Autonomous Compliance OS</div>
              </div>
            </div>
          </div>
          <nav className="px-2 py-2">
            {NAV.map(({ href, label, Icon, badgeKey }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <Icon className="h-4 w-4 text-white/60 group-hover:text-[#3b82f6]" />
                <span>{label}</span>
                {badgeKey && badges[badgeKey] > 0 && (
                  <span className="ml-auto rounded-full bg-[#3b82f6] px-2 py-0.5 text-xs font-mono">
                    {badges[badgeKey]}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="ml-[240px] flex min-h-screen w-[calc(100%-240px)] flex-col">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono text-white/60">
                  {ws.lastEvent ? `WS: ${ws.lastEvent.event}` : "WS: —"}
                </div>
                <AgentStatusIndicator running={ws.isConnected} />
              </div>
              <div className="flex items-center gap-4">
                <button className="relative rounded-md p-2 hover:bg-white/5">
                  <Bell className="h-4 w-4 text-white/70" />
                  {badges.alerts > 0 && (
                    <span className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-[#3b82f6] px-1 text-[11px] font-mono flex items-center justify-center">
                      {badges.alerts}
                    </span>
                  )}
                </button>
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

