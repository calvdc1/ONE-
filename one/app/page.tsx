"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 text-center overflow-hidden hero-metallic text-gray-100">
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
      
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/25 via-amber-300/10 to-red-500/25 blur-2xl scale-110" aria-hidden="true" />
        <h1 className="relative text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-amber-300 via-amber-500 to-rose-400 bg-clip-text text-transparent tracking-tight mb-3">
          ONE
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-100/20 text-amber-200 text-xs md:text-sm"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
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
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
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
