"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
 

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [campus, setCampus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Quick client-side validation
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!firstName || !lastName || !campus || !emailOk || password.length < 6) {
      setError(!emailOk ? "Enter a valid email address." : password.length < 6 ? "Password must be at least 6 characters." : "Please complete all required fields.");
      setLoading(false);
      return;
    }
    try {
      const fullName = `${firstName} ${middleName} ${lastName}`.trim();
      const usernameSeed = `${firstName}${lastName}` || email.split("@")[0];
      const username = usernameSeed.toLowerCase().replace(/\s+/g, "");
      await signUp(email, password, { displayName: fullName, username, campus });
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/feed");
      }, 400);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const c = (err?.code || err?.message || "").toString();
      let msg = "Failed to create account. Please try again.";
      if (c.includes("auth/email-already-in-use")) {
        msg = "Email already in use. Try logging in or use 'Continue with Google' if you registered with Google.";
      } else if (c.includes("auth/invalid-email")) {
        msg = "Invalid email address.";
      } else if (c.includes("auth/weak-password")) {
        msg = "Password is too weak. Use at least 6 characters.";
      } else if (c.includes("network")) {
        msg = "Network error. Check your connection and try again.";
      }
      setError(msg);
      setLoading(false);
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
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="Juan"
              required
            />
          </motion.div>
          
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
            <input 
              type="text" 
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="S."
            />
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="Dela Cruz"
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
            <input 
              type="email" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
              placeholder="you@example.com"
              required
            />
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
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Start"}
          </motion.button>

          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  await signInWithGoogle();
                  setShowSuccess(true);
                  setTimeout(() => { router.push("/feed"); }, 300);
                } catch (e: unknown) {
                  const er = e as { code?: string; message?: string };
                  const cc = (er?.code || er?.message || "").toString();
                  let msg = "Google sign-in failed. Try again.";
                  if (cc.includes("unavailable")) msg = "Google sign-in unavailable without Firebase configuration.";
                  setError(msg);
                  setLoading(false);
                }
              }}
              className="w-full border border-gray-300 text-gray-800 bg-white py-2 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              disabled={loading}
            >
              Continue with Google
            </button>
          </div>
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
