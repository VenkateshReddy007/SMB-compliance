"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { createApiClient } from "@/lib/api-client";
import { KGVisualization } from "@/components/graph/KGVisualization";

export default function KGExplorerPage() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);
  
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gData, sData] = await Promise.all([
          api.get("/knowledge/graph"),
          api.get("/knowledge/rag/stats"),
        ]);
        setGraphData(gData as any);
        setStats(sData);
      } catch (e) {
        console.error("Failed to load KG:", e);
      }
    };
    fetchData();
  }, [api]);

  return (
    <div className="flex h-full flex-col p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph Explorer</h1>
          <p className="text-white/60 text-sm mt-1">
            Visualizing Regulatory Dependencies and Vector Store Corpus
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-orange-500/20">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Graph Nodes: {graphData?.nodes.length || 0}
          </div>
          <div className="glass px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            ChromaDB Regulations: {stats?.count || 0}
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-[600px]">
        {/* Main Graph Area */}
        <div className="flex-1 glass rounded-xl relative overflow-hidden">
          {graphData ? (
            <KGVisualization
              nodes={graphData.nodes.map((n) => ({
                node_id: n.node_id,
                domain: n.domain,
                title: n.title,
                threshold_type: n.threshold_type,
                threshold_value: n.threshold_value,
                due_date_rule: n.due_date_rule,
              }))}
              edges={graphData.edges}
              width={800}
              height={600}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              Loading Knowledge Graph...
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-4">
          <div className="glass rounded-xl p-4 flex flex-col gap-4">
            <h3 className="font-medium flex items-center gap-2 text-sm text-white/80">
              <Search className="w-4 h-4" /> Search Graph
            </h3>
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-orange-500/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          <div className="glass rounded-xl p-4 flex-1 overflow-auto">
            <h3 className="font-medium flex items-center gap-2 text-sm text-white/80 mb-4">
              <Filter className="w-4 h-4" /> Node Registry
            </h3>
            <div className="flex flex-col gap-2">
              {graphData?.nodes
                .filter((n) => n.node_id.toLowerCase().includes(search.toLowerCase()))
                .map((node) => (
                  <div
                    key={node.node_id}
                    className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium">{node.title}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-white/50">
                        {node.domain}
                      </span>
                      <span className="text-xs text-white/70">
                        {node.threshold_type !== "N/A" ? "Conditional" : "Mandatory"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
