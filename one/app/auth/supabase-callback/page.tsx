"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SupabaseCallback() {
  const router = useRouter();
  const { completeSupabaseOAuth } = useAuth();
  useEffect(() => {
    (async () => {
      try {
        await completeSupabaseOAuth();
        router.replace("/feed");
      } catch {
        router.replace("/login");
      }
    })();
  }, [completeSupabaseOAuth, router]);
  return null;
}
