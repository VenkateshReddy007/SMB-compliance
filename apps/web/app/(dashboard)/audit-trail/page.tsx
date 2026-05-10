"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { Download, Shield, ChevronDown, ChevronUp } from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  irda: "bg-blue-500/10 text-blue-400 border-blue-500/15",
  drca: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
  coce: "bg-orange-500/10 text-orange-400 border-orange-500/15",
  caal: "bg-purple-500/10 text-purple-400 border-purple-500/15",
  hitl: "bg-amber-500/10 text-amber-400 border-amber-500/15",
  gst: "bg-cyan-500/10 text-cyan-400 border-cyan-500/15",
  payroll: "bg-pink-500/10 text-pink-400 border-pink-500/15",
  railaclassifier: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/15",
  railbverifier: "bg-indigo-500/10 text-indigo-400 border-indigo-500/15",
  deltawatcher: "bg-orange-500/10 text-orange-400 border-orange-500/15",
  rulesengine: "bg-rose-500/10 text-rose-400 border-rose-500/15",
  hitlresolver: "bg-amber-500/10 text-amber-400 border-amber-500/15",
};

function agentBadge(name: string) {
  const key = (name ?? "").toLowerCase().split(/[\s_-]/)[0];
  return AGENT_COLORS[key] ?? "bg-white/[0.06] text-white/40 border-white/[0.06]";
}

type AgentSum = { agent_did: string; agent_name: string; action_count: number };

export default function AuditTrailPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const { entries, fetchLedger } = useAuditTrail();
  const [bid, setBid] = useState("");
  const [verify, setVerify] = useState<Record<string, string>>({});
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const [agents, setAgents] = useState<AgentSum[]>([]);
  const [agentF, setAgentF] = useState("");
  const [actionF, setActionF] = useState("");

  useEffect(() => { fetchLedger({ page: 1, pageSize: 50, businessId: bid || undefined }); }, [fetchLedger, bid]);
  useEffect(() => { api.get<AgentSum[]>("/audit/agents").then(setAgents).catch(() => setAgents([])); }, [api]);

  const doExport = async () => {
    const id = bid || "11111111-1111-1111-1111-111111111001";
    const data = await api.get<any>(`/audit/export/${id}`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-${id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const sha256 = async (s: string) => {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const doVerify = async (e: any) => {
    if (!e?.agent_did || !e?.timestamp || !e?.action_payload || !e?.action_hash) {
      setVerify(v => ({ ...v, [e.id]: "insufficient" })); return;
    }
    const p = JSON.stringify(e.action_payload, Object.keys(e.action_payload).sort(), 0);
    const c = await sha256(`${e.agent_did}${e.timestamp}${p}`);
    setVerify(v => ({ ...v, [e.id]: c === e.action_hash ? "✓ verified" : "✗ mismatch" }));
  };

  const filtered = entries.filter((e: any) => {
    if (agentF && !(e.agent_name ?? "").toLowerCase().includes(agentF.toLowerCase())) return false;
    if (actionF && !(e.action_type ?? "").toLowerCase().includes(actionF.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Card className="glass border-white/[0.06] p-5 flex items-center gap-3">
        <Shield className="h-5 w-5 text-purple-400" />
        <div>
          <div className="text-lg font-semibold">Cryptographic Agent Action Ledger (CAAL)</div>
          <div className="text-[11px] text-white/40">Immutable audit trail of autonomous + HITL decisions</div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {agents.map(a => (
          <Card key={a.agent_did} className={`border p-3 ${agentBadge(a.agent_name)}`}>
            <div className="text-[11px] font-semibold">{a.agent_name}</div>
            <div className="mt-1 text-[9px] font-mono text-white/30 truncate">{a.agent_did}</div>
            <div className="mt-2 text-lg font-mono font-semibold">{a.action_count}</div>
          </Card>
        ))}
      </div>

      <Card className="glass border-white/[0.06] p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[9px] font-mono text-white/25 uppercase">Business ID</label>
          <Input className="mt-1 h-8 text-xs bg-white/[0.04] border-white/[0.06] w-56" value={bid} onChange={e => setBid(e.target.value)} placeholder="Filter by ID…" />
        </div>
        <div>
          <label className="text-[9px] font-mono text-white/25 uppercase">Agent</label>
          <Input className="mt-1 h-8 text-xs bg-white/[0.04] border-white/[0.06] w-32" value={agentF} onChange={e => setAgentF(e.target.value)} placeholder="irda" />
        </div>
        <div>
          <label className="text-[9px] font-mono text-white/25 uppercase">Action</label>
          <Input className="mt-1 h-8 text-xs bg-white/[0.04] border-white/[0.06] w-40" value={actionF} onChange={e => setActionF(e.target.value)} placeholder="portal_check" />
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={doExport}><Download className="h-4 w-4 mr-1" />Export</Button>
      </Card>

      <Card className="glass border-white/[0.06] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-mono text-white/25 uppercase">
              <tr><th className="py-2 pr-3">Time</th><th className="pr-3">Agent</th><th className="pr-3">Action</th><th className="pr-3">Business</th><th className="pr-3">Conf</th><th className="pr-3">Rail</th><th className="pr-3">Hash</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => (
                <tbody key={e.id}>
                  <tr className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 font-mono text-[10px] text-white/30 whitespace-nowrap">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                    <td className="pr-3"><Badge className={`${agentBadge(e.agent_name)} text-[9px] border`}>{e.agent_name}</Badge></td>
                    <td className="pr-3 text-white/60 text-[11px]">{e.action_type}</td>
                    <td className="pr-3 font-mono text-[10px] text-white/30">{e.business_id ? `${String(e.business_id).slice(0,8)}…` : "—"}</td>
                    <td className="pr-3 font-mono text-[11px]">{e.confidence_score ?? "—"}</td>
                    <td className="pr-3">{e.rail_agreement === true ? <span className="text-emerald-400 text-[10px]">✓</span> : e.rail_agreement === false ? <span className="text-red-400 text-[10px]">✗</span> : <span className="text-white/20 text-[10px]">—</span>}</td>
                    <td className="pr-3 font-mono text-[10px] text-white/25">{e.action_hash?.slice(0,12)}…</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => doVerify(e)}>Verify</Button>
                        <span className={`text-[10px] font-mono ${verify[e.id]?.startsWith("✓") ? "text-emerald-400" : verify[e.id]?.startsWith("✗") ? "text-red-400" : "text-white/20"}`}>{verify[e.id] ?? ""}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30" onClick={() => setExp(p => ({ ...p, [e.id]: !p[e.id] }))}>{exp[e.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</Button>
                      </div>
                    </td>
                  </tr>
                  {exp[e.id] && (
                    <tr><td colSpan={8} className="py-3 px-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <div className="text-[10px] font-mono text-white/30 uppercase mb-2">Action Payload</div>
                          <pre className="text-[10px] font-mono text-white/50 overflow-auto max-h-[200px]">{JSON.stringify(e.action_payload ?? {}, null, 2)}</pre>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <div className="text-[10px] font-mono text-white/30 uppercase mb-2">Source Citations</div>
                          <pre className="text-[10px] font-mono text-white/50 overflow-auto max-h-[200px]">{JSON.stringify(e.source_citations ?? [], null, 2)}</pre>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-white/20">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
