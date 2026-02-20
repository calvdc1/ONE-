"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAnim, setShowAnim] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const [otpPhase, setOtpPhase] = useState<null | { email: string }>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      await beginOtp(email);
    } catch {
      alert("Failed to login. Please check your credentials.");
      setLoading(false);
    }
  };

  const beginOtp = async (emailAddr: string) => {
    try {
      setOtpSending(true);
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr }),
      });
      if (!res.ok) throw new Error("otp_send_failed");
      setOtpPhase({ email: emailAddr });
    } finally {
      setOtpSending(false);
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpPhase) return;
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpPhase.email, code: otpCode }),
    });
    if (res.ok) {
      setShowAnim(true);
      setTimeout(() => { router.push("/feed"); }, 300);
    } else {
      alert("Invalid or expired code. Please try again.");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{
        background:
          "radial-gradient(120% 100% at 50% -20%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%), linear-gradient(135deg, #5a0f0f 0%, #9c1515 32%, #e03131 64%, #5a0f0f 100%)",
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-xl shadow-md p-8"
      >
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-center mb-6 text-gray-800"
        >
          Welcome MSUan
        </motion.h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="you@example.com"
              required
            />
          </motion.div>
          
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="••••••••"
              required
            />
          </motion.div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          className="w-full bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50 hover:from-rose-800 hover:via-red-700 hover:to-rose-600"
          >
            {loading ? "Logging in..." : "Log In"}
          </motion.button>
        </form>
        
        {otpPhase && (
          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-2 text-sm text-gray-700">
              We sent a 6‑digit code to <span className="font-semibold">{otpPhase.email}</span>. Enter it below to continue.
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="\\d{6}"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                placeholder="123456"
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpCode.length !== 6}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                Verify
              </button>
            </div>
            <button
              type="button"
              onClick={() => beginOtp(otpPhase.email)}
              disabled={otpSending}
              className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        )}
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-gray-600"
        >
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
            Sign up
          </Link>
        </motion.div>
      </motion.div>
      {showAnim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -5, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="relative w-80 h-80 rounded-3xl bg-gradient-to-br from-rose-700 via-red-600 to-rose-400 flex items-center justify-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-white text-6xl font-extrabold tracking-widest"
            >
              ONE
            </motion.div>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
            >
              <div className="absolute w-24 h-24 rounded-full bg-white/10 blur-xl -top-6 -left-6" />
              <div className="absolute w-20 h-20 rounded-full bg-white/10 blur-xl -bottom-6 -right-6" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
