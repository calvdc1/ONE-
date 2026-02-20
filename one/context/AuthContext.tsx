"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User 
} from "firebase/auth";
import type { FirebaseOptions } from "firebase/app";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
      const savedProfile = localStorage.getItem("user_profile");
      if (savedProfile) {
        const parsed: UserProfile = JSON.parse(savedProfile);
        if (parsed.createdAt === undefined) parsed.createdAt = Date.now();
        if (parsed.followers === undefined) parsed.followers = 0;
        if (parsed.following === undefined) parsed.following = 0;
        if (parsed.avatarUrl === undefined) parsed.avatarUrl = null;
        if (parsed.coverUrl === undefined) parsed.coverUrl = null;
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
        await signInWithEmailAndPassword(auth, email, pass);
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

  const signUp = async (email: string, pass: string, profile?: Partial<UserProfile>) => {
    try {
      const isFirebaseConfigured =
        Boolean(auth && auth.app && auth.app.options) &&
        ((auth.app.options as FirebaseOptions).apiKey !== "YOUR_API_KEY");
      
      if (isFirebaseConfigured) {
        await createUserWithEmailAndPassword(auth, email, pass);
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
          coverUrl: null
        };
        const merged = { ...baseProfile, ...(profile || {}) };
        setUserProfile(merged);
        localStorage.setItem("user_profile", JSON.stringify(merged));
        localStorage.setItem(`user_profile:${email}`, JSON.stringify(merged));
        upsertUserIndex(merged.displayName, merged);
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
    return Array.from(listFollowingStore(me)).sort((a, b) => a.localeCompare(b));
  };
  const listFollowers = () => {
    const me = userProfile?.displayName || "";
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

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signUp, signOut, updateUserProfile, isFollowing, toggleFollow, isBlocked, toggleBlock, listFollowing, listFollowers, removeFollower, listNotifications, markAllNotificationsRead, notify }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
