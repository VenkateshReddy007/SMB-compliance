"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-xs font-mono tracking-widest text-[#3b82f6]">
            RGAI
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            RegGraph AI
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Autonomous Compliance OS
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <SignUp />
        </div>
      </div>
    </div>
  );
}

