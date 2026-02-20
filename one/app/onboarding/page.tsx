"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingPage() {
  const { user, userProfile, updateUserProfile, loading } = useAuth();
  const router = useRouter();
  const [campus, setCampus] = useState<string>(userProfile?.campus ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userProfile?.campus) {
        router.push("/feed");
      }
    }
  }, [user, userProfile, loading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campus) return;
    setSubmitting(true);
    const nextProfile = {
      ...(userProfile ?? {
        displayName: user?.email?.split("@")[0] ?? "",
        username: user?.email?.split("@")[0] ?? "",
        bio: "Welcome to my profile!",
        location: "Unknown",
        website: "",
      }),
      campus,
    };
    updateUserProfile(nextProfile);
    router.push("/feed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-rose-700 via-red-600 to-rose-400 bg-clip-text text-transparent text-center mb-2">
          ONE
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Choose Your Campus</h1>
        <p className="text-sm text-gray-600 text-center mb-6">Help personalize your feed across MSU campuses.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
              required
            >
              <option value="">Select campus</option>
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
          </div>

          <button
            disabled={!campus || submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50 hover:from-emerald-600 hover:to-emerald-700"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
