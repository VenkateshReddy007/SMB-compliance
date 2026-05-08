"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export function RetriggerBanner({
  event,
}: {
  event: null | {
    portal?: string;
    affected_count?: number;
    message?: string;
    delta_id?: string;
  };
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    setProgress(100);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);

    const duration = 10000;
    const step = 50;
    intervalRef.current = window.setInterval(() => {
      setProgress((p) => Math.max(0, p - (step / duration) * 100));
    }, step);

    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [event]);

  if (!event || !visible) return null;

  return (
    <div className={cn("fixed left-0 right-0 top-0 z-50 animate-slide-in-top")}>
      <div className="px-6 py-3 bg-blue-500/10 border-b border-blue-500/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚡</span>
            <div className="font-mono text-sm text-white/90">
              Regulation Change: <span className="text-blue-400 font-semibold">{event.portal}</span>
              <span className="text-white/40 mx-2">|</span>
              {event.affected_count ?? "—"} businesses affected
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/compliance-feed" className="text-xs text-blue-400 hover:text-blue-300 font-mono transition">
              View Details →
            </Link>
            <button className="text-white/30 hover:text-white/60 text-xs" onClick={() => setVisible(false)}>✕</button>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-white/[0.04]">
        <div
          className="h-full bg-blue-500/40 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
