"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { createApiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DualRailBadge } from "@/components/compliance/DualRailBadge";
import { SourceTrace } from "@/components/compliance/SourceTrace";
import { ConfidenceScore } from "@/components/compliance/ConfidenceScore";
import { Send, Trash2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string; meta?: any };
type Business = { id: string; name: string };

export default function AssistantPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<Business[]>("/admin/users").then((rows) => {
      setBusinesses(rows);
      if (rows[0]) setBusinessId(rows[0].id);
    });
  }, [api]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setLoading(true);
    try {
      const res = await api.post<any>("/assistant/chat", {
        message: userMsg.text,
        business_id: businessId,
        conversation_history: messages.map((m) => ({ role: m.role, content: m.text })),
      });
      setMessages((m) => [...m, { role: "assistant", text: res.response, meta: res }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const suggestedQuestions = [
    "What is the GST filing due date for this month?",
    "How much PF do I owe for 25 employees?",
    "When does my FSSAI license need renewal?",
    "What changed in GST regulations this week?",
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr] animate-fade-in-up">
      {/* ─── Sidebar ─── */}
      <Card className="glass border-white/[0.06] p-4 space-y-4">
        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">Business Context</div>
          <select
            className="mt-2 w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-2 text-xs font-mono"
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="mt-1 text-[9px] font-mono text-white/20 truncate">{businessId}</div>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase">Suggested</div>
          <div className="mt-2 space-y-1.5">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                className="w-full text-left text-[11px] leading-relaxed rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 hover:bg-white/[0.05] hover:border-blue-500/15 transition-all"
                onClick={() => setText(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div className="text-[10px] font-mono text-white/20 space-y-0.5">
          <div>Messages: {messages.length}</div>
          <div>Model: Gemini + DRCA</div>
          <div>RAG: ChromaDB</div>
        </div>
      </Card>

      {/* ─── Chat Area ─── */}
      <Card className="glass border-white/[0.06] p-5 flex flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 max-h-[560px] overflow-y-auto pr-2">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-40 text-white/20 text-sm">
              Ask a compliance question to get started…
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div
                className={`max-w-[85%] rounded-xl p-4 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-500/15 border border-blue-500/15 text-white/90"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/80"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.role === "assistant" && m.meta && (
                  <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-3">
                    {/* DRCA Badge + Confidence */}
                    <div className="flex items-center gap-3">
                      <DualRailBadge
                        railAgreement={Boolean(m.meta.rail_agreement)}
                        confidence={Number(m.meta.confidence_score ?? 0)}
                        hitlRequired={Boolean(m.meta.hitl_escalated)}
                      />
                      <ConfidenceScore score={Number(m.meta.confidence_score ?? 0)} size="sm" />
                    </div>

                    {/* Rail Comparison */}
                    {m.meta.rail_a_response || m.meta.rail_b_response ? (
                      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 text-[10px] font-mono">
                        <div className="text-white/30 mb-1">Rail Comparison:</div>
                        <div className="text-blue-300/70">Rail A: {typeof m.meta.rail_a_response === "string" ? m.meta.rail_a_response.slice(0, 100) : "LLM response"}</div>
                        <div className="text-emerald-300/70 mt-0.5">Rail B: {typeof m.meta.rail_b_response === "string" ? m.meta.rail_b_response.slice(0, 100) : "Rule engine"}</div>
                        <div className="text-white/20 mt-0.5">Agreement: {m.meta.rail_agreement ? "Yes ✓" : "No ✗"}</div>
                      </div>
                    ) : null}

                    {/* Sources */}
                    {m.meta.sources && m.meta.sources.length > 0 && (
                      <SourceTrace
                        sources={(m.meta.sources ?? []).map((s: any) => ({
                          regulation_id: s.regulation_id ?? s.id ?? "—",
                          portal: s.portal ?? s.source ?? "—",
                          title: s.title ?? "—",
                          fetched_date: s.fetched_date ?? s.effective_date ?? "—",
                        }))}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in-up">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-sm">
                <div className="flex items-center gap-2 text-white/30">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-dot-pulse" />
                  Thinking…
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4">
          <Input
            className="bg-white/[0.04] border-white/[0.06] flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a compliance question…"
            disabled={loading}
          />
          <Button
            className="bg-blue-500 hover:bg-blue-600 h-10 w-10 p-0"
            onClick={send}
            disabled={loading || !text.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-10 w-10 p-0 text-white/30 hover:text-white/60" onClick={() => setMessages([])}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
