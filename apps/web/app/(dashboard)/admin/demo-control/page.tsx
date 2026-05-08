"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { Play, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { createApiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

type Scenario = {
  id: string;
  name: string;
  portal: string;
  regulation_id: string;
  field: string;
  old_value: any;
  new_value: any;
  expected_affected_businesses: string[];
  expected_cascade?: string[];
  demo_narrative: string;
};

const STEPS = [
  "Pushing change to mock portal...",
  "IRDA watcher detecting change...",
  "Delta extracted: regulation changed...",
  "Businesses identified as affected...",
  "COCE cascade running...",
  "Compliance alerts created...",
  "WebSocket broadcast sent...",
  "CAAL ledger entry written...",
];

export default function DemoControlPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const router = useRouter();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    api.get<Scenario[]>("/demo/scenarios").then((res) => setScenarios(res)).catch(console.error);
  }, [api]);

  const runScenario = async (id: string) => {
    setRunningId(id);
    setProgress(0);

    // Simulate progress visually
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= STEPS.length) {
          clearInterval(interval);
          return p;
        }
        return p + 1;
      });
    }, 800);

    try {
      await api.post(`/demo/run-scenario/${id}`, {});
    } catch (e) {
      console.error("Failed to run scenario", e);
      clearInterval(interval);
      setRunningId(null);
    }
  };

  const handleReset = async () => {
    await api.get("/demo/reset");
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demo Control Panel</h1>
          <p className="text-white/60 mt-2">
            Trigger pre-configured regulatory changes to demonstrate the Autonomous Compliance OS.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          Reset Demo State
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {scenarios.map((s) => (
          <div key={s.id} className="glass rounded-xl p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-widest text-white/50 font-medium">
                  {s.portal}
                </span>
                <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-white/70">
                  {s.regulation_id}
                </span>
              </div>
              
              <h2 className="text-xl font-semibold mb-2">{s.name}</h2>
              <p className="text-sm text-white/70 mb-6 flex-1">
                {s.demo_narrative}
              </p>

              <div className="bg-black/20 rounded-lg p-4 mb-6 border border-white/5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/50">Change:</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-400 line-through">{s.old_value}</span>
                    <ArrowRight className="w-3 h-3 text-white/50" />
                    <span className="text-emerald-400">{s.new_value}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-white/5">
                  <span className="text-white/50">Impact:</span>
                  <span className="text-white/90">{s.expected_affected_businesses.length} Businesses</span>
                </div>
              </div>

              {runningId === s.id ? (
                <div className="flex flex-col gap-3">
                  {STEPS.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                        idx < progress
                          ? "text-emerald-400"
                          : idx === progress
                          ? "text-white animate-pulse"
                          : "text-white/20"
                      }`}
                    >
                      {idx < progress ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      {step}
                    </div>
                  ))}
                  {progress >= STEPS.length && (
                    <button
                      onClick={() => router.push("/compliance-feed")}
                      className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-medium text-sm"
                    >
                      View Results in Feed <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => runScenario(s.id)}
                  disabled={runningId !== null}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" /> Run This Scenario
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
