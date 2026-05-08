"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function HITLPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const { toast } = useToast();
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{ id: string; decision: "approved" | "rejected" } | null>(null);

  const load = async () => {
    const [q, h] = await Promise.all([
      api.get<any[]>("/hitl/queue").catch(() => []),
      api.get<any[]>("/hitl/history").catch(() => []),
    ]);
    setQueue(q ?? []);
    setHistory(h ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = async () => {
    if (!confirmAction) return;
    const { id, decision } = confirmAction;
    await api.post(`/hitl/queue/${id}/resolve`, {
      decision,
      notes: notes[id] ?? "",
      approver_id: "demo_reviewer",
    });
    toast({
      title: `${decision === "approved" ? "✓ Approved" : "✗ Rejected"}`,
      description: "Action recorded in CAAL ledger.",
    });
    setConfirmAction(null);
    await load();
  };

  const createTest = async () => {
    await api.post("/hitl/queue/test-create?business_id=11111111-1111-1111-1111-111111111001");
    toast({ title: "Test HITL item created", description: "A mock divergence scenario has been added." });
    await load();
  };

  const approvedCount = (history ?? []).filter((h) => h.status === "approved").length;
  const rejectedCount = (history ?? []).filter((h) => h.status === "rejected").length;
  const totalResolved = approvedCount + rejectedCount;
  const approvalRate = totalResolved > 0 ? Math.round((approvedCount / totalResolved) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-white/[0.06] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{queue.length}</div>
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Pending</div>
          </div>
        </Card>
        <Card className="glass border-white/[0.06] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{totalResolved}</div>
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Resolved</div>
          </div>
        </Card>
        <Card className="glass border-white/[0.06] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">—</div>
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Avg Time</div>
          </div>
        </Card>
        <Card className="glass border-white/[0.06] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-purple-400">{approvalRate}%</span>
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{approvedCount}/{totalResolved}</div>
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Approval Rate</div>
          </div>
        </Card>
      </div>

      {/* ─── Pending Queue ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Pending Queue</div>
            <div className="mt-0.5 text-[11px] font-mono text-white/30">Items awaiting human review</div>
          </div>
          <Button
            className="bg-blue-500 hover:bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
            onClick={createTest}
          >
            + Create Test HITL Item
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-mono text-white/25 tracking-wider uppercase">
              <tr>
                <th className="py-2 pr-4">Business</th>
                <th className="pr-4">Action</th>
                <th className="pr-4">Divergence</th>
                <th className="pr-4">Confidence</th>
                <th className="pr-4">Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((q) => (
                <tr key={q.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4 font-mono text-[11px] text-white/50">{String(q.business_id).slice(0, 12)}…</td>
                  <td className="pr-4 text-white/70">{q.action_type}</td>
                  <td className="pr-4 text-white/50 text-[11px] max-w-[200px] truncate">{q.divergence_reason}</td>
                  <td className="pr-4 font-mono">{q.confidence_score}</td>
                  <td className="pr-4">
                    <Input
                      className="h-7 text-xs bg-white/[0.04] border-white/[0.06] w-28"
                      value={notes[q.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                      placeholder="Add note…"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {/* Review Modal */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-blue-400 hover:text-blue-300">
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0d1117] text-white border-white/[0.08] shadow-2xl max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>HITL Review</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-blue-500/15 bg-blue-500/[0.03] p-4">
                              <div className="text-xs font-semibold text-blue-400 mb-2">Rail A (LLM + KG)</div>
                              <pre className="text-[11px] font-mono overflow-auto max-h-[300px] text-white/60">
                                {JSON.stringify(q.rail_a_response ?? {}, null, 2)}
                              </pre>
                            </div>
                            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
                              <div className="text-xs font-semibold text-emerald-400 mb-2">Rail B (Rule Engine)</div>
                              <pre className="text-[11px] font-mono overflow-auto max-h-[300px] text-white/60">
                                {JSON.stringify(q.rail_b_response ?? {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                          <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.03] p-4">
                            <div className="text-xs font-semibold text-amber-400 mb-2">Divergence Analysis</div>
                            <div className="text-sm text-white/60">{q.divergence_reason}</div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Approve */}
                      <Button
                        size="sm"
                        className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => setConfirmAction({ id: q.id, decision: "approved" })}
                      >
                        Approve
                      </Button>
                      {/* Reject */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[11px]"
                        onClick={() => setConfirmAction({ id: q.id, decision: "rejected" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/20 text-sm">
                    No pending items. Use &quot;Create Test HITL Item&quot; to simulate a divergence.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── History ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="text-sm font-semibold">Resolution History</div>
        <div className="mt-0.5 text-[11px] font-mono text-white/30">Resolved items with outcomes</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-mono text-white/25 tracking-wider uppercase">
              <tr>
                <th className="py-2 pr-4">Business</th>
                <th className="pr-4">Action</th>
                <th className="pr-4">Outcome</th>
                <th className="pr-4">Resolved By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(history ?? []).map((h) => (
                <tr key={h.id} className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4 font-mono text-[11px] text-white/40">{String(h.business_id ?? "").slice(0, 12)}…</td>
                  <td className="pr-4 text-white/60">{h.action_type}</td>
                  <td className="pr-4">
                    <Badge className={h.status === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[10px]" : "bg-red-500/15 text-red-300 border-red-500/20 text-[10px]"}>
                      {h.status}
                    </Badge>
                  </td>
                  <td className="pr-4 font-mono text-[11px] text-white/40">{h.resolved_by ?? "—"}</td>
                  <td className="text-white/40 text-[11px]">{h.resolution_notes ?? "—"}</td>
                </tr>
              ))}
              {(history ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/20 text-sm">No resolved items yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Confirmation Modal ─── */}
      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent className="bg-[#0d1117] text-white border-white/[0.08] shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm {confirmAction?.decision === "approved" ? "Approval" : "Rejection"}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-white/60">
            Are you sure you want to <strong className={confirmAction?.decision === "approved" ? "text-emerald-400" : "text-red-400"}>{confirmAction?.decision}</strong> this HITL item&#63;
            This action will be recorded in the CAAL ledger.
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              className={confirmAction?.decision === "approved" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}
              onClick={resolve}
            >
              Confirm {confirmAction?.decision === "approved" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
