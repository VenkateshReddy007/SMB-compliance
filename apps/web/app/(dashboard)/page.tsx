"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { useComplianceAlerts } from "@/hooks/useComplianceAlerts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceScore } from "@/components/compliance/ConfidenceScore";
import { AgentStatusPanel } from "@/components/agents/AgentStatusPanel";
import { Eye, Zap, ClipboardCheck } from "lucide-react";
import Link from "next/link";

type BusinessRow = {
  id: string;
  name: string;
  business_type?: string;
  state?: string;
  gst_registered?: boolean;
  pf_registered?: boolean;
  esi_registered?: boolean;
  fssai_registered?: boolean;
  pt_state?: string | null;
  total?: number;
  pending?: number;
  overdue?: number;
  compliant?: number;
  health_score?: number;
  last_updated?: string;
};

const AGENT_COLORS: Record<string, string> = {
  irda: "text-blue-400",
  drca: "text-emerald-400",
  coce: "text-orange-400",
  caal: "text-purple-400",
  hitl: "text-yellow-400",
  gst: "text-cyan-400",
  payroll: "text-pink-400",
};

function getAgentColor(name: string): string {
  const key = name.toLowerCase().split(/[\s_-]/)[0];
  return AGENT_COLORS[key] ?? "text-white/60";
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const ws = useWebSocket({ url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001/ws/retrigger" });

  const [businesses, setBusinesses] = useState<BusinessRow[] | null>(null);
  const [stats, setStats] = useState<{
    hitl_pending?: number;
    regulation_changes_24h?: number;
    total_alerts?: number;
    total_obligations?: number;
    caal_entries?: number;
    graph_nodes?: number;
  } | null>(null);

  const { entries, fetchLedger } = useAuditTrail();
  const firstBusinessId = businesses?.[0]?.id;
  const { alerts, unreadCount, refresh: refreshAlerts } = useComplianceAlerts(firstBusinessId, ws.lastEvent);

  const refresh = async () => {
    const [biz, st] = await Promise.all([api.get<BusinessRow[]>("/compliance/businesses"), api.get<any>("/admin/stats")]);
    setBusinesses(biz);
    setStats(st as any);
    await fetchLedger({ page: 1, pageSize: 20 });
    await refreshAlerts();
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ws.lastEvent) return;
    if (ws.lastEvent.event === "regulation_change" || ws.lastEvent.event === "hitl_escalation") {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.lastEvent]);

  const overdueCount = (businesses ?? []).reduce((acc, b) => acc + (b.overdue ?? 0), 0);
  const pendingCount = (businesses ?? []).reduce((acc, b) => acc + (b.pending ?? 0), 0);
  const compliantCount = (businesses ?? []).reduce((acc, b) => acc + (b.compliant ?? 0), 0);
  const healthAvg =
    businesses && businesses.length > 0
      ? businesses.reduce((acc, b) => acc + (b.health_score ?? 100), 0) / businesses.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 px-5 py-4 shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-shimmer">
        <div className="absolute inset-0 bg-white/[0.02]" />
        <div className="relative flex items-center gap-4">
          <span className="text-2xl animate-pulse">🎯</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-400 uppercase tracking-wider">Demo Mode Active</p>
            <p className="text-xs text-white/70 mt-0.5">Use the Admin Panel to trigger regulation changes and watch the Autonomous OS react in real time.</p>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: Agent Status Panel ─── */}
      <div className="animate-fade-in-up">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-mono text-white/40 tracking-widest uppercase">Agent Status</div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-dot-pulse" />
            <span className="text-xs font-mono text-white/40">
              {ws.lastEvent ? `Last: ${ws.lastEvent.event}` : "Awaiting events…"}
            </span>
          </div>
        </div>
        <AgentStatusPanel />
      </div>

      {/* ─── ROW 2: KPI Cards ─── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 animate-fade-in-up stagger-1">
        {/* Health Score */}
        <Card className="glass border-emerald-500/10 p-5 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.05] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="text-[10px] font-mono text-orange-400/80 tracking-widest uppercase">Compliance Health</div>
            <div className="mt-3 flex items-center justify-between">
              <ConfidenceScore score={(healthAvg ?? 0) / 100} size="lg" />
            </div>
            <div className="mt-2 text-[11px] font-mono text-white/40">
              avg across {businesses?.length ?? 0} businesses
            </div>
          </div>
        </Card>

        {/* Active Obligations */}
        <Card className="glass border-orange-500/10 p-5 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(249,115,22,0.2)] transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.06] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="text-[10px] font-mono text-blue-400/80 tracking-widest uppercase">Active Obligations</div>
            <div className="mt-3 text-3xl font-semibold font-mono text-white drop-shadow-md">{pendingCount + overdueCount}</div>
            <div className="mt-2 flex items-center gap-3 text-[11px] font-mono">
              <span className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">pending {pendingCount}</span>
              <span className="text-white/20">•</span>
              <span className="text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.5)]">overdue {overdueCount}</span>
              <span className="text-white/20">•</span>
              <span className="text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">done {compliantCount}</span>
            </div>
          </div>
        </Card>

        {/* HITL Queue */}
        <Card className="glass border-orange-500/10 p-5 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(249,115,22,0.2)] transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.05] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="text-[10px] font-mono text-amber-400/80 tracking-widest uppercase">HITL Queue</div>
            <div className="mt-3 text-3xl font-semibold font-mono text-white drop-shadow-md">{stats?.hitl_pending ?? 0}</div>
            <div className="mt-2">
              {stats?.hitl_pending && stats.hitl_pending > 0 ? (
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-dot-pulse" />
                  Requires Attention
                </span>
              ) : (
                <span className="text-[11px] font-mono text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">All clear ✓</span>
              )}
            </div>
          </div>
        </Card>

        {/* Regulation Changes */}
        <Card className="glass border-white/[0.06] p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent" />
          <div className="relative">
            <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">Reg Changes (24h)</div>
            <div className="mt-3 text-3xl font-semibold font-mono">{stats?.regulation_changes_24h ?? 0}</div>
            <div className="mt-2 text-[11px] font-mono text-white/30">via IRDA watcher</div>
          </div>
        </Card>
      </div>

      {/* ─── ROW 3: Feed + Activity ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-fade-in-up stagger-2">
        {/* Compliance Feed */}
        <Card className="glass border-white/[0.08] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gradient-primary">Live Compliance Feed</div>
              <div className="mt-0.5 text-[11px] font-mono text-white/40">{unreadCount} unread alerts</div>
            </div>
            <Link href="/compliance-feed" className="text-xs text-orange-400 hover:text-orange-300 font-mono">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-2">
            {!businesses ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full bg-white/[0.04]" />
                <Skeleton className="h-12 w-full bg-white/[0.04]" />
                <Skeleton className="h-12 w-full bg-white/[0.04]" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-sm text-white/30 text-center py-8">No alerts yet. Trigger a regulation change to see the cascade.</div>
            ) : (
              alerts.slice(0, 10).map((a, idx) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{a.title ?? "Alert"}</div>
                    <Badge
                      className={
                        a.is_read
                          ? "bg-white/[0.04] text-white/40 border-white/[0.06] text-[10px]"
                          : "bg-blue-500/15 text-blue-300 border-blue-500/20 text-[10px]"
                      }
                    >
                      {a.is_read ? "read" : "unread"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-[13px] text-white/50 line-clamp-1">{a.message}</div>
                  <div className="mt-1.5 text-[10px] font-mono text-white/25">{a.created_at}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Agent Activity Log */}
        <Card className="glass border-white/[0.08] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gradient-primary">Agent Activity (CAAL)</div>
            <Link href="/audit-trail" className="text-xs text-orange-400 hover:text-orange-300 font-mono">
              Full trail →
            </Link>
          </div>
          <div className="mt-4 space-y-1.5 max-h-[320px] overflow-y-auto pr-2 font-mono text-[11px]">
            {entries.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full bg-white/[0.04]" />
                <Skeleton className="h-8 w-full bg-white/[0.04]" />
                <Skeleton className="h-8 w-full bg-white/[0.04]" />
              </div>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="rounded-md border border-white/[0.04] bg-white/[0.02] px-2.5 py-2">
                  <div className="text-white/25 text-[10px]">{e.timestamp}</div>
                  <div className="mt-0.5">
                    <span className={getAgentColor(e.agent_name)}>[{e.agent_name}]</span>{" "}
                    <span className="text-white/60">{e.action_type}</span>{" "}
                    {e.business_id && (
                      <span className="text-white/25 text-[10px]">{String(e.business_id).slice(0, 8)}…</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ─── ROW 4: Business Table ─── */}
      <Card className="glass border-white/[0.08] p-5 animate-fade-in-up stagger-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gradient-primary">Business Compliance Table</div>
            <div className="mt-0.5 text-[11px] font-mono text-white/40">{businesses?.length ?? 0} demo businesses</div>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          {!businesses ? (
            <Skeleton className="h-24 w-full bg-white/[0.04]" />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] font-mono text-white/30 tracking-wider uppercase">
                <tr>
                  <th className="py-2 pr-4">Business</th>
                  <th className="pr-4">Type</th>
                  <th className="pr-4">State</th>
                  <th className="pr-2">GST</th>
                  <th className="pr-2">PF</th>
                  <th className="pr-2">FSSAI</th>
                  <th className="pr-2">PT</th>
                  <th className="pr-4">Obligations</th>
                  <th className="pr-4 min-w-[160px]">Health</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => {
                  const health = Math.round(b.health_score ?? 0);
                  const healthColor =
                    health > 80 ? "bg-emerald-500" : health > 50 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <tr key={b.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4 font-medium">{b.name}</td>
                      <td className="pr-4 text-white/50 text-xs">{b.business_type}</td>
                      <td className="pr-4 text-white/50 text-xs font-mono">{b.state}</td>
                      <td className="pr-2">{b.gst_registered ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                      <td className="pr-2">{b.pf_registered ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                      <td className="pr-2">{b.fssai_registered ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                      <td className="pr-2">{b.pt_state ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                      <td className="pr-4 font-mono text-[11px]">
                        <span className="text-emerald-400">{b.compliant ?? 0}</span>
                        <span className="text-white/15"> / </span>
                        <span className="text-amber-400">{b.pending ?? 0}</span>
                        <span className="text-white/15"> / </span>
                        <span className="text-red-400">{b.overdue ?? 0}</span>
                      </td>
                      <td className="pr-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full ${healthColor} transition-all duration-500`} style={{ width: `${health}%` }} />
                          </div>
                          <span className="font-mono text-[11px] text-white/40 w-8 text-right">{health}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/obligation-graph`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white/60">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/compliance-feed`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white/60">
                              <Zap className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/gst-filing`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white/60">
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ─── ROW 5: Quick Stats ─── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-fade-in-up stagger-4">
        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">GST Readiness Avg</div>
          <div className="mt-2 text-2xl font-semibold font-mono">
            {businesses
              ? `${Math.round(
                  (businesses.filter((b) => b.gst_registered).reduce((a, b) => a + (b.health_score ?? 0), 0) /
                    Math.max(businesses.filter((b) => b.gst_registered).length, 1))
                )}%`
              : "—"}
          </div>
          <div className="mt-1 text-[11px] font-mono text-white/25">
            {businesses?.filter((b) => b.gst_registered).length ?? 0} GST-registered businesses
          </div>
        </Card>
        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">PF Due Dates (Month)</div>
          <div className="mt-2 text-2xl font-semibold font-mono">
            {businesses?.filter((b) => b.pf_registered).length ?? 0}
          </div>
          <div className="mt-1 text-[11px] font-mono text-white/25">
            businesses with PF obligations this month
          </div>
        </Card>
        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase">CAAL Entries</div>
          <div className="mt-2 text-2xl font-semibold font-mono">{stats?.caal_entries ?? entries.length}</div>
          <div className="mt-1 text-[11px] font-mono text-white/25">total audit ledger entries</div>
        </Card>
      </div>
    </div>
  );
}
