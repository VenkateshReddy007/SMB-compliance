"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { createApiClient } from "@/lib/api-client";

type AgentRow = { agent_did: string; agent_name: string; action_count: number };

const AGENTS = ["IRDA", "DRCA", "COCE", "CAAL", "HITL", "GST Agent", "Payroll Agent"] as const;

const AGENT_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
  irda: { dot: "bg-blue-400", border: "border-blue-500/15", bg: "from-blue-500/[0.06] to-transparent" },
  drca: { dot: "bg-emerald-400", border: "border-emerald-500/15", bg: "from-emerald-500/[0.06] to-transparent" },
  coce: { dot: "bg-orange-400", border: "border-orange-500/15", bg: "from-orange-500/[0.06] to-transparent" },
  caal: { dot: "bg-purple-400", border: "border-purple-500/15", bg: "from-purple-500/[0.06] to-transparent" },
  hitl: { dot: "bg-amber-400", border: "border-amber-500/15", bg: "from-amber-500/[0.06] to-transparent" },
  gst: { dot: "bg-cyan-400", border: "border-cyan-500/15", bg: "from-cyan-500/[0.06] to-transparent" },
  payroll: { dot: "bg-pink-400", border: "border-pink-500/15", bg: "from-pink-500/[0.06] to-transparent" },
};

export function AgentStatusPanel() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const [rows, setRows] = useState<AgentRow[]>([]);

  useEffect(() => {
    api.get<AgentRow[]>("/audit/agents").then(setRows).catch(() => setRows([]));
  }, [api]);

  const didByName = useMemo(() => {
    const map = new Map<string, AgentRow>();
    for (const r of rows) map.set(r.agent_name.toLowerCase(), r);
    return map;
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
      {AGENTS.map((name, idx) => {
        const key = name.toLowerCase().split(" ")[0];
        const r = didByName.get(key);
        const style = AGENT_STYLES[key] ?? AGENT_STYLES.irda;
        const didAbbrev = r?.agent_did ? `${r.agent_did.slice(0, 18)}…` : "—";
        const active = (r?.action_count ?? 0) > 0;

        return (
          <Card
            key={name}
            className={`border bg-gradient-to-br ${style.bg} ${style.border} p-3 animate-fade-in-up`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/80">{name}</span>
              <span className={`h-2 w-2 rounded-full ${active ? style.dot : "bg-white/15"} ${active ? "animate-dot-pulse" : ""}`} />
            </div>
            <div className="mt-1.5 text-[9px] font-mono text-white/25 truncate">{didAbbrev}</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-white/30">actions</span>
              <span className="font-mono text-sm font-semibold">{r?.action_count ?? 0}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
