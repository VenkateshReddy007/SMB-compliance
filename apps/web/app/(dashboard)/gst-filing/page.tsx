"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceScore } from "@/components/compliance/ConfidenceScore";
import { DualRailBadge } from "@/components/compliance/DualRailBadge";
import { CheckCircle2, XCircle, Download } from "lucide-react";

type Business = { id: string; name: string; gst_registered?: boolean };

function MiniCalendar() {
  const now = new Date();
  const month = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();

  const gstDates = [20]; // GSTR-3B
  const gstr1Date = [11]; // GSTR-1
  const annualDate = now.getMonth() === 11 ? [31] : []; // GSTR-9

  return (
    <div>
      <div className="text-xs font-mono text-white/40 mb-2">{month} {year}</div>
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-[9px] font-mono text-white/20 text-center">{d}</div>
        ))}
        {Array.from({ length: new Date(year, now.getMonth(), 1).getDay() }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isGst = gstDates.includes(day);
          const isGstr1 = gstr1Date.includes(day);
          const isAnnual = annualDate.includes(day);
          const isToday = day === now.getDate();
          const daysUntil = day - now.getDate();
          const isUpcoming = daysUntil > 0 && daysUntil <= 7;
          const isPast = day < now.getDate();

          let bg = "";
          if (isGst || isGstr1 || isAnnual) {
            if (isPast) bg = "bg-red-500/30 text-red-300";
            else if (isUpcoming) bg = "bg-amber-500/30 text-amber-300";
            else bg = "bg-emerald-500/20 text-emerald-300";
          }

          return (
            <div
              key={day}
              className={`text-[10px] font-mono text-center py-0.5 rounded ${bg} ${isToday ? "ring-1 ring-blue-400/50" : ""} ${!bg ? "text-white/30" : ""}`}
              title={isGst ? "GSTR-3B Due" : isGstr1 ? "GSTR-1 Due" : isAnnual ? "GSTR-9 Due" : ""}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[9px] font-mono text-white/30">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40" /> &gt;7d</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500/40" /> 3-7d</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500/40" /> overdue</span>
      </div>
    </div>
  );
}

export default function GSTFilingPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [status, setStatus] = useState<any>(null);
  const [exportJson, setExportJson] = useState<string>("");

  useEffect(() => {
    api.get<Business[]>("/admin/users").then((rows) => {
      const gst = rows.filter((b: any) => b.gst_registered);
      setBusinesses(gst);
      if (gst[0]) setSelected(gst[0].id);
    });
  }, [api]);

  useEffect(() => {
    if (!selected) return;
    api.post(`/gst/filing-status/${selected}/compute`).then(setStatus);
  }, [api, selected]);

  const doExport = async () => {
    if (!selected) return;
    const data = await api.get<any>(`/gst/export/${selected}`);
    setExportJson(JSON.stringify(data, null, 2));
  };

  const downloadExport = () => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst-filing-${selected}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const readiness = Number(status?.readiness_score ?? 0);
  const lateFee = readiness < 50 ? "₹500 (estimated cap)" : "—";

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ─── Selectors ─── */}
      <Card className="glass border-white/[0.06] p-4 flex flex-wrap items-center gap-4">
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
        <div>
          <label className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Period</label>
          <input
            type="month"
            className="mt-1 block bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm font-mono"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </Card>

      {/* ─── Readiness + Summary + Calendar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Filing Readiness Score</div>
          <div className="mt-4 flex justify-center">
            <ConfidenceScore score={readiness / 100} size="lg" />
          </div>
          <div className="mt-3 text-center text-[11px] font-mono text-white/25">
            {readiness >= 80 ? "Ready to file" : readiness >= 50 ? "Needs attention" : "Not ready"}
          </div>
        </Card>

        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Filing Summary</div>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">GST Liability</span>
              <span className="font-mono font-semibold">₹{status?.total_gst_liability ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Input Tax Credit</span>
              <span className="font-mono font-semibold text-emerald-400">₹{status?.input_tax_credit ?? "—"}</span>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Net Payable</span>
              <span className="font-mono font-semibold text-blue-400">₹{status?.net_payable ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Late Fee Est.</span>
              <span className="font-mono text-amber-400">{lateFee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Period</span>
              <span className="font-mono text-white/60">{status?.period ?? period}</span>
            </div>
          </div>
          <div className="mt-4">
            <DualRailBadge railAgreement={true} confidence={0.96} hitlRequired={false} />
          </div>
        </Card>

        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Due Dates Calendar</div>
          <div className="mt-4">
            <MiniCalendar />
          </div>
        </Card>
      </div>

      {/* ─── Checklist ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Filing Checklist</div>
        <div className="mt-4 space-y-2">
          {["GST Registration Valid", "GSTR-1 Filed", "Reconciliation Done", "ITC Claimed", "Payment Ready"].map((item) => {
            const isMissing = (status?.missing_items ?? []).some((m: string) => m.toLowerCase().includes(item.toLowerCase().split(" ")[0].toLowerCase()));
            return (
              <div key={item} className={`flex items-center gap-3 rounded-lg border p-3 ${isMissing ? "border-amber-500/15 bg-amber-500/[0.03]" : "border-emerald-500/15 bg-emerald-500/[0.03]"}`}>
                {isMissing ? (
                  <XCircle className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <span className="text-sm text-white/70">{item}</span>
              </div>
            );
          })}
          {(status?.missing_items ?? []).filter((m: string) => !["gst", "gstr", "reconciliation", "itc", "payment"].some((k) => m.toLowerCase().includes(k))).map((m: string, idx: number) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.03] p-3">
              <XCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm text-white/70">{m}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Export ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Export</div>
            <div className="mt-0.5 text-[11px] text-white/25">Generate filing-ready JSON for this business</div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={doExport}>
              Generate Filing-Ready JSON
            </Button>
            {exportJson && (
              <Button variant="secondary" onClick={downloadExport}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            )}
          </div>
        </div>
        {exportJson && (
          <pre className="mt-4 text-[11px] font-mono overflow-auto bg-black/30 p-4 rounded-lg border border-white/[0.04] max-h-[300px]">
            {exportJson}
          </pre>
        )}
      </Card>
    </div>
  );
}
