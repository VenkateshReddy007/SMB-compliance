"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

type Node = {
  node_id: string;
  domain: string;
  title: string;
  threshold_type: string;
  threshold_value: unknown;
  due_date_rule: string;
};

type Edge = { source: string; target: string; edge_type?: string };

const DOMAIN_COLOR: Record<string, string> = {
  GST: "#f97316",
  PF: "#fb923c",
  ESI: "#fbbf24",
  FSSAI: "#f59e0b",
  PT: "#fdba74",
  TDS: "#ef4444",
};

export function KGVisualization({
  nodes,
  edges,
  onNodeClick,
  highlightedNodeIds,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (node: Node) => void;
  highlightedNodeIds?: string[];
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo(() => ({ nodes: [...nodes], edges: [...edges] }), [nodes, edges]);

  useEffect(() => {
    const svgEl = ref.current;
    if (!svgEl) return;

    const width = svgEl.clientWidth || 900;
    const height = 560;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Defs for arrow markers
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 20)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 Z")
      .attr("fill", "rgba(249,115,22,0.9)");

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom as any);

    const link = g
      .append("g")
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", (d) => d.edge_type === "invalidates" ? "rgba(239,68,68,0.75)" : "rgba(249,115,22,0.65)")
      .attr("stroke-width", (d) => d.edge_type === "updates" ? 2 : 1.5)
      .attr("stroke-dasharray", (d) => (d.edge_type === "updates" ? "5 3" : d.edge_type === "invalidates" ? "2 5" : "0"))
      .attr("marker-end", "url(#arrowhead)");

    const highlightSet = new Set(highlightedNodeIds ?? []);

    const node = g
      .append("g")
      .selectAll("circle")
      .data(data.nodes as any)
      .join("circle")
      .attr("r", ((d: any) => {
        const connected = data.edges.filter(e => {
          const s = typeof e.source === "object" ? (e.source as any).node_id : e.source;
          const t = typeof e.target === "object" ? (e.target as any).node_id : e.target;
          return s === d.node_id || t === d.node_id;
        }).length;
        return Math.min(16, Math.max(8, 6 + connected * 1.5));
      }) as any)
      .attr("fill", ((d: any) => DOMAIN_COLOR[d.domain] ?? "#f97316") as any)
      .attr("fill-opacity", 0.9)
      .attr("stroke", ((d: any) => (highlightSet.has(d.node_id) ? "#fb923c" : "rgba(249,115,22,0.4)")) as any)
      .attr("stroke-width", ((d: any) => (highlightSet.has(d.node_id) ? 3 : 1.5)) as any)
      .style("cursor", "pointer")
      .on("click", ((_: any, d: any) => onNodeClick?.(d)) as any)
      .on("mousemove", ((event: any, d: any) => {
        if (!tooltipRef.current) return;
        tooltipRef.current.style.opacity = "1";
        tooltipRef.current.style.left = `${event.clientX + 12}px`;
        tooltipRef.current.style.top = `${event.clientY + 12}px`;
        tooltipRef.current.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${d.title}</div>
          <div style="opacity:.6;font-size:10px;font-family:monospace">${d.domain} · ${d.threshold_type} · ${d.due_date_rule}</div>`;
      }) as any)
      .on("mouseleave", (() => {
        if (!tooltipRef.current) return;
        tooltipRef.current.style.opacity = "0";
      }) as any);

    // Node labels
    const labels = g
      .append("g")
      .selectAll("text")
      .data(data.nodes as any)
      .join("text")
      .text(((d: any) => d.title.length > 16 ? d.title.slice(0, 14) + "…" : d.title) as any)
      .attr("font-size", 9)
      .attr("font-family", "monospace")
      .attr("fill", "rgba(255,200,100,0.75)")
      .attr("text-anchor", "middle")
      .attr("dy", -16)
      .style("pointer-events", "none");

    const simulation = d3
      .forceSimulation(data.nodes as any)
      .force("link", d3.forceLink(data.edges as any).id((d: any) => d.node_id).distance(130))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(28));

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick, highlightedNodeIds]);

  return (
    <div className="relative">
      <svg ref={ref} className="w-full h-[560px] rounded-xl border border-orange-500/20 bg-[#0d0a07]" />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 rounded-lg border border-orange-500/30 bg-[#120c05]/95 px-3 py-2 text-xs text-orange-100/90 opacity-0 transition-opacity shadow-xl backdrop-blur"
      />
    </div>
  );
}
