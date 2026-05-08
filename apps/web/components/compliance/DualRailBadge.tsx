"use client";

import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function DualRailBadge({
  railAgreement,
  confidence,
  hitlRequired,
}: {
  railAgreement: boolean;
  confidence: number;
  hitlRequired: boolean;
}) {
  const [showTip, setShowTip] = useState(false);

  const badge = hitlRequired ? (
    <Badge className="bg-red-500/15 text-red-300 border border-red-500/20 text-[10px]">⚠ HITL Escalated</Badge>
  ) : !railAgreement ? (
    <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/20 text-[10px]">LLM-Only Response</Badge>
  ) : (
    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[10px]">
      Dual-Rail Verified ✓ ({Math.round(confidence * 100)}%)
    </Badge>
  );

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {badge}
      <button
        className="h-4 w-4 rounded-full bg-white/[0.06] text-white/30 text-[9px] hover:bg-white/[0.1] hover:text-white/50 transition flex items-center justify-center"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        ?
      </button>
      {showTip && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-white/[0.08] bg-[#0d1117] p-3 text-[10px] text-white/60 shadow-xl z-50 animate-fade-in-up">
          <div className="font-semibold text-white/80 mb-1">Dual-Rail Verification</div>
          <div className="leading-relaxed">
            Every response is computed by two independent rails: Rail A (LLM + RAG) and Rail B (deterministic rule engine).
            If both agree, the result is verified. If they diverge, it&apos;s escalated for human review (HITL).
          </div>
        </div>
      )}
    </div>
  );
}
