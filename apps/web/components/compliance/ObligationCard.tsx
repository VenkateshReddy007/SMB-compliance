"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const DOMAIN_BADGE: Record<string, string> = {
  GST: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PF: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  ESI: "bg-teal-500/15 text-teal-300 border-teal-500/20",
  FSSAI: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  PT: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  TDS: "bg-red-500/15 text-red-300 border-red-500/20",
};

const STATUS_BADGE: Record<string, string> = {
  compliant: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  overdue: "bg-red-500/15 text-red-300 border-red-500/20",
  hitl_escalated: "bg-purple-500/15 text-purple-300 border-purple-500/20",
};

export function ObligationCard({
  obligation,
}: {
  obligation: {
    domain?: string;
    title?: string;
    status?: string;
    due_date?: string;
    amount?: number;
    confidence_score?: number;
    source_portal?: string;
  };
}) {
  const domain = obligation.domain ?? "—";
  const status = obligation.status ?? "pending";

  return (
    <Card className="glass border-white/[0.06] p-4 hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center justify-between gap-3">
        <Badge className={`${DOMAIN_BADGE[domain] ?? "bg-white/[0.06] text-white/40"} border text-[10px]`}>{domain}</Badge>
        <Badge className={`${STATUS_BADGE[status] ?? "bg-white/[0.06] text-white/40"} border text-[10px]`}>{status}</Badge>
      </div>
      <div className="mt-3 text-sm font-semibold">{obligation.title ?? "Obligation"}</div>
      <div className="mt-2 text-[11px] font-mono text-white/30 space-y-0.5">
        <div>due: {obligation.due_date ?? "—"}</div>
        <div>amount: {obligation.amount != null ? `₹${obligation.amount}` : "—"}</div>
        <div>confidence: {obligation.confidence_score ?? "—"}</div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-white/20">source: {obligation.source_portal ?? "—"}</span>
        <Link href="/audit-trail" className="text-[10px] text-blue-400/60 hover:text-blue-400 font-mono transition">
          View in CAAL →
        </Link>
      </div>
    </Card>
  );
}
