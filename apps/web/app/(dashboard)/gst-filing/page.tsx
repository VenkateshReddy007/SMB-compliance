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

function MiniCalendar({ dueDates = [], period }: { dueDates: { date: number; title: string; type: string }[], period: string }) {
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const displayDate = new Date(year, monthIdx, 1);
  const monthName = displayDate.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const now = new Date();

  return (
    <div>
      <div className="text-xs font-mono text-white/40 mb-2">{monthName} {year}</div>
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-[9px] font-mono text-white/20 text-center">{d}</div>
        ))}
        {Array.from({ length: new Date(year, monthIdx, 1).getDay() }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday = year === now.getFullYear() && monthIdx === now.getMonth() && day === now.getDate();
          
          let isUpcoming = false;
          let isPast = false;
          const cellDate = new Date(year, monthIdx, day);
          const diffTime = cellDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) isPast = true;
          else if (diffDays > 0 && diffDays <= 7) isUpcoming = true;

          // Check if this day is a due date
          const dueItem = dueDates.find((d) => d.date === day);

          let bg = "";
          if (dueItem) {
            if (isPast) bg = "bg-red-500/30 text-red-300";
            else if (isUpcoming) bg = "bg-amber-500/30 text-amber-300";
            else bg = "bg-emerald-500/20 text-emerald-300";
          }

          return (
            <div
              key={day}
              className={`text-[10px] font-mono text-center py-0.5 rounded ${bg} ${isToday ? "ring-1 ring-blue-400/50" : ""} ${!bg ? "text-white/30" : ""}`}
              title={dueItem ? dueItem.title : ""}
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
  const [calendarDates, setCalendarDates] = useState<any[]>([]);

  useEffect(() => {
    api.get<Business[]>("/admin/users").then((rows) => {
      const gst = rows.filter((b: any) => b.gst_registered);
      setBusinesses(gst);
      if (gst[0]) setSelected(gst[0].id);
    });
  }, [api]);

  useEffect(() => {
    if (!selected) return;
    api.post(`/gst/filing-status/${selected}/compute?period=${period}`).then(setStatus);
    api.get<any[]>("/gst/due-dates").then((dates) => {
      // Filter dates for this business and extract the day of the month
      const businessDates = dates
        .filter((d) => d.business_id === selected && d.due_date && d.due_date.startsWith(period))
        .map((d) => ({
          date: parseInt(d.due_date.split("-")[2], 10),
          title: d.title,
          type: "obligation",
        }));
      setCalendarDates(businessDates);
    });
  }, [api, selected, period]);

  const doExport = async () => {
    if (!selected) return;
    const data = await api.get<any>(`/gst/export/${selected}?period=${period}`);
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
            <DualRailBadge railAgreement={true} confidence={readiness / 100} hitlRequired={readiness < 80} />
          </div>
        </Card>

        <Card className="glass border-white/[0.06] p-5">
          <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Due Dates Calendar</div>
          <div className="mt-4">
            <MiniCalendar dueDates={calendarDates} period={period} />
          </div>
        </Card>
      </div>

      {/* ─── Checklist ─── */}
      <Card className="glass border-white/[0.06] p-5">
        <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Filing Checklist</div>
        <div className="mt-4 space-y-2">
          {status?.checklist && status.checklist.length > 0 ? (
            status.checklist.map((item: any, idx: number) => {
              const isMissing = item.status === "pending" || item.status === "overdue";
              return (
                <div key={idx} className={`flex items-center gap-3 rounded-lg border p-3 ${isMissing ? "border-amber-500/15 bg-amber-500/[0.03]" : "border-emerald-500/15 bg-emerald-500/[0.03]"}`}>
                  {isMissing ? (
                    <XCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-white/70">{item.item}</span>
                    {isMissing && item.instructions && (
                      <span className="text-[10px] font-mono text-amber-500/60 mt-0.5">{item.instructions}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm font-mono text-white/40 text-center py-4">No filing checklist generated for this period.</div>
          )}
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
