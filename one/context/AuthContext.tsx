"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import type { FirebaseOptions } from "firebase/app";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, getDocs, query, where, arrayUnion, arrayRemove, addDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured as SUPABASE_CONFIGURED } from "@/lib/supabase";
import { upsertUserProfileSupabase } from "@/lib/supabaseHelpers";

export interface UserSettings {
  dms: "everyone" | "followers" | "none";
  visibility: "public" | "msu" | "private";
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
  };
}

export interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  campus?: string | null;
  createdAt?: number;
  followers?: number;
  following?: number;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  settings?: UserSettings;
}

type NotificationItem = {
  id: number;
  type: "follow" | "like" | "comment" | "post";
  from: string;
  postId?: number;
  message?: string;
  time: number;
  read: boolean;
};

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, pass: string, profile?: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => void;
  isFollowing: (targetId: string) => boolean;
  toggleFollow: (targetId: string) => void;
  isBlocked: (targetId: string) => boolean;
  toggleBlock: (targetId: string) => void;
  listFollowing: () => string[];
  listFollowers: () => string[];
  removeFollower: (targetId: string) => void;
  listNotifications: () => NotificationItem[];
  markAllNotificationsRead: () => void;
  notify: (target: string, n: Omit<NotificationItem, "id" | "time" | "read">) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("mock_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const mockRaw = localStorage.getItem("mock_user");
      let saved: string | null = null;
      if (mockRaw) {
        try {
          const mu = JSON.parse(mockRaw) as { email?: string };
          if (mu?.email) {
            saved = localStorage.getItem(`user_profile:${mu.email}`);
          }
        } catch {}
      }
      if (!saved) {
        saved = localStorage.getItem("user_profile");
      }
      if (!saved) return null;
      const parsed: UserProfile = JSON.parse(saved);
      if (parsed.createdAt === undefined) parsed.createdAt = Date.now();
      if (parsed.followers === undefined) parsed.followers = 0;
      if (parsed.following === undefined) parsed.following = 0;
      if (parsed.avatarUrl === undefined) parsed.avatarUrl = null;
      if (parsed.coverUrl === undefined) parsed.coverUrl = null;
      if (!parsed.settings) {
        parsed.settings = {
          dms: "everyone",
          visibility: "public",
          notifications: { likes: true, comments: true, follows: true }
        };
      }
      localStorage.setItem("user_profile", JSON.stringify(parsed));
      return parsed;
    } catch {
      return null;
    }
  });
  const FIREBASE_CONFIGURED =
    Boolean(auth && (auth as unknown as { app?: { options?: unknown } }).app) &&
    ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
  const [loading, setLoading] = useState<boolean>(FIREBASE_CONFIGURED);
  const [followingSet, setFollowingSet] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("following_set");
      if (!raw) return new Set();
      const arr: string[] = JSON.parse(raw);
      return new Set(arr);
    } catch {
      return new Set();
    }
  });
  const [blockedSet, setBlockedSet] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("blocked_set");
      if (!raw) return new Set();
      const arr: string[] = JSON.parse(raw);
      return new Set(arr);
    } catch {
      return new Set();
    }
  });
  const router = useRouter();

  const usersIndexKey = "users_index";
  const upsertUserIndex = (name: string, data: Partial<UserProfile>) => {
    try {
      const raw = localStorage.getItem(usersIndexKey);
      const idx: Record<string, Partial<UserProfile>> = raw ? JSON.parse(raw) : {};
      const base = idx[name] || {};
      idx[name] = {
        displayName: name,
        username: data.username ?? base.username ?? name.toLowerCase().replace(/\s+/g, ""),
        followers: data.followers ?? base.followers ?? 0,
        following: data.following ?? base.following ?? 0,
        campus: data.campus ?? base.campus ?? null,
        avatarUrl: data.avatarUrl ?? base.avatarUrl ?? null,
        coverUrl: data.coverUrl ?? base.coverUrl ?? null,
      };
      localStorage.setItem(usersIndexKey, JSON.stringify(idx));
    } catch {}
  };
  const listFollowersStore = (name: string) => {
    try {
      const raw = localStorage.getItem(`followers_of:${name}`);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch { return new Set<string>(); }
  };
  const saveFollowersStore = (name: string, s: Set<string>) => {
    try { localStorage.setItem(`followers_of:${name}`, JSON.stringify(Array.from(s))); } catch {}
  };
  const listFollowingStore = (name: string) => {
    try {
      const raw = localStorage.getItem(`following_of:${name}`);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch { return new Set<string>(); }
  };
  const saveFollowingStore = (name: string, s: Set<string>) => {
    try { localStorage.setItem(`following_of:${name}`, JSON.stringify(Array.from(s))); } catch {}
  };
  const pushNotification = (target: string, item: NotificationItem) => {
    try {
      const raw = localStorage.getItem(`notifications:${target}`);
      const arr: NotificationItem[] = raw ? JSON.parse(raw) : [];
      const next = [item, ...arr].slice(0, 100);
      localStorage.setItem(`notifications:${target}`, JSON.stringify(next));
    } catch {}
  };
  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      (async () => {
        try {
          const email = user?.email;
          if (email) {
            const ref = doc(db, "users", email);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data() as Partial<UserProfile> & {
                followers?: number; following?: number;
                followersList?: string[]; followingList?: string[];
              };
              const prof: UserProfile = {
                displayName: data.displayName ?? email.split("@")[0],
                username: data.username ?? email.split("@")[0],
                bio: data.bio ?? "Welcome to my profile!",
                location: data.location ?? "Unknown",
                website: data.website ?? "",
                campus: data.campus ?? null,
                createdAt: data.createdAt ?? Date.now(),
                followers: data.followers ?? 0,
                following: data.following ?? 0,
                avatarUrl: data.avatarUrl ?? null,
                coverUrl: data.coverUrl ?? null,
                settings: (data as { settings?: UserSettings }).settings ?? {
                  dms: "everyone",
                  visibility: "public",
                  notifications: { likes: true, comments: true, follows: true }
                }
              };
              setUserProfile(prof);
              localStorage.setItem("user_profile", JSON.stringify(prof));
              if (data.followersList) localStorage.setItem(`followers_of:${prof.displayName}`, JSON.stringify(data.followersList));
              if (data.followingList) localStorage.setItem(`following_of:${prof.displayName}`, JSON.stringify(data.followingList));
              upsertUserIndex(prof.displayName, prof);
            } else if (user) {
              const baseProfile: UserProfile = {
                displayName: email.split('@')[0],
                username: email.split('@')[0],
                bio: "Welcome to my profile!",
                location: "Unknown",
                website: "",
                campus: null,
                createdAt: Date.now(),
                followers: 0,
                following: 0,
                avatarUrl: null,
                coverUrl: null
              };
              await setDoc(ref, { ...baseProfile, followersList: [], followingList: [] });
              setUserProfile(baseProfile);
              localStorage.setItem("user_profile", JSON.stringify(baseProfile));
              upsertUserIndex(baseProfile.displayName, baseProfile);
            }
          }
        } catch {}
      })();
      const savedProfile = localStorage.getItem("user_profile");
      if (savedProfile) {
        const parsed: UserProfile = JSON.parse(savedProfile);
        if (parsed.createdAt === undefined) parsed.createdAt = Date.now();
        if (parsed.followers === undefined) parsed.followers = 0;
        if (parsed.following === undefined) parsed.following = 0;
        if (parsed.avatarUrl === undefined) parsed.avatarUrl = null;
        if (parsed.coverUrl === undefined) parsed.coverUrl = null;
        if (!parsed.settings) {
          parsed.settings = {
            dms: "everyone",
            visibility: "public",
            notifications: { likes: true, comments: true, follows: true }
          };
        }
        setUserProfile(parsed);
        localStorage.setItem("user_profile", JSON.stringify(parsed));
      }
      const savedFollowing = localStorage.getItem("following_set");
      if (savedFollowing) {
        try {
          const ids: string[] = JSON.parse(savedFollowing);
          setFollowingSet(new Set(ids));
        } catch {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [FIREBASE_CONFIGURED]);

  const updateUserProfile = (profile: UserProfile) => {
    try {
      const prevRaw = localStorage.getItem("user_profile");
      const prev: UserProfile | null = prevRaw ? JSON.parse(prevRaw) : userProfile;
      const oldName = prev?.displayName?.trim();
      const newName = profile.displayName?.trim();
      // Persist profile first
      setUserProfile(profile);
      localStorage.setItem("user_profile", JSON.stringify(profile));
      (async () => {
        try {
          if (FIREBASE_CONFIGURED) {
            const email = user?.email;
            if (email) {
              const ref = doc(db, "users", email);
              await updateDoc(ref, { ...profile });
            }
          }
        } catch {}
        try {
          const email = user?.email || (JSON.parse(localStorage.getItem("mock_user") || "{}") as { email?: string }).email;
          if (SUPABASE_CONFIGURED && email) {
            await upsertUserProfileSupabase(email, profile as unknown as Record<string, unknown>);
          }
        } catch {}
      })();
      try {
        const email = user?.email || (JSON.parse(localStorage.getItem("mock_user") || "{}") as { email?: string }).email;
        if (email) {
          localStorage.setItem(`user_profile:${email}`, JSON.stringify(profile));
        }
      } catch {}
      upsertUserIndex(profile.displayName, profile);
      // Propagate display name change into stored posts
      if (oldName && newName && oldName !== newName) {
        const postsRaw = localStorage.getItem("posts");
        if (postsRaw) {
          try {
            const arr = JSON.parse(postsRaw) as Array<{ user: string }>;
            let changed = false;
            const nextArr = arr.map(p => {
              if (p && p.user === oldName) {
                changed = true;
                return { ...p, user: newName };
              }
              return p;
            });
            if (changed) {
              localStorage.setItem("posts", JSON.stringify(nextArr));
            }
          } catch {}
        }
        try {
          const fset = listFollowersStore(oldName);
          saveFollowersStore(newName, fset);
          localStorage.removeItem(`followers_of:${oldName}`);
        } catch {}
      }
    } catch {
      setUserProfile(profile);
      localStorage.setItem("user_profile", JSON.stringify(profile));
    }
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const isFirebaseConfigured =
        Boolean(auth && auth.app && auth.app.options) &&
        ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
      
      if (isFirebaseConfigured) {
        let cred: Awaited<ReturnType<typeof signInWithEmailAndPassword>>;
        try {
          cred = await signInWithEmailAndPassword(auth, email, pass);
        } catch (e: unknown) {
          // If this email uses Google provider, guide user to use Google sign-in
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods && methods.includes("google.com")) {
              const ex = new Error("use-google") as Error & { code?: string };
              ex.code = "use-google";
              throw ex;
            }
          } catch {}
          throw e as Error;
        }
        try {
          const ref = doc(db, "users", email);
          const snap = await getDoc(ref);
          const baseProfile: UserProfile = {
            displayName: email.split("@")[0],
            username: email.split("@")[0],
            bio: "Welcome to my profile!",
            location: "Unknown",
            website: "",
            campus: null,
            createdAt: Date.now(),
            followers: 0,
            following: 0,
            avatarUrl: null,
            coverUrl: null,
            settings: {
              dms: "everyone",
              visibility: "public",
              notifications: { likes: true, comments: true, follows: true }
            }
          };
          if (!snap.exists()) {
            const sv = Date.now();
            await setDoc(ref, { ...baseProfile, followersList: [], followingList: [], sessionVersion: sv });
            try { localStorage.setItem(`sessionVersion:${email}`, String(sv)); } catch {}
            setUser(cred.user);
            setUserProfile(baseProfile);
            localStorage.setItem("user_profile", JSON.stringify(baseProfile));
            upsertUserIndex(baseProfile.displayName, baseProfile);
          } else {
            const data = snap.data() as Partial<UserProfile> & { followers?: number; following?: number; followersList?: string[]; followingList?: string[]; };
            const prof: UserProfile = {
              displayName: data.displayName ?? baseProfile.displayName,
              username: data.username ?? baseProfile.username,
              bio: data.bio ?? baseProfile.bio,
              location: data.location ?? baseProfile.location,
              website: data.website ?? baseProfile.website,
              campus: data.campus ?? baseProfile.campus,
              createdAt: data.createdAt ?? baseProfile.createdAt,
              followers: data.followers ?? 0,
              following: data.following ?? 0,
              avatarUrl: data.avatarUrl ?? null,
              coverUrl: data.coverUrl ?? null,
              settings: (data as { settings?: UserSettings }).settings ?? baseProfile.settings
            };
            const sv = Date.now();
            try { await updateDoc(ref, { sessionVersion: sv }); } catch {}
            try { localStorage.setItem(`sessionVersion:${email}`, String(sv)); } catch {}
            setUser(cred.user);
            setUserProfile(prof);
            localStorage.setItem("user_profile", JSON.stringify(prof));
            if (data.followersList) localStorage.setItem(`followers_of:${prof.displayName}`, JSON.stringify(data.followersList));
            if (data.followingList) localStorage.setItem(`following_of:${prof.displayName}`, JSON.stringify(data.followingList));
            upsertUserIndex(prof.displayName, prof);
          }
        } catch {}
        try {
          if (SUPABASE_CONFIGURED) {
            await upsertUserProfileSupabase(email, (userProfile || {}) as unknown as Record<string, unknown>);
          }
        } catch {}
      } else {
        await new Promise(resolve => setTimeout(resolve, 50)); // Fake delay
        const usersRaw = localStorage.getItem("registered_users");
        const users: Record<string, { password: string }> = usersRaw ? JSON.parse(usersRaw) : {};
        const rec = users[email];
        if (!rec || rec.password !== pass) {
          throw new Error("invalid_credentials");
        }
        const mu = { uid: "mock-123", email } as User;
        setUser(mu);
        localStorage.setItem("mock_user", JSON.stringify(mu));
        const profileRaw = localStorage.getItem(`user_profile:${email}`);
        if (profileRaw) {
          const parsed: UserProfile = JSON.parse(profileRaw);
          if (!parsed.settings) {
            parsed.settings = {
              dms: "everyone",
              visibility: "public",
              notifications: { likes: true, comments: true, follows: true }
            };
          }
          setUserProfile(parsed);
          localStorage.setItem("user_profile", JSON.stringify(parsed));
          upsertUserIndex(parsed.displayName, parsed);
        }
      }
      // Caller handles redirect to allow animations
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const isFirebaseConfigured =
      Boolean(auth && auth.app && auth.app.options) &&
      ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
    if (!isFirebaseConfigured) throw new Error("unavailable");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    let cred: Awaited<ReturnType<typeof signInWithPopup>>;
    try {
      cred = await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      const err = e as { code?: string };
      const c = err?.code;
      if (c && (c.includes("popup-blocked") || c.includes("cancelled-popup-request"))) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e as Error;
    }
    setUser(cred.user);
    const email = cred.user.email as string;
    const ref = doc(db, "users", email);
    let snap;
    try { snap = await getDoc(ref); } catch { snap = undefined; }
    const baseProfile: UserProfile = {
      displayName: cred.user.displayName || email.split("@")[0],
      username: (cred.user.displayName || email.split("@")[0]).replace(/\s+/g, "").toLowerCase(),
      bio: "Welcome to my profile!",
      location: "Unknown",
      website: "",
      campus: null,
      createdAt: Date.now(),
      followers: 0,
      following: 0,
      avatarUrl: null,
      coverUrl: null,
      settings: {
        dms: "everyone",
        visibility: "public",
        notifications: { likes: true, comments: true, follows: true }
      }
    };
    const sv = Date.now();
    try {
      if (!snap || !snap.exists()) {
        await setDoc(ref, { ...baseProfile, followersList: [], followingList: [], sessionVersion: sv });
        setUserProfile(baseProfile);
        localStorage.setItem("user_profile", JSON.stringify(baseProfile));
        upsertUserIndex(baseProfile.displayName, baseProfile);
        if (SUPABASE_CONFIGURED) {
          try { await upsertUserProfileSupabase(email, baseProfile as unknown as Record<string, unknown>); } catch {}
        }
      } else {
        const data = snap.data() as Partial<UserProfile> & { followersList?: string[]; followingList?: string[] };
        const prof: UserProfile = {
          displayName: data.displayName ?? baseProfile.displayName,
          username: data.username ?? baseProfile.username,
          bio: data.bio ?? baseProfile.bio,
          location: data.location ?? baseProfile.location,
          website: data.website ?? baseProfile.website,
          campus: data.campus ?? baseProfile.campus,
          createdAt: data.createdAt ?? baseProfile.createdAt,
          followers: data.followers ?? 0,
          following: data.following ?? 0,
          avatarUrl: data.avatarUrl ?? null,
          coverUrl: data.coverUrl ?? null,
          settings: (data as { settings?: UserSettings }).settings ?? {
            dms: "everyone",
            visibility: "public",
            notifications: { likes: true, comments: true, follows: true }
          }
        };
        await updateDoc(ref, { sessionVersion: sv });
        setUserProfile(prof);
        localStorage.setItem("user_profile", JSON.stringify(prof));
        if (data.followersList) localStorage.setItem(`followers_of:${prof.displayName}`, JSON.stringify(data.followersList));
        if (data.followingList) localStorage.setItem(`following_of:${prof.displayName}`, JSON.stringify(data.followingList));
        upsertUserIndex(prof.displayName, prof);
        if (SUPABASE_CONFIGURED) {
          try { await upsertUserProfileSupabase(email, prof as unknown as Record<string, unknown>); } catch {}
        }
      }
    } catch {
      setUserProfile(baseProfile);
      localStorage.setItem("user_profile", JSON.stringify(baseProfile));
      upsertUserIndex(baseProfile.displayName, baseProfile);
      if (SUPABASE_CONFIGURED) {
        try { await upsertUserProfileSupabase(email, baseProfile as unknown as Record<string, unknown>); } catch {}
      }
    }
    try { localStorage.setItem(`sessionVersion:${email}`, String(sv)); } catch {}
  };

  useEffect(() => {
    const isFirebaseConfigured =
      Boolean(auth && auth.app && auth.app.options) &&
      ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
    if (!isFirebaseConfigured) return;
    getRedirectResult(auth).then(async (res) => {
      if (!res) return;
      setUser(res.user);
      const email = res.user.email as string;
      const ref = doc(db, "users", email);
      let snap;
      try { snap = await getDoc(ref); } catch { snap = undefined; }
      const baseProfile: UserProfile = {
        displayName: res.user.displayName || email.split("@")[0],
        username: (res.user.displayName || email.split("@")[0]).replace(/\s+/g, "").toLowerCase(),
        bio: "Welcome to my profile!",
        location: "Unknown",
        website: "",
        campus: null,
        createdAt: Date.now(),
        followers: 0,
        following: 0,
        avatarUrl: null,
        coverUrl: null,
        settings: {
          dms: "everyone",
          visibility: "public",
          notifications: { likes: true, comments: true, follows: true }
        }
      };
      const sv = Date.now();
      try {
        if (!snap || !snap.exists()) {
          await setDoc(ref, { ...baseProfile, followersList: [], followingList: [], sessionVersion: sv });
          setUserProfile(baseProfile);
          localStorage.setItem("user_profile", JSON.stringify(baseProfile));
          upsertUserIndex(baseProfile.displayName, baseProfile);
          if (SUPABASE_CONFIGURED) {
            try { await upsertUserProfileSupabase(email, baseProfile as unknown as Record<string, unknown>); } catch {}
          }
        } else {
          const data = snap.data() as Partial<UserProfile> & { followersList?: string[]; followingList?: string[] };
          const prof: UserProfile = {
            displayName: data.displayName ?? baseProfile.displayName,
            username: data.username ?? baseProfile.username,
            bio: data.bio ?? baseProfile.bio,
            location: data.location ?? baseProfile.location,
            website: data.website ?? baseProfile.website,
            campus: data.campus ?? baseProfile.campus,
            createdAt: data.createdAt ?? baseProfile.createdAt,
            followers: data.followers ?? 0,
            following: data.following ?? 0,
            avatarUrl: data.avatarUrl ?? null,
            coverUrl: data.coverUrl ?? null,
            settings: (data as { settings?: UserSettings }).settings ?? {
              dms: "everyone",
              visibility: "public",
              notifications: { likes: true, comments: true, follows: true }
            }
          };
          await updateDoc(ref, { sessionVersion: sv });
          setUserProfile(prof);
          localStorage.setItem("user_profile", JSON.stringify(prof));
          if (data.followersList) localStorage.setItem(`followers_of:${prof.displayName}`, JSON.stringify(data.followersList));
          if (data.followingList) localStorage.setItem(`following_of:${prof.displayName}`, JSON.stringify(data.followingList));
          upsertUserIndex(prof.displayName, prof);
          if (SUPABASE_CONFIGURED) {
            try { await upsertUserProfileSupabase(email, prof as unknown as Record<string, unknown>); } catch {}
          }
        }
      } catch {
        setUserProfile(baseProfile);
        localStorage.setItem("user_profile", JSON.stringify(baseProfile));
        upsertUserIndex(baseProfile.displayName, baseProfile);
        if (SUPABASE_CONFIGURED) {
          try { await upsertUserProfileSupabase(email, baseProfile as unknown as Record<string, unknown>); } catch {}
        }
      }
      try { localStorage.setItem(`sessionVersion:${email}`, String(sv)); } catch {}
    });
  }, []);

  const signUp = async (email: string, pass: string, profile?: Partial<UserProfile>) => {
    try {
      const isFirebaseConfigured =
        Boolean(auth && auth.app && auth.app.options) &&
        ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
      
      if (isFirebaseConfigured) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const baseProfile: UserProfile = {
          displayName: email.split('@')[0],
          username: email.split('@')[0],
          bio: "Welcome to my profile!",
          location: "Unknown",
          website: "",
          campus: null,
          createdAt: Date.now(),
          followers: 0,
          following: 0,
          avatarUrl: null,
          coverUrl: null,
          settings: {
            dms: "everyone",
            visibility: "public",
            notifications: { likes: true, comments: true, follows: true }
          }
        };
        const merged = { ...baseProfile, ...(profile || {}) };
        const sv = Date.now();
        await setDoc(doc(db, "users", email), { ...merged, followersList: [], followingList: [], sessionVersion: sv });
        try { localStorage.setItem(`sessionVersion:${email}`, String(sv)); } catch {}
        setUser(cred.user);
        setUserProfile(merged);
        localStorage.setItem("user_profile", JSON.stringify(merged));
        localStorage.setItem(`user_profile:${email}`, JSON.stringify(merged));
        upsertUserIndex(merged.displayName, merged);
        if (SUPABASE_CONFIGURED) {
          try { await upsertUserProfileSupabase(email, merged as unknown as Record<string, unknown>); } catch {}
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 50));
        const mockUser = { uid: "mock-123", email } as User;
        setUser(mockUser);
        localStorage.setItem("mock_user", JSON.stringify(mockUser));

        const baseProfile: UserProfile = {
          displayName: email.split('@')[0],
          username: email.split('@')[0],
          bio: "Welcome to my profile!",
          location: "Unknown",
          website: "",
          campus: null,
          createdAt: Date.now(),
          followers: 0,
          following: 0,
          avatarUrl: null,
          coverUrl: null,
          settings: {
            dms: "everyone",
            visibility: "public",
            notifications: { likes: true, comments: true, follows: true }
          }
        };
        const merged = { ...baseProfile, ...(profile || {}) };
        setUserProfile(merged);
        localStorage.setItem("user_profile", JSON.stringify(merged));
        localStorage.setItem(`user_profile:${email}`, JSON.stringify(merged));
        upsertUserIndex(merged.displayName, merged);
        if (SUPABASE_CONFIGURED) {
          try { await upsertUserProfileSupabase(email, merged as unknown as Record<string, unknown>); } catch {}
        }
        // Register credentials locally
        const usersRaw = localStorage.getItem("registered_users");
        const users: Record<string, { password: string }> = usersRaw ? JSON.parse(usersRaw) : {};
        users[email] = { password: pass };
        localStorage.setItem("registered_users", JSON.stringify(users));
      }
      // Redirect control is handled by the caller to allow animations
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const isFirebaseConfigured =
      Boolean(auth && auth.app && auth.app.options) &&
      ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
    
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth);
    } else {
      setUser(null);
      setUserProfile(null);
      localStorage.removeItem("mock_user");
      // Keep user_profile and following_set so campus and preferences persist across sessions
    }
    router.push("/login");
  };

  const isFollowing = (targetId: string) => {
    const me = userProfile?.displayName || "";
    const s = listFollowingStore(me);
    return s.has(targetId);
  };

  const toggleFollow = (targetId: string) => {
    const me = userProfile?.displayName || "";
    if (!me || me === targetId) return;
    const myFollowing = listFollowingStore(me);
    let delta = 0;
    if (myFollowing.has(targetId)) {
      myFollowing.delete(targetId);
      delta = -1;
    } else {
      myFollowing.add(targetId);
      delta = 1;
    }
    saveFollowingStore(me, myFollowing);
    if (userProfile) {
      const updated: UserProfile = { ...userProfile, following: Math.max(0, (userProfile.following ?? 0) + delta) };
      setUserProfile(updated);
      localStorage.setItem("user_profile", JSON.stringify(updated));
      upsertUserIndex(me, updated);
    }
    const tgtFollowers = listFollowersStore(targetId);
    if (delta === 1) {
      tgtFollowers.add(me);
      pushNotification(targetId, { id: Date.now(), type: "follow", from: me, time: Date.now(), read: false });
    } else {
      tgtFollowers.delete(me);
    }
    saveFollowersStore(targetId, tgtFollowers);
    try {
      const raw = localStorage.getItem(usersIndexKey);
      const idx: Record<string, Partial<UserProfile>> = raw ? JSON.parse(raw) : {};
      if (idx[targetId]) {
        idx[targetId].followers = Math.max(0, (idx[targetId].followers ?? 0) + delta);
        localStorage.setItem(usersIndexKey, JSON.stringify(idx));
      }
    } catch {}
    (async () => {
      if (!FIREBASE_CONFIGURED) return;
      try {
        const myEmail = user?.email;
        if (!myEmail) return;
        const myRef = doc(db, "users", myEmail);
        await updateDoc(myRef, {
          following: Math.max(0, (userProfile?.following ?? 0) + delta),
          // store display names for simplicity
          ...(delta === 1 ? { followingList: arrayUnion(targetId) } : { followingList: arrayRemove(targetId) })
        });
        // find target by displayName
        const q = query((await import("firebase/firestore")).collection(db, "users"), where("displayName", "==", targetId));
        const res = await getDocs(q);
        if (!res.empty) {
          const tRef = res.docs[0].ref;
          await updateDoc(tRef, {
            followers: Math.max(0, ((res.docs[0].data().followers as number) ?? 0) + delta),
            ...(delta === 1 ? { followersList: arrayUnion(me) } : { followersList: arrayRemove(me) })
          });
          if (delta === 1) {
            try {
              await addDoc(collection(tRef, "notifications"), {
                type: "follow",
                from: me,
                time: serverTimestamp(),
                read: false
              });
            } catch {}
          }
        }
      } catch {}
    })();
  };

  const isBlocked = (targetId: string) => blockedSet.has(targetId);
  const toggleBlock = (targetId: string) => {
    const next = new Set(blockedSet);
    if (next.has(targetId)) {
      next.delete(targetId);
    } else {
      next.add(targetId);
      // Optional: also remove from following when blocked
      if (followingSet.has(targetId)) {
        const nf = new Set(followingSet);
        nf.delete(targetId);
        setFollowingSet(nf);
        localStorage.setItem("following_set", JSON.stringify(Array.from(nf)));
      }
    }
    setBlockedSet(next);
    localStorage.setItem("blocked_set", JSON.stringify(Array.from(next)));
  };

  const listFollowing = () => {
    const me = userProfile?.displayName || "";
    if (FIREBASE_CONFIGURED && user?.email) {
      try {
        const snap = localStorage.getItem(`following_of:${me}`);
        const arr: string[] = snap ? JSON.parse(snap) : [];
        return arr.sort((a, b) => a.localeCompare(b));
      } catch { return []; }
    }
    return Array.from(listFollowingStore(me)).sort((a, b) => a.localeCompare(b));
  };
  const listFollowers = () => {
    const me = userProfile?.displayName || "";
    if (FIREBASE_CONFIGURED && user?.email) {
      try {
        const snap = localStorage.getItem(`followers_of:${me}`);
        const arr: string[] = snap ? JSON.parse(snap) : [];
        return arr.sort((a, b) => a.localeCompare(b));
      } catch { return []; }
    }
    return Array.from(listFollowersStore(me)).sort((a, b) => a.localeCompare(b));
  };
  const removeFollower = (targetId: string) => {
    const me = userProfile?.displayName || "";
    const s = listFollowersStore(me);
    if (!s.has(targetId)) return;
    s.delete(targetId);
    saveFollowersStore(me, s);
    if (userProfile) {
      const updated: UserProfile = { ...userProfile, followers: Math.max(0, (userProfile.followers ?? 0) - 1) };
      setUserProfile(updated);
      localStorage.setItem("user_profile", JSON.stringify(updated));
      upsertUserIndex(me, updated);
    }
    (async () => {
      if (!FIREBASE_CONFIGURED || !user?.email) return;
      try {
        const myRef = doc(db, "users", user.email);
        await updateDoc(myRef, {
          followers: Math.max(0, (userProfile?.followers ?? 0) - 1),
          followersList: arrayRemove(targetId)
        });
      } catch {}
    })();
  };

  const listNotifications = () => {
    const me = userProfile?.displayName || "";
    try {
      const raw = localStorage.getItem(`notifications:${me}`);
      return raw ? (JSON.parse(raw) as NotificationItem[]) : [];
    } catch { return []; }
  };
  const markAllNotificationsRead = () => {
    const me = userProfile?.displayName || "";
    try {
      const arr = listNotifications().map(n => ({ ...n, read: true }));
      localStorage.setItem(`notifications:${me}`, JSON.stringify(arr));
    } catch {}
  };
  const notify = (target: string, n: Omit<NotificationItem, "id" | "time" | "read">) => {
    pushNotification(target, { ...n, id: Date.now(), time: Date.now(), read: false });
  };

  useEffect(() => {
    if (!FIREBASE_CONFIGURED || !user?.email) return;
    const email = user.email;
    const ref = doc(db, "users", email);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as { sessionVersion?: number } | undefined;
      if (!data) return;
      try {
        const local = Number(localStorage.getItem(`sessionVersion:${email}`) || "0");
        const remote = Number(data.sessionVersion || 0);
        if (remote && local && remote !== local) {
          firebaseSignOut(auth).catch(() => {});
        }
      } catch {}
    });
    return () => unsub();
  }, [FIREBASE_CONFIGURED, user?.email]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signInWithGoogle, signUp, signOut, updateUserProfile, isFollowing, toggleFollow, isBlocked, toggleBlock, listFollowing, listFollowers, removeFollower, listNotifications, markAllNotificationsRead, notify }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
