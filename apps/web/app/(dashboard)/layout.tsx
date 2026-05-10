"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Activity,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { createApiClient } from "@/lib/api-client";
import { RetriggerBanner } from "@/components/compliance/RetriggerBanner";

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
          "h-2.5 w-2.5 rounded-full",
          running ? "bg-orange-400 animate-dot-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "bg-white/20"
        )}
      />
      <span className="tracking-wider">{running ? "AGENTS ACTIVE" : "AGENTS IDLE"}</span>
    </div>
  );
}

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const N = 60;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(249,115,22,${0.12 * (1 - dist / 160)})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${p.alpha})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const pathname = usePathname();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const ws = useWebSocket({ url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001/ws/retrigger" });

  const [badges, setBadges] = useState<{ alerts: number; hitl: number }>({ alerts: 0, hitl: 0 });
  const [lastToastEvent, setLastToastEvent] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const st = await api.get<{ total_alerts: number; hitl_pending: number }>("/admin/stats");
        setBadges({ alerts: st.total_alerts ?? 0, hitl: st.hitl_pending ?? 0 });
      } catch {
        // ignore
      }
    };
    load();
  }, [api]);

  useEffect(() => {
    if (!ws.lastEvent) return;
    const eventKey = `${ws.lastEvent.event}-${(ws.lastEvent as Record<string, unknown>).timestamp ?? Date.now()}`;
    if (eventKey === lastToastEvent) return;
    setLastToastEvent(eventKey);

    if (ws.lastEvent.event === "regulation_change") {
      toast({
        title: "⚡ Regulation Change Detected",
        description: String(ws.lastEvent?.message ?? "A portal update triggered retriggering."),
      });
    }
  }, [ws.lastEvent, lastToastEvent, toast]);

  const bannerEvent =
    ws.lastEvent?.event === "regulation_change"
      ? {
          portal: ws.lastEvent.portal as string,
          affected_count: ws.lastEvent.affected_count as number,
          message: ws.lastEvent.message as string,
          delta_id: ws.lastEvent.delta_id as string,
        }
      : null;

  return (
    <div className="relative min-h-screen bg-[#080600] text-white">
      {/* ── Persistent particle background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <ParticleCanvas />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-gradient-radial from-orange-500/6 via-amber-500/3 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-[240px] w-[40vw] h-[35vh] bg-gradient-radial from-orange-600/5 to-transparent blur-3xl" />
        {/* Right-edge accent bars from the reference design */}
        <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-orange-500/30 via-amber-400/15 to-transparent" />
        <div className="absolute top-0 right-[5px] w-[1px] h-[55%] bg-gradient-to-b from-amber-400/20 to-transparent" />
      </div>
      <RetriggerBanner event={bannerEvent} />
      <div className="flex">
        {/* ─── Sidebar ─── */}
        <aside className="fixed inset-y-0 left-0 z-30 w-[240px] border-r border-orange-500/10 bg-gradient-to-b from-[#0e0900]/95 to-[#080600]/95 backdrop-blur-xl">
          <div className="px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-orange-400" />
                <div className="absolute inset-0 rounded-lg animate-pulse-glow opacity-40" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-none tracking-tight text-gradient-primary font-bold">RegGraph AI</div>
                <div className="mt-0.5 text-[10px] font-mono text-white/40 tracking-widest uppercase">Compliance OS</div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mx-4" />

          <nav className="px-2 py-3 space-y-0.5">
            {NAV.map(({ href, label, Icon, badgeKey }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-white border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                      : "text-white/50 hover:text-white/90 hover:bg-orange-500/[0.04] border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-all duration-300",
                      isActive ? "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "text-white/40 group-hover:text-orange-300/70"
                    )}
                  />
                  <span className="font-medium">{label}</span>
                  {badgeKey && badges[badgeKey] > 0 && (
                    <span className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold",
                      badgeKey === "hitl"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/20"
                    )}>
                      {badges[badgeKey]}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]">
            <div className="text-[10px] font-mono text-white/30 tracking-wider">
              RGAI v1.0 · {ws.isConnected ? "WS ✓" : "WS ✗"}
            </div>
          </div>
        </aside>

        {/* ─── Main ─── */}
        <div className="relative z-10 ml-[240px] flex min-h-screen w-[calc(100%-240px)] flex-col">
          <header className="sticky top-0 z-20 border-b border-orange-500/10 bg-[#080600]/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-5">
                <AgentStatusIndicator running={ws.isConnected} />
                <div className="h-4 w-px bg-white/10" />
                <div className="font-mono text-[11px] text-white/40 max-w-[400px] truncate">
                  {ws.lastEvent
                    ? `${ws.lastEvent.event}${ws.lastEvent.portal ? ` · ${ws.lastEvent.portal}` : ""}`
                    : "awaiting events…"}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative rounded-lg p-2 hover:bg-white/[0.04] transition-colors">
                  <Bell className="h-4 w-4 text-white/50" />
                  {badges.alerts > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-orange-500 px-1 text-[10px] font-mono font-bold flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.4)]">
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
