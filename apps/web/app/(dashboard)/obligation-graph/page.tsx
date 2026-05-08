"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { KGVisualization } from "@/components/graph/KGVisualization";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type GraphNode = {
  node_id: string;
  domain: string;
  title: string;
  description: string;
  regulation_id: string;
  threshold_type: string;
  threshold_value: unknown;
  due_date_rule: string;
  version: number;
  source_portal: string;
  applies_to_business_types?: string[];
  applies_to_states?: string[];
};

type GraphEdge = { source: string; target: string; edge_type?: string };

const DOMAIN_BADGE_COLORS: Record<string, string> = {
  GST: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PF: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  ESI: "bg-teal-500/15 text-teal-300 border-teal-500/20",
  FSSAI: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  PT: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  TDS: "bg-red-500/15 text-red-300 border-red-500/20",
};

const BUSINESS_TYPES = ["all", "food_business", "it_services", "manufacturing", "retail", "healthcare", "logistics"];
const STATES = ["all", "MH", "KA", "GJ", "WB", "TN"];

export default function ObligationGraphPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [highlightRecent, setHighlightRecent] = useState<boolean>(true);
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>([]);
  const [businessType, setBusinessType] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [domains, setDomains] = useState<Record<string, boolean>>({
    GST: true, PF: true, ESI: true, FSSAI: true, PT: true, TDS: true,
  });

  useEffect(() => {
    api.get<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/knowledge/graph").then(setGraph);
  }, [api]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const deltas = await api.get<any[]>("/admin/deltas");
        const changedRegs = new Set<string>();
        for (const d of deltas ?? []) {
          for (const rid of (d.changed_regulation_ids ?? []) as string[]) changedRegs.add(rid);
        }
        const ids =
          (graph?.nodes ?? [])
            .filter((n) => changedRegs.has(n.regulation_id))
            .map((n) => n.node_id) ?? [];
        setRecentNodeIds(ids);
      } catch {
        setRecentNodeIds([]);
      }
    };
    loadRecent();
  }, [api, graph?.nodes]);

  const filteredNodes = (graph?.nodes ?? []).filter((n) => {
    if (domains[n.domain] === false) return false;
    if (businessType !== "all" && n.applies_to_business_types && !n.applies_to_business_types.includes(businessType)) return false;
    if (stateFilter !== "all" && n.applies_to_states && n.applies_to_states.length > 0 && !n.applies_to_states.includes(stateFilter) && !n.applies_to_states.includes("ALL")) return false;
    return true;
  });
  const filteredSet = new Set(filteredNodes.map((n) => n.node_id));
  const filteredEdges = (graph?.edges ?? []).filter((e) => filteredSet.has(e.source) && filteredSet.has(e.target));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] animate-fade-in-up">
      {/* ─── Sidebar ─── */}
      <Card className="glass border-white/[0.06] p-4 space-y-4">
        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">Domain Filters</div>
          <div className="mt-3 space-y-2">
            {Object.keys(domains).map((d) => (
              <label key={d} className="flex items-center justify-between text-sm group cursor-pointer">
                <span className="flex items-center gap-2">
                  <Badge className={`${DOMAIN_BADGE_COLORS[d] ?? "bg-white/10 text-white/60"} text-[10px] px-1.5`}>{d}</Badge>
                </span>
                <input
                  type="checkbox"
                  checked={domains[d]}
                  onChange={(e) => setDomains((prev) => ({ ...prev, [d]: e.target.checked }))}
                  className="accent-blue-500"
                />
              </label>
            ))}
          </div>
        </div>

        <Separator className="bg-white/[0.06]" />

        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">Business Type</div>
          <select
            className="mt-2 w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs font-mono"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All Types" : t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">State</div>
          <select
            className="mt-2 w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs font-mono"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            {STATES.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All States" : s}</option>
            ))}
          </select>
        </div>

        <Separator className="bg-white/[0.06]" />

        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">Graph Stats</div>
          <div className="mt-2 font-mono text-[11px] text-white/30 space-y-1">
            <div>nodes: <span className="text-white/60">{filteredNodes.length}</span></div>
            <div>edges: <span className="text-white/60">{filteredEdges.length}</span></div>
            <div>domains: <span className="text-white/60">{Object.values(domains).filter(Boolean).length}</span></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">Highlight changes</span>
          <input type="checkbox" checked={highlightRecent} onChange={(e) => setHighlightRecent(e.target.checked)} className="accent-blue-500" />
        </div>

        <Separator className="bg-white/[0.06]" />

        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">Node Detail</div>
          {!selected ? (
            <div className="mt-2 text-[11px] text-white/25">Click a node to inspect.</div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={`${DOMAIN_BADGE_COLORS[selected.domain] ?? "bg-white/10 text-white/60"} text-[10px]`}>{selected.domain}</Badge>
                <span className="font-mono text-[10px] text-white/30">v{selected.version}</span>
              </div>
              <div className="text-sm font-semibold">{selected.title}</div>
              <div className="text-[11px] text-white/50 leading-relaxed">{selected.description}</div>
              <div className="text-[10px] font-mono text-white/25 space-y-0.5">
                <div>reg: {selected.regulation_id}</div>
                <div>portal: {selected.source_portal}</div>
                <div>threshold: {selected.threshold_type}</div>
                <div>due: {selected.due_date_rule}</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Graph ─── */}
      <div>
        <KGVisualization
          nodes={filteredNodes as any}
          edges={filteredEdges}
          onNodeClick={(n) => setSelected(n as any)}
          highlightedNodeIds={highlightRecent ? recentNodeIds : []}
        />
      </div>
    </div>
  );
}
