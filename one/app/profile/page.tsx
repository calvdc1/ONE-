"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings, MapPin, Calendar, Edit, LogOut, X, Save, Image as ImageIcon, User as UserIcon, MoreHorizontal, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { db, app } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile, signOut, listFollowing, listFollowers, toggleFollow, removeFollower, isFollowing } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  type Post = {
    id: number;
    user: string;
    campus: string;
    content: string;
    time: string;
    likes: number;
    comments: number;
    liked: boolean;
    expanded: boolean;
  };
  const [editForm, setEditForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    location: "",
    website: ""
  });
  const [settingsForm, setSettingsForm] = useState({
    campus: ""
  });
  const onFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      showToast("Only images and GIFs are allowed", "error");
      return;
    }
    const dataUrl = await onFileToDataUrl(f);
    const base = userProfile ?? {
      displayName: editForm.displayName || "",
      username: editForm.username || "",
      bio: editForm.bio || "",
      location: editForm.location || "",
      website: editForm.website || "",
      campus: null,
      createdAt: Date.now(),
      followers: 0,
      following: 0,
      avatarUrl: null,
      coverUrl: null
    };
    const nextProfile = { ...base, avatarUrl: dataUrl };
    updateUserProfile(nextProfile);
    showToast("Profile photo updated", "success");
  };
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      showToast("Only images and GIFs are allowed", "error");
      return;
    }
    const dataUrl = await onFileToDataUrl(f);
    const base = userProfile ?? {
      displayName: editForm.displayName || "",
      username: editForm.username || "",
      bio: editForm.bio || "",
      location: editForm.location || "",
      website: editForm.website || "",
      campus: null,
      createdAt: Date.now(),
      followers: 0,
      following: 0,
      avatarUrl: null,
      coverUrl: null
    };
    const nextProfile = { ...base, coverUrl: dataUrl };
    updateUserProfile(nextProfile);
    showToast("Cover image updated", "success");
  };

  const readAllPosts = (): Post[] => {
    try {
      const s = typeof window !== "undefined" ? localStorage.getItem("posts") : null;
      return s ? (JSON.parse(s) as Post[]) : [];
    } catch { return []; }
  };
  const [posts] = useState<Post[]>(readAllPosts);
  const [allPosts, setAllPosts] = useState<Post[]>(posts);
  const savePosts = (next: Post[]) => {
    setAllPosts(next);
    try { localStorage.setItem("posts", JSON.stringify(next)); } catch {}
  };
  const authorName = user?.displayName || user?.email?.split("@")[0] || "Me";
  const myPosts = allPosts.filter((p: Post) => p.user === authorName);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isFirebaseConfigured = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (app.options as any) || {};
      return Boolean(opts.apiKey && opts.apiKey !== "YOUR_API_KEY");
    } catch { return false; }
  }, []);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);

  const searchParams = useSearchParams();
  const viewedName = searchParams.get("user") || "";
  const currentName = userProfile?.displayName?.trim() || "";
  const isSelf = !viewedName || viewedName.trim() === "" || viewedName === currentName || viewedName === userProfile?.username;
  const userKey = user?.email || user?.uid || "guest";

  useEffect(() => {
    const name = (viewedName && !isSelf) ? viewedName : (userProfile?.displayName || "");
    if (!isFirebaseConfigured || !name) {
      setProfilePosts(isSelf ? myPosts : allPosts.filter((p: Post) => p.user === name));
      return;
    }
    const q = query(collection(db, "posts"), where("user", "==", name), orderBy("id", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Post[] = [];
      snap.forEach(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = d.data() as any;
        let t = data?.time || "";
        try {
          if (data?.createdAt && typeof data.createdAt.toDate === "function") {
            t = data.createdAt.toDate().toLocaleString();
          }
        } catch {}
        list.push({
          id: data.id,
          user: data.user || "",
          campus: data.campus || "",
          content: data.content || "",
          time: t || "Just now",
          likes: typeof data.likes === "number" ? data.likes : 0,
          comments: typeof data.comments === "number" ? data.comments : 0,
          liked: false,
          expanded: false
        });
      });
      setProfilePosts(list);
    });
    return () => unsub();
  }, [isFirebaseConfigured, viewedName, isSelf, userProfile?.displayName, myPosts, allPosts]);

  type Thread = {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    createdBy: string;
  };

  const readThreads = (): Thread[] => {
    try {
      const raw = localStorage.getItem(`threads:${userKey}`);
      const parsed: Thread[] = raw ? JSON.parse(raw) : [];
      return parsed.filter(t => t.createdBy === userKey);
    } catch { return []; }
  };
  const saveThreads = (list: Thread[]) => {
    try { localStorage.setItem(`threads:${userKey}`, JSON.stringify(list)); } catch {}
  };
  const ensureThreadWith = (name: string): string => {
    const list = readThreads();
    const found = list.find(t => t.name === name);
    if (found) return found.id;
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const t: Thread = { id, name, lastMessage: "Say hi!", time: "", unread: 0, createdBy: userKey };
    const next = [t, ...list];
    saveThreads(next);
    return id;
  };

  const displayProfile = (() => {
    if (!userProfile && !viewedName) return null;
    if (isSelf) return userProfile;
    const name = viewedName;
    const username = name.toLowerCase().replace(/\s+/g, "");
    const userPosts = allPosts.filter(p => p.user === name);
    const campusFromPosts = userPosts.length > 0 ? userPosts[0].campus : null;
    const readIndex = (): Record<string, { followers?: number; following?: number }> => {
      try {
        const raw = localStorage.getItem("users_index");
        return raw ? (JSON.parse(raw) as Record<string, { followers?: number; following?: number }>) : {};
      } catch { return {}; }
    };
    const idx = readIndex();
    const readSetLen = (key: string) => {
      try { return (JSON.parse(localStorage.getItem(key) || "[]") as unknown[]).length; } catch { return 0; }
    };
    const followersCount = (idx[name]?.followers ?? readSetLen(`followers_of:${name}`)) || 0;
    const followingCount = (idx[name]?.following ?? readSetLen(`following_of:${name}`)) || 0;
    return {
      displayName: name,
      username,
      bio: "",
      location: "Unknown",
      website: "",
      campus: campusFromPosts,
      createdAt: undefined,
      followers: followersCount,
      following: followingCount,
      avatarUrl: null,
      coverUrl: null
    } as typeof userProfile;
  })();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(editForm);
    setIsEditing(false);
    showToast("Profile updated successfully!", "success");
  };

  const joinedText = !displayProfile?.createdAt
    ? "Joined —"
    : (() => {
        const d = new Date(displayProfile.createdAt as number);
        const formatter = new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
        return `Joined ${formatter.format(d)}`;
      })();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-4xl lg:max-w-5xl px-4 pb-24"
    >
      {!displayProfile ? (
        <div className="p-4 text-center">Loading profile...</div>
      ) : (
      <>
      <header className="flex items-center gap-2 px-4 pt-4 mb-2">
        <UserIcon className="w-6 h-6 text-red-600" />
        <h1 className="text-2xl font-bold text-metallic-gold">Profile</h1>
      </header>
      <div className="card-dark pb-6 shadow-sm relative">
        <div className="h-32 relative">
          {displayProfile.coverUrl ? (
            <Image src={displayProfile.coverUrl} alt="Cover" fill sizes="100vw" className="object-cover rounded-t-xl" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-yellow-500 via-orange-600 to-red-900" />
          )}
          {isSelf && (
            <label className="absolute right-3 top-3 bg-zinc-900/70 text-gray-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-zinc-800 inline-flex items-center text-sm">
              <ImageIcon className="w-4 h-4 mr-1" />
              Change cover
              <input onChange={handleCoverChange} type="file" accept="image/*" className="hidden" />
            </label>
          )}
        </div>
        
        <div className="px-4">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`w-24 h-24 bg-zinc-900 p-1 rounded-full relative z-10 ${isSelf ? "cursor-pointer" : ""}`}
            >
              <label className="block w-full h-full">
                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500 overflow-hidden relative">
                  {displayProfile.avatarUrl ? (
                    <Image src={displayProfile.avatarUrl} alt="Avatar" fill sizes="96px" className="object-cover rounded-full" />
                  ) : (
                    displayProfile.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                {isSelf && <input onChange={handleAvatarChange} accept="image/*" type="file" className="hidden" />}
              </label>
            </motion.div>
            
            <div className="flex gap-2 mb-2">
                {isSelf ? (
                  <>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                          setEditForm(displayProfile);
                          setIsEditing(true);
                      }}
                      className="bg-zinc-800 text-gray-100 px-4 py-2 rounded-lg text-sm font-semibold flex items-center hover:bg-zinc-700 transition"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const link = typeof window !== "undefined"
                          ? `${window.location.origin}/profile?user=${encodeURIComponent(displayProfile.displayName)}`
                          : `/profile?user=${encodeURIComponent(displayProfile.displayName)}`;
                        navigator.clipboard.writeText(link);
                        showToast("Profile link copied", "success");
                      }}
                      className="bg-zinc-800 text-gray-100 p-2 rounded-lg hover:bg-zinc-700 transition"
                      title="Share Profile"
                    >
                      <Share2 className="w-5 h-5" />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSettingsForm({ campus: displayProfile?.campus ?? "" });
                        setIsSettingsOpen(true);
                      }}
                      className="bg-zinc-800 text-gray-100 p-2 rounded-lg hover:bg-zinc-700 transition"
                    >
                      <Settings className="w-5 h-5" />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsLoggingOut(true);
                        setTimeout(() => { signOut(); }, 300);
                      }}
                      className="bg-red-900/20 text-red-400 p-2 rounded-lg hover:bg-red-900/30 transition"
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleFollow(displayProfile.displayName)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${isFollowing(displayProfile.displayName) ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {isFollowing(displayProfile.displayName) ? "Following" : "Follow"}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const link = typeof window !== "undefined"
                          ? `${window.location.origin}/profile?user=${encodeURIComponent(displayProfile.displayName)}`
                          : `/profile?user=${encodeURIComponent(displayProfile.displayName)}`;
                        navigator.clipboard.writeText(link);
                        showToast("Profile link copied", "success");
                      }}
                      className="bg-zinc-800 text-gray-100 p-2 rounded-lg hover:bg-zinc-700 transition"
                      title="Share Profile"
                    >
                      <Share2 className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!user) { showToast("Log in to send messages", "error"); return; }
                        const id = ensureThreadWith(displayProfile.displayName);
                        showToast(`Chat with ${displayProfile.displayName}`, "success");
                        router.push(`/messages/${encodeURIComponent(id)}`);
                      }}
                      className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-rose-900 hover:via-red-800 hover:to-rose-600 transition"
                    >
                      Message
                    </motion.button>
                  </>
                )}
            </div>
          </div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-metallic-gold">{displayProfile.displayName}</h1>
            <p className="text-white text-sm mb-4">@{displayProfile.username}</p>
            
            <p className="text-white mb-4 whitespace-pre-wrap">
                {displayProfile.bio}
            </p>
            
            <div className="flex items-center flex-wrap gap-4 text-sm text-white mb-6">
                <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {displayProfile.location}
                </div>
                {displayProfile.campus && (
                  <div className="px-2 py-1 rounded-full border border-emerald-600/30 bg-emerald-50 text-emerald-700">
                    {displayProfile.campus}
                  </div>
                )}
                <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {joinedText}
                </div>
            </div>
            
            <div className="flex gap-8 border-t border-gray-100 pt-4">
                <button onClick={() => isSelf && setShowFollowingModal(true)} className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition">
                <span className="block font-bold text-metallic-gold">{displayProfile.following ?? 0}</span>
                <span className="text-xs text-gray-500">Following</span>
                </button>
                <button onClick={() => isSelf && setShowFollowersModal(true)} className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition">
                <span className="block font-bold text-metallic-gold">{displayProfile.followers ?? 0}</span>
                <span className="text-xs text-gray-500">Followers</span>
                </button>
                <div className="text-center p-2 rounded-lg">
                  <span className="block font-bold text-metallic-gold">{profilePosts.length}</span>
                  <span className="text-xs text-gray-500">Posts</span>
                </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsEditing(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="modal-dark w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">Edit Profile</h3>
                    <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input 
                            type="text"
                            value={editForm.displayName}
                            onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea 
                            value={editForm.bio}
                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                            className="w-full h-24 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input 
                            type="text"
                            value={editForm.location}
                            onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button 
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="mr-3 px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </button>
                    </div>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="relative w-80 h-80 rounded-3xl bg-gradient-to-br from-rose-800 via-red-700 to-rose-500 flex items-center justify-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring" }}
                className="text-white text-3xl font-extrabold tracking-wide"
              >
                LOG OUT
              </motion.div>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
              >
                <div className="absolute w-24 h-24 rounded-full bg-white/10 blur-xl -top-6 -left-6" />
                <div className="absolute w-16 h-16 rounded-full bg-white/10 blur-xl -bottom-6 -right-6" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSettingsOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="modal-dark w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                  <select
                    value={settingsForm.campus}
                    onChange={(e) => setSettingsForm({ campus: e.target.value })}
                    className="w-full px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="mr-3 px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!userProfile) return;
                      updateUserProfile({ ...userProfile, campus: settingsForm.campus });
                      setIsSettingsOpen(false);
                      showToast("Settings saved", "success");
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-6">
        <h3 className="font-bold text-metallic-gold mb-4">Posts</h3>
        {profilePosts.length === 0 && (
          <div className="card-dark p-4 rounded-xl shadow-sm text-sm text-gray-300">
            No posts yet.
          </div>
        )}
        {profilePosts.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 * i }}
            className="card-dark p-4 rounded-xl shadow-sm mb-4"
          >
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center text-xs font-bold text-gray-500">
                {displayProfile.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <a href={`/profile?user=${encodeURIComponent(displayProfile.displayName)}`} className="font-semibold text-metallic-gold text-sm hover:underline underline-offset-2">
                  {displayProfile.displayName}
                </a>
                <div className="text-xs text-gray-500">{p.campus} • {p.time}</div>
              </div>
              <div className="ml-auto relative">
                {isSelf && (
                  <>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                      className="px-2 py-1 text-sm text-gray-300 hover:bg-zinc-800 rounded"
                      aria-haspopup="menu"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {openMenuId === p.id && (
                      <div className="absolute right-0 mt-2 w-44 bg-zinc-900 border border-zinc-800 rounded-lg shadow z-10">
                        <button
                          onClick={() => { setEditingPostId(p.id); setEditPostContent(p.content); setOpenMenuId(null); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 text-gray-100"
                        >
                          Edit post
                        </button>
                        <button
                          onClick={() => {
                            const next = allPosts.filter(x => x.id !== p.id);
                            savePosts(next);
                            setOpenMenuId(null);
                            showToast("Post deleted", "success");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-100 text-sm whitespace-pre-wrap">{p.content}</p>
            {editingPostId === p.id && (
              <div className="mt-4 border-t border-zinc-800 pt-3">
                <textarea
                  className="w-full h-24 p-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 input-dark mb-2"
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingPostId(null)} className="px-4 py-2 rounded-lg hover:bg-zinc-800">Cancel</button>
                  <button
                    onClick={() => {
                      const next = allPosts.map(x => x.id === p.id ? { ...x, content: editPostContent } : x);
                      savePosts(next);
                      setEditingPostId(null);
                      showToast("Post updated", "success");
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Following Modal */}
      <AnimatePresence>
        {showFollowingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowFollowingModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-dark w-full max-w-sm p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Following</h3>
                <button onClick={() => setShowFollowingModal(false)} className="p-1 hover:bg-zinc-800 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800">
                {listFollowing().length === 0 ? (
                  <div className="py-4 text-sm text-gray-400">You aren’t following anyone yet.</div>
                ) : (
                  listFollowing().map(name => (
                    <div key={name} className="py-2 flex items-center justify-between gap-3">
                      <a href={`/feed?user=${encodeURIComponent(name)}`} className="font-semibold text-metallic-gold hover:underline underline-offset-2">
                        {name}
                      </a>
                      <button
                        onClick={() => { toggleFollow(name); }}
                        className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold"
                      >
                        Unfollow
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowFollowersModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-dark w-full max-w-sm p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Followers</h3>
                <button onClick={() => setShowFollowersModal(false)} className="p-1 hover:bg-zinc-800 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800">
                {listFollowers().length === 0 ? (
                  <div className="py-4 text-sm text-gray-400">No followers yet.</div>
                ) : (
                  listFollowers().map(name => (
                    <div key={name} className="py-2 flex items-center justify-between gap-3">
                      <a href={`/feed?user=${encodeURIComponent(name)}`} className="font-semibold text-metallic-gold hover:underline underline-offset-2">
                        {name}
                      </a>
                      <button
                        onClick={() => { removeFollower(name); }}
                        className="px-3 py-1.5 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/40 text-xs font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </motion.div>
  );
}
