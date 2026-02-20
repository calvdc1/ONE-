"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
 

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { signUp, signOut } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) return;
    setLoading(true);
    try {
      const username = name ? name.toLowerCase().replace(/\s+/g, "") : email.split("@")[0];
      await signUp(email, password, { displayName: name || email.split("@")[0], username, campus });
      setShowSuccess(true);
      setTimeout(() => {
        signOut();
      }, 300);
    } catch {
      alert("Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  const sendCode = () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setSending(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setTimeout(() => {
      setSending(false);
      setCodeSent(true);
    }, 600);
  };

  const verifyCode = () => {
    if (codeInput.trim() === generatedCode && codeInput.trim() !== "") {
      setVerified(true);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{
        background:
          "radial-gradient(120% 100% at 50% -20%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%), linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 35%, #2b2b2b 65%, #0a0a0a 100%)",
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-xl shadow-md p-8"
      >
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-center mb-6 text-gray-800"
        >
          Create Account
        </motion.h2>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="John Doe"
              required
            />
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select 
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
              required
            >
                <option value="">Select your campus</option>
                <option value="MSU Main">MSU Main (Marawi)</option>
                <option value="MSU IIT">MSU IIT</option>
                <option value="MSU Gensan">MSU Gensan</option>
                <option value="MSU Tawi-Tawi">MSU Tawi-Tawi</option>
                <option value="MSU Naawan">MSU Naawan</option>
                <option value="MSU Maguindanao">MSU Maguindanao</option>
                <option value="MSU Sulu">MSU Sulu</option>
                <option value="MSU Buug">MSU Buug</option>
                <option value="MSU LNCAT">MSU LNCAT</option>
                <option value="MSU LNAC">MSU LNAC</option>
                <option value="MSU MSAT">MSU MSAT</option>
                <option value="Other">Other</option>
            </select>
          </motion.div>
          
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setVerified(false); setCodeSent(false); setCodeInput(""); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                placeholder="you@example.com"
                required
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={sending || !email}
                className="px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50"
              >
                {sending ? "Sending..." : codeSent ? "Resend" : "Send Code"}
              </button>
            </div>
            {codeSent && !verified && (
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-1">Enter the 6-digit code</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white tracking-widest"
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={verifyCode}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Verify
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-500">Dev preview code: <span className="font-mono">{generatedCode}</span></div>
              </div>
            )}
            {verified && (
              <div className="mt-2 text-sm text-green-600 font-semibold">Email verified</div>
            )}
          </motion.div>
          
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
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
            disabled={loading || !verified}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Creating Account..." : verified ? "Sign Up" : "Verify Email First"}
          </motion.button>
        </form>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-sm text-gray-600"
        >
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Log in
          </Link>
        </motion.div>
      </motion.div>
      {showSuccess && (
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
              className="text-white text-2xl font-extrabold tracking-wide"
            >
              Account Created
            </motion.div>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
            >
              <div className="absolute w-24 h-24 rounded-full bg-white/10 blur-xl -top-6 -left-6" />
              <div className="absolute w-20 h-20 rounded-full bg-white/10 blur-xl -bottom-6 -right-6" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="absolute bottom-6 text-white/90 text-sm font-semibold"
            >
              Redirecting to Log In
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
