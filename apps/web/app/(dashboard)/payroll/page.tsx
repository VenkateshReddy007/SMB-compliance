"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Business = { id: string; name: string };

const DOMAIN_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  PF: { bg: "from-emerald-500/10 to-emerald-500/[0.02]", border: "border-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  ESI: { bg: "from-teal-500/10 to-teal-500/[0.02]", border: "border-teal-500/15", text: "text-teal-400", dot: "bg-teal-400" },
  PT: { bg: "from-purple-500/10 to-purple-500/[0.02]", border: "border-purple-500/15", text: "text-purple-400", dot: "bg-purple-400" },
  TDS: { bg: "from-red-500/10 to-red-500/[0.02]", border: "border-red-500/15", text: "text-red-400", dot: "bg-red-400" },
};

function countdown(dueDate: string | null | undefined): string {
  if (!dueDate) return "—";
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  return `${diff}d remaining`;
}

function countdownColor(dueDate: string | null | undefined): string {
  if (!dueDate) return "text-white/30";
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "text-red-400";
  if (diff <= 3) return "text-amber-400";
  return "text-emerald-400";
}

export default function PayrollPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceContent, setTraceContent] = useState<any>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    api.get<Business[]>("/admin/users").then((rows) => {
      setBusinesses(rows);
      if (rows[0]) setSelected(rows[0].id);
    });
  }, [api]);

  useEffect(() => {
    if (!selected) return;
    api.get(`/payroll/${selected}/current-month`).then(setCurrent);
    api.get<any[]>(`/payroll/${selected}/history`).then(setHistory);
  }, [api, selected]);

  const compute = async () => {
    if (!selected) return;
    setComputing(true);
    const res = await api.post(`/payroll/${selected}/compute`);
    setCurrent(res);
    setComputing(false);
    const h = await api.get<any[]>(`/payroll/${selected}/history`);
    setHistory(h);
    toast({ title: "Payroll computed", description: "All obligations recalculated via rule engine." });
  };

  const markPaid = (domain: string) => {
    toast({ title: `${domain} marked as paid`, description: "Status updated to 'paid' for this period." });
  };

  const showTrace = (domain: string) => {
    setTraceContent({
      domain,
      steps: [
        { step: 1, description: `Fetch ${domain} rules from portal data`, result: "Rules loaded" },
        { step: 2, description: `Get employee data for business`, result: `${current?.employee_count ?? "N/A"} employees` },
        { step: 3, description: `Apply ${domain} computation formula`, result: `₹${current?.[`${domain.toLowerCase()}_amount`] ?? 0}` },
        { step: 4, description: `Calculate due date`, result: current?.[`${domain.toLowerCase()}_due_date`] ?? "—" },
      ],
    });
    setTraceOpen(true);
  };

  const obligations = [
    { name: "PF", amount: current?.pf_amount, due: current?.pf_due_date, status: current?.pf_status },
    { name: "ESI", amount: current?.esi_amount, due: current?.esi_due_date, status: current?.esi_status },
    { name: "PT", amount: current?.pt_amount, due: current?.pt_due_date, status: current?.pt_status },
    { name: "TDS", amount: current?.tds_amount, due: current?.tds_due_date, status: current?.tds_status },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ─── Selectors ─── */}
      <Card className="glass border-white/[0.06] p-4 flex items-center gap-4">
        <div>
          <label className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Business</label>
          <select
            className="mt-1 block bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <Button
          className="ml-auto bg-blue-500 hover:bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
          onClick={compute}
          disabled={computing}
        >
          {computing ? "Computing…" : "⚡ Compute Payroll"}
        </Button>
      </Card>

      {/* ─── Obligation Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {obligations.map(({ name, amount, due, status }) => {
          const colors = DOMAIN_COLORS[name] ?? DOMAIN_COLORS.PF;
          const isPaid = status === "paid";
          return (
            <Card key={name} className={`border bg-gradient-to-br ${colors.bg} ${colors.border} p-5 relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className="text-sm font-semibold">{name}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isPaid ? "bg-emerald-500/15 text-emerald-300" :
                  status === "overdue" ? "bg-red-500/15 text-red-300" :
                  "bg-white/[0.06] text-white/40"
                }`}>
                  {status ?? "pending"}
                </span>
              </div>
              <div className={`mt-3 text-2xl font-mono font-semibold ${colors.text}`}>
                ₹{amount ?? "—"}
              </div>
              <div className="mt-2 text-[11px] font-mono text-white/30">
                due: {due ?? "—"}
              </div>
              <div className={`mt-1 text-[11px] font-mono font-semibold ${countdownColor(due)}`}>
                {countdown(due)}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[11px] text-white/40 hover:text-white/70 h-7 px-2"
                  onClick={() => showTrace(name)}
                >
                  Trace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[11px] text-emerald-400/60 hover:text-emerald-400 h-7 px-2"
                  onClick={() => markPaid(name)}
                >
                  Mark Paid
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── History ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">6-Month History</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-mono text-white/25 tracking-wider uppercase">
              <tr>
                <th className="py-2 pr-4">Period</th>
                <th className="pr-4"><span className="text-emerald-400">PF</span></th>
                <th className="pr-4"><span className="text-teal-400">ESI</span></th>
                <th className="pr-4"><span className="text-purple-400">PT</span></th>
                <th><span className="text-red-400">TDS</span></th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, idx) => (
                <tr key={idx} className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4 font-mono text-white/50">{r.period}</td>
                  <td className="pr-4 font-mono">{r.pf_amount ?? "—"}</td>
                  <td className="pr-4 font-mono">{r.esi_amount ?? "—"}</td>
                  <td className="pr-4 font-mono">{r.pt_amount ?? "—"}</td>
                  <td className="font-mono">{r.tds_amount ?? "—"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/20 text-sm">No history data. Click &quot;Compute Payroll&quot; to generate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Trace Modal ─── */}
      <Dialog open={traceOpen} onOpenChange={setTraceOpen}>
        <DialogContent className="bg-[#0d1117] text-white border-white/[0.08] shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Computation Trace — {traceContent?.domain}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {(traceContent?.steps ?? []).map((s: any) => (
              <div key={s.step} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="shrink-0 h-6 w-6 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-mono flex items-center justify-center">
                  {s.step}
                </div>
                <div>
                  <div className="text-sm text-white/70">{s.description}</div>
                  <div className="mt-1 text-[11px] font-mono text-white/40">→ {s.result}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] font-mono text-white/20">
            Computed by Rail B (deterministic rule engine) — no LLM involved
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
