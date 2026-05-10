"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Shield,
  Zap,
  Brain,
  GitBranch,
  FileText,
  ChevronRight,
  Activity,
  Lock,
} from "lucide-react";

// ─── Animated particle canvas ───────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate particles
    const N = 80;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(249,115,22,${0.15 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${p.alpha})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />;
}

// ─── Animated counter ────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

// ─── Feature cards ───────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: "Dual-Rail AI Verification",
    desc: "LLM reasoning cross-checked against a deterministic rule engine. Conflicts escalate to HITL automatically.",
    color: "from-orange-500/20 to-amber-500/10",
    border: "border-orange-500/20",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]",
  },
  {
    icon: Zap,
    title: "Autonomous IRDA Watcher",
    desc: "Real-time portal scraping every 30 seconds. Detects regulatory deltas and triggers cascade obligation updates.",
    color: "from-amber-500/20 to-orange-400/10",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
  },
  {
    icon: GitBranch,
    title: "Knowledge Graph",
    desc: "Obligation dependency graph powered by D3. Instantly see which regulations affect which businesses.",
    color: "from-orange-400/20 to-red-500/10",
    border: "border-orange-400/20",
    glow: "shadow-[0_0_20px_rgba(251,115,22,0.15)]",
  },
  {
    icon: FileText,
    title: "GST & Payroll Engine",
    desc: "Real-time PF, ESI, PT, and TDS computation with due-date tracking for all registered businesses.",
    color: "from-amber-600/20 to-orange-500/10",
    border: "border-amber-600/20",
    glow: "shadow-[0_0_20px_rgba(217,119,6,0.15)]",
  },
  {
    icon: Shield,
    title: "DPDP Compliance Vault",
    desc: "Automated breach detection and DPB-ready notification letters. Consent tracking across your portfolio.",
    color: "from-orange-500/20 to-amber-400/10",
    border: "border-orange-500/20",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]",
  },
  {
    icon: Lock,
    title: "Cryptographic Audit Trail",
    desc: "Every agent decision is hash-signed and immutably logged to the CAAL ledger for full accountability.",
    color: "from-red-500/20 to-orange-500/10",
    border: "border-red-500/20",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]",
  },
];

// ─── Main Landing Page ───────────────────────────────────────────────
export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already signed in, send to dashboard
    if (isSignedIn) router.replace("/compliance-feed");
  }, [isSignedIn, router]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080600] text-white selection:bg-orange-500/30">
      {/* ── Animated background ──────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <ParticleCanvas />
        {/* Radial glow spots */}
        <div className="absolute top-0 right-0 w-[60vw] h-[50vh] bg-gradient-radial from-orange-500/8 via-amber-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-gradient-radial from-orange-600/6 to-transparent rounded-full blur-3xl" />
        {/* Diagonal accent bars – mirroring the reference image */}
        <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-orange-500/40 via-amber-400/20 to-transparent" />
        <div className="absolute top-0 right-[6px] w-[1.5px] h-[60%] bg-gradient-to-b from-amber-400/30 to-transparent" />
      </div>

      {/* ── Nav ─────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-orange-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.3)]">
            <Activity className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              RegGraph AI
            </span>
            <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase">
              Compliance OS
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="px-5 py-2 text-sm font-medium text-orange-300 border border-orange-500/30 rounded-lg hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-lg hover:from-orange-400 hover:to-amber-400 transition-all duration-200 shadow-[0_0_16px_rgba(249,115,22,0.4)]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
        {/* Live badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 text-xs font-mono text-orange-300">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
          Autonomous Compliance Intelligence · v1.0
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight max-w-4xl">
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
            Compliance OS
          </span>
          <br />
          <span className="text-white/90">for Indian SMBs</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-white/55 leading-relaxed">
          RegGraph AI autonomously monitors regulatory portals, detects changes,
          cascades obligation updates and escalates to humans — all before your
          deadline.
        </p>

        <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
          <Link
            href="/sign-in"
            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all duration-300 shadow-[0_0_24px_rgba(249,115,22,0.5)] hover:shadow-[0_0_36px_rgba(249,115,22,0.7)] hover:-translate-y-0.5"
          >
            Enter Dashboard
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white/70 border border-white/10 rounded-xl hover:border-orange-500/30 hover:text-white hover:bg-orange-500/5 transition-all duration-300"
          >
            Explore Features
          </a>
        </div>

        {/* ── Stats ─────────────────────── */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 18, suffix: "+", label: "Demo Businesses" },
            { value: 6, suffix: " Portals", label: "Monitored 24/7" },
            { value: 5, suffix: " Agents", label: "AI-Powered" },
            { value: 100, suffix: "%", label: "Audit Coverage" },
          ].map(({ value, suffix, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-mono font-bold text-orange-400">
                <Counter target={value} suffix={suffix} />
              </div>
              <div className="mt-1 text-xs font-mono text-white/35 uppercase tracking-widest">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────── */}
      <section id="features" className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono text-orange-400/70 tracking-widest uppercase mb-2">
            Core Capabilities
          </div>
          <h2 className="text-3xl font-bold text-white/90">
            Every agent, wired and running
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color, border, glow }, i) => (
            <div
              key={title}
              className={`group relative rounded-2xl border ${border} bg-gradient-to-br ${color} p-6 backdrop-blur-sm hover:-translate-y-1 hover:${glow} transition-all duration-300`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.3)] transition-shadow">
                <Icon className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-white/90 mb-2">{title}</h3>
              <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto">
        <div className="relative rounded-2xl border border-orange-500/25 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 p-10 text-center overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.12)]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[repeating-linear-gradient(45deg,rgba(249,115,22,0.05)_0px,rgba(249,115,22,0.05)_1px,transparent_1px,transparent_30px)]" />
          </div>
          <div className="relative">
            <p className="text-xs font-mono text-orange-400/70 uppercase tracking-widest mb-2">
              Hackathon Demo Ready
            </p>
            <h2 className="text-3xl font-bold text-white/90 mb-4">
              See it in action, right now
            </h2>
            <p className="text-sm text-white/50 mb-8 max-w-xl mx-auto">
              All agents are live. Trigger a regulation change in the Admin panel and
              watch the entire cascade fire in under 500ms.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all duration-300 shadow-[0_0_24px_rgba(249,115,22,0.4)] hover:-translate-y-0.5"
            >
              Sign In to Dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="relative z-10 border-t border-orange-500/10 px-8 py-6 flex items-center justify-between text-xs font-mono text-white/25">
        <div>RegGraph AI · HEAPIFY_NMIT · 2026</div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
          Agents Active
        </div>
      </footer>
    </div>
  );
}
