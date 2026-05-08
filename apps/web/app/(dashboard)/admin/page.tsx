"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Zap } from "lucide-react";

const PORTALS = ["gstn", "epfo", "fssai", "pt-states"] as const;
type Portal = (typeof PORTALS)[number];

export default function AdminPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [dpdp, setDpdp] = useState<any>(null);
  const [tab, setTab] = useState<Portal>("gstn");
  const [regs, setRegs] = useState<any[]>([]);
  const [editReg, setEditReg] = useState<string>("");
  const [editField, setEditField] = useState("value");
  const [editValue, setEditValue] = useState("");
  const [status, setStatus] = useState("");
  const [pushing, setPushing] = useState(false);

  const load = async () => {
    const [st, us, dp] = await Promise.all([
      api.get("/admin/stats"),
      api.get<any[]>("/admin/users"),
      api.get<any>("/admin/dpdp/stats").catch(() => null),
    ]);
    setStats(st); setUsers(us); setDpdp(dp);
  };

  const loadRegs = async (p: string) => {
    try {
      const d = await api.get<any>(`/admin/portal/${p}`);
      const r = d?.regulations ?? [];
      setRegs(r);
      if (r[0]?.id) setEditReg(r[0].id);
    } catch { setRegs([]); }
  };

  useEffect(() => { load(); loadRegs(tab); }, []); // eslint-disable-line
  useEffect(() => { loadRegs(tab); }, [tab]); // eslint-disable-line

  const push = async () => {
    setPushing(true);
    setStatus("⏳ Pushing change…");
    await api.post("/admin/demo/trigger-change", {
      portal: tab, regulation_id: editReg, field: editField,
      new_value: editField === "value" ? Number(editValue) : editValue,
    });
    setStatus("🔍 IRDA detecting…");
    await new Promise(r => setTimeout(r, 500));
    setStatus("✅ Change pushed — IRDA will retrigger affected businesses");
    setPushing(false);
    await load(); await loadRegs(tab);
    toast({ title: "Regulation change pushed", description: `${tab}:${editReg}.${editField} updated` });
  };

  const reseed = async () => {
    await api.post("/admin/seed");
    toast({ title: "Data re-seeded", description: "All demo data reset." });
    await load();
  };

  const resetDemo = async () => {
    await api.post("/admin/reset-demo").catch(() => null);
    toast({ title: "Demo reset", description: "Obligations and alerts reset." });
    await load();
  };

  const breach = async () => {
    const bid = users?.[0]?.id ?? "11111111-1111-1111-1111-111111111001";
    const res = await api.post<any>("/admin/dpdp/simulate-breach", { business_id: bid });
    setDpdp((p: any) => ({ ...p, ...(res as any) }));
    toast({ title: "Breach simulated", description: "DPDP breach detection ran." });
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Card className="border-red-500/20 bg-red-500/[0.05] p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <div className="text-lg font-semibold">⚠ Demo Control Panel</div>
      </Card>

      {/* ─── Trigger Change with Tabs ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="text-sm font-semibold">Trigger Regulation Change (Demo)</div>
        <div className="mt-3 flex gap-1">
          {PORTALS.map(p => (
            <button key={p} onClick={() => setTab(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono transition ${tab === p ? "bg-blue-500/15 text-blue-300 border border-blue-500/20" : "text-white/40 hover:text-white/60 border border-transparent"}`}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Regulations table for active tab */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-mono text-white/25 uppercase">
              <tr><th className="py-2 pr-3">ID</th><th className="pr-3">Title</th><th className="pr-3">Value</th><th className="pr-3">Unit</th><th>Category</th></tr>
            </thead>
            <tbody>
              {regs.map(r => (
                <tr key={r.id} className={`border-t border-white/[0.04] ${editReg === r.id ? "bg-blue-500/[0.04]" : "hover:bg-white/[0.02]"} cursor-pointer transition`}
                  onClick={() => { setEditReg(r.id); setEditValue(String(r.value)); }}>
                  <td className="py-2 pr-3 font-mono text-[11px] text-white/60">{r.id}</td>
                  <td className="pr-3 text-white/70 text-[11px]">{r.title}</td>
                  <td className="pr-3 font-mono font-semibold">{String(r.value)}</td>
                  <td className="pr-3 text-white/40 text-[10px] font-mono">{r.unit}</td>
                  <td><Badge className="bg-white/[0.04] text-white/40 border-white/[0.06] text-[9px]">{r.category}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[9px] font-mono text-white/25 uppercase">Regulation</label>
            <Input className="mt-1 h-8 text-xs bg-white/[0.04] border-white/[0.06]" value={editReg} readOnly />
          </div>
          <div>
            <label className="text-[9px] font-mono text-white/25 uppercase">Field</label>
            <select className="mt-1 w-full h-8 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 text-xs" value={editField} onChange={e => setEditField(e.target.value)}>
              <option value="value">value</option><option value="title">title</option><option value="description">description</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-mono text-white/25 uppercase">New Value</label>
            <Input className="mt-1 h-8 text-xs bg-white/[0.04] border-white/[0.06]" value={editValue} onChange={e => setEditValue(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button className="bg-blue-500 hover:bg-blue-600 h-8 shadow-[0_0_12px_rgba(59,130,246,0.2)]" onClick={push} disabled={pushing}>
              <Zap className="h-3.5 w-3.5 mr-1" /> Push
            </Button>
          </div>
        </div>
        {status && <div className="mt-3 text-[11px] font-mono text-white/50">{status}</div>}
      </Card>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Businesses", stats?.total_businesses],
          ["Obligations", stats?.total_obligations],
          ["HITL Pending", stats?.hitl_pending],
          ["Alerts", stats?.total_alerts],
          ["CAAL Entries", stats?.caal_entries],
        ].map(([label, val]) => (
          <Card key={String(label)} className="glass border-white/[0.06] p-4">
            <div className="text-[10px] font-mono text-white/25 uppercase">{label}</div>
            <div className="mt-1 text-xl font-mono font-semibold">{val ?? "—"}</div>
          </Card>
        ))}
      </div>

      {/* ─── User Management ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">User Management</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reseed}><RefreshCw className="h-3.5 w-3.5 mr-1" />Re-seed</Button>
            <Button variant="secondary" onClick={resetDemo}>Reset Demo</Button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-mono text-white/25 uppercase">
              <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Type</th><th className="pr-3">State</th><th className="pr-2">GST</th><th className="pr-2">PF</th><th className="pr-2">FSSAI</th><th>PT</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2 pr-3 font-medium">{u.name}</td>
                  <td className="pr-3 text-white/50 text-xs">{u.business_type}</td>
                  <td className="pr-3 text-white/50 text-xs font-mono">{u.state}</td>
                  <td className="pr-2">{u.gst_registered ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                  <td className="pr-2">{u.pf_registered ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                  <td className="pr-2">{u.fssai_registered ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                  <td>{u.pt_state ? <span className="text-emerald-400">✓</span> : <span className="text-white/15">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── DPDP ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="text-sm font-semibold">DPDP Status</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] font-mono text-white/25 uppercase">Vault Tokens</div>
            <div className="mt-1 text-xl font-mono font-semibold">{dpdp?.vault_tokens_count ?? 0}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] font-mono text-white/25 uppercase">Consent Given</div>
            <div className="mt-1 text-xl font-mono font-semibold">{dpdp?.consent_given_count ?? 0}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] font-mono text-white/25 uppercase">Last Breach Check</div>
            <div className="mt-1 text-sm font-mono text-white/50">{dpdp?.last_breach_check_at ?? "—"}</div>
          </div>
        </div>
        <div className="mt-4">
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={breach}>Simulate Breach Detection</Button>
        </div>
      </Card>
    </div>
  );
}
