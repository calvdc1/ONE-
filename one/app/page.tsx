"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const sparkles = [
    { top: "10%", left: "14%" },
    { top: "22%", left: "78%" },
    { top: "36%", left: "20%" },
    { top: "54%", left: "72%" },
    { top: "68%", left: "16%" },
    { top: "82%", left: "60%" },
  ];
  const campusChips = [
    { text: "MSU Main", slug: "msu-main", top: "12%", left: "8%" },
    { text: "MSU IIT", slug: "msu-iit", top: "26%", left: "82%" },
    { text: "MSU Gensan", slug: "msu-gensan", top: "38%", left: "12%" },
    { text: "MSU Tawi-Tawi", slug: "msu-tawi-tawi", top: "56%", left: "76%" },
    { text: "MSU Naawan", slug: "msu-naawan", top: "18%", left: "74%" },
    { text: "MSU Maguindanao", slug: "msu-maguindanao", top: "64%", left: "10%" },
    { text: "MSU Sulu", slug: "msu-sulu", top: "44%", left: "84%" },
    { text: "MSU Buug", slug: "msu-buug", top: "70%", left: "68%" },
    { text: "MSU LNCAT", slug: "msu-lncat", top: "30%", left: "6%" },
    { text: "MSU LNAC", slug: "msu-lnac", top: "20%", left: "56%" },
    { text: "MSU MSAT", slug: "msu-msat", top: "48%", left: "28%" },
  ];
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [logoError, setLogoError] = useState(false);
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen p-8 text-center overflow-hidden hero-metallic text-gray-100"
      onMouseMove={(e) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        const nx = (e.clientX / w - 0.5) * 2;
        const ny = (e.clientY / h - 0.5) * 2;
        setMouse({ x: nx, y: ny });
      }}
    >
      <motion.div
        aria-hidden
        animate={{ x: mouse.x * 20, y: mouse.y * 12 }}
        transition={{ type: "spring", stiffness: 40, damping: 18 }}
        className="pointer-events-none absolute -top-40 -right-28 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(248,196,64,0.18),transparent_60%)] blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: mouse.x * -16, y: mouse.y * -10 }}
        transition={{ type: "spring", stiffness: 40, damping: 18 }}
        className="pointer-events-none absolute -bottom-44 -left-32 w-[26rem] h-[26rem] rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(229,57,53,0.22),transparent_60%)] blur-3xl"
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(248,196,64,0.15),transparent_60%)] blur-3xl"
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="pointer-events-none absolute bottom-[-6rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(229,57,53,0.18),transparent_60%)] blur-3xl"
      />
      <motion.svg
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 1 }}
        className="pointer-events-none absolute top-0 left-0 w-full text-amber-200/30"
        viewBox="0 0 1440 90"
      >
        <defs>
          <linearGradient id="wave" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(245,197,24,0.35)" />
            <stop offset="100%" stopColor="rgba(229,57,53,0.35)" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0,64 C240,96 480,32 720,64 C960,96 1200,32 1440,64 L1440,0 L0,0 Z"
          fill="url(#wave)"
          animate={{ d: [
            "M0,64 C240,96 480,32 720,64 C960,96 1200,32 1440,64 L1440,0 L0,0 Z",
            "M0,64 C240,48 480,96 720,64 C960,32 1200,96 1440,64 L1440,0 L0,0 Z",
            "M0,64 C240,96 480,32 720,64 C960,96 1200,32 1440,64 L1440,0 L0,0 Z",
          ]}}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>
      <motion.svg
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 1 }}
        className="pointer-events-none absolute inset-0 w-full h-full text-amber-200/20"
      >
        <defs>
          <pattern id="one-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#one-grid)" />
      </motion.svg>
      <motion.div
        aria-hidden="true"
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 360, opacity: 0.35 }}
        transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
        className="pointer-events-none absolute w-[36rem] h-[36rem] rounded-full border border-amber-400/30 blur-sm"
      />
      {sparkles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 2.6 + i * 0.2, repeat: Infinity }}
          style={{ top: p.top, left: p.left }}
          className="pointer-events-none absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(245,197,24,0.6)]"
        />
      ))}
      {campusChips.map((c, i) => (
        <motion.div
          key={c.slug}
          style={{ top: c.top, left: c.left }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.9, y: [0, -6, 0], x: [0, 4, 0] }}
          transition={{ duration: 4 + (i % 4), repeat: Infinity }}
          className="absolute pointer-events-none select-none"
          aria-hidden="true"
        >
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-400/30 bg-amber-100/10 text-amber-200 backdrop-blur">
            {c.text}
          </span>
        </motion.div>
      ))}
      <motion.div
        aria-hidden
        animate={{ x: mouse.x * 30, y: mouse.y * 20 }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
        className="pointer-events-none absolute w-36 h-36 rounded-full border border-amber-400/30"
        style={{ mixBlendMode: "screen" }}
      />
      
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/25 via-amber-300/10 to-red-500/25 blur-2xl scale-110" aria-hidden="true" />
        <div className="absolute -inset-x-20 -top-6 h-24 bg-gradient-to-b from-amber-500/10 to-transparent blur-xl" aria-hidden="true" />
        {logoError ? (
          <motion.h1
            whileHover={{ scale: 1.02, rotate: -0.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-amber-300 via-amber-500 to-rose-400 bg-clip-text text-transparent tracking-tight mb-3"
          >
            ONE
            <motion.span
              aria-hidden="true"
              initial={{ x: "-120%" }}
              animate={{ x: "220%" }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-white/0 via-amber-200/40 to-white/0 skew-x-12"
            />
          </motion.h1>
        ) : (
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative mx-auto mb-3"
          >
            <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-amber-400/20 via-red-500/10 to-transparent blur-2xl" aria-hidden="true" />
            <Image
              src="/onemsu-logo.png"
              alt="ONEMSU"
              width={260}
              height={260}
              priority
              onError={() => setLogoError(true)}
              className="mx-auto w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-[0_10px_30px_rgba(255,180,80,0.25)]"
            />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-100/20 text-amber-200 text-xs md:text-sm"
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-amber-400"
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          Mindanao State University • Philippines
        </motion.div>
      </motion.div>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-lg md:text-xl text-gray-100/90 mt-4 mb-10 max-w-xl"
      >
        Connect with your MSU community.
      </motion.p>
      
      <div className="relative z-10 flex flex-col gap-4 w-full max-w-xs">
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <Link 
            href="/login" 
            className="block w-full bg-gradient-to-r from-amber-400 via-red-600 to-rose-500 text-white py-3 rounded-lg font-semibold transition hover:from-amber-500 hover:via-red-700 hover:to-rose-600"
            >
            Log In
            </Link>
        </motion.div>
        
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <Link 
            href="/signup" 
            className="block w-full bg-gradient-to-r from-amber-400 to-red-600 text-white py-3 rounded-lg font-semibold transition hover:from-amber-500 hover:to-rose-700"
            >
            Sign Up
            </Link>
        </motion.div>
      </div>
    </div>
  );
}
