"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Send, Plus, X, Home as HomeIcon, Search, Image as ImageIcon, Mic, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db, app, storage } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

type Post = {
  id: number;
  user: string;
  campus: string;
  content: string;
  imageUrl?: string;
  imageDataUrl?: string;
  audioDataUrl?: string;
  time: string;
  likes: number;
  comments: number;
  liked: boolean;
  expanded: boolean;
  commentsList?: Array<{ id: number; author: string; content: string; time: string }>;
};

export default function FeedPage() {
  const { user, userProfile, loading, isFollowing, toggleFollow, isBlocked, toggleBlock, listFollowers, notify } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImageUrl, setNewPostImageUrl] = useState("");
  const [newPostImageData, setNewPostImageData] = useState<string>("");
  const [newPostAudioData, setNewPostAudioData] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const selectedUser = useMemo(() => searchParams.get("user"), [searchParams]);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  
  const defaultPosts: Post[] = [];
  const [posts, setPosts] = useState<Post[]>([]);
  const [docIdByPostId, setDocIdByPostId] = useState<Record<number, string>>({});

  const isFirebaseConfigured = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (app.options as any) || {};
      return Boolean(opts.apiKey && opts.apiKey !== "YOUR_API_KEY");
    } catch { return false; }
  })();

  const savePosts = (next: Post[]) => {
    setPosts(next);
    try {
      localStorage.setItem("posts", JSON.stringify(next));
    } catch {}
  };
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const setCommentInput = (id: number, v: string) => setCommentInputs(prev => ({ ...prev, [id]: v }));
  const addComment = (id: number) => {
    if (!user) { showToast("Log in to comment", "error"); return; }
    const me = user?.displayName || user?.email?.split("@")[0] || "";
    const text = (commentInputs[id] || "").trim();
    if (!text) return;
    const next = posts.map(p => {
      if (p.id !== id) return p;
      const list = [...(p.commentsList || [])];
      list.push({ id: Date.now(), author: me, content: text, time: "Just now" });
      return { ...p, commentsList: list, comments: list.length };
    });
    savePosts(next);
    setCommentInput(id, "");
    const target = posts.find(p => p.id === id);
    if (target && target.user && target.user !== me) {
      try { notify(target.user, { type: "comment", from: me, postId: id }); } catch {}
    }
    showToast("Comment posted", "success");
  };
  const deleteComment = (postId: number, commentId: number) => {
    const post = posts.find(p => p.id === postId);
    const me = user?.displayName || user?.email?.split("@")[0] || "";
    if (!post || post.user !== me) { showToast("Only author can delete comments", "error"); return; }
    const next = posts.map(p => {
      if (p.id !== postId) return p;
      const list = (p.commentsList || []).filter(c => c.id !== commentId);
      return { ...p, commentsList: list, comments: list.length };
    });
    savePosts(next);
    showToast("Comment deleted", "success");
  };
  const userId = user?.email || user?.uid || "guest";
  const mutedKey = `muted_posts:${userId}`;
  const readMuted = (): Set<number> => {
    try {
      const s = localStorage.getItem(mutedKey);
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  };
  const [mutedPosts, setMutedPosts] = useState<Set<number>>(readMuted());
  const saveMuted = (setx: Set<number>) => {
    setMutedPosts(setx);
    try { localStorage.setItem(mutedKey, JSON.stringify(Array.from(setx))); } catch {}
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, "posts"), orderBy("id", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const next: Post[] = [];
      const map: Record<number, string> = {};
      snap.forEach(d => {
        const data = d.data() as Partial<Post> & { id: number; createdAt?: unknown };
        if (typeof data.id !== "number") return;
        let t = data.time || "Just now";
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ts = (data as any).createdAt;
          if (ts && typeof ts.toDate === "function") {
            const dt = ts.toDate() as Date;
            t = dt.toLocaleString();
          }
        } catch {}
        const post: Post = {
          id: data.id,
          user: data.user || "Unknown",
          campus: data.campus || "Unknown",
          content: data.content || "",
          imageUrl: data.imageUrl,
          imageDataUrl: data.imageDataUrl,
          audioDataUrl: data.audioDataUrl,
          time: t,
          likes: typeof data.likes === "number" ? data.likes : 0,
          comments: typeof data.comments === "number" ? data.comments : 0,
          liked: false,
          expanded: false,
          commentsList: Array.isArray(data.commentsList) ? (data.commentsList as Array<{ id: number; author: string; content: string; time: string }>) : []
        };
        next.push(post);
        map[data.id] = d.id;
      });
      setDocIdByPostId(map);
      setPosts(next);
    });
    return () => unsub();
  }, [isFirebaseConfigured]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showToast("Log in to post", "error"); return; }
    if (!newPostContent.trim()) return;
    if (!isFirebaseConfigured) { showToast("Posting requires Firebase to be configured", "error"); return; }

    const newPost: Post = {
      id: Date.now(),
      user: user?.displayName || user?.email?.split('@')[0] || "Me",
      campus: userProfile?.campus || "Unknown",
      content: newPostContent,
      imageUrl: newPostImageUrl.trim() || undefined,
      imageDataUrl: newPostImageData || undefined,
      audioDataUrl: newPostAudioData || undefined,
      time: "Just now",
      likes: 0,
      comments: 0,
      liked: false,
      expanded: false
    };

    let imgUrl: string | undefined = newPost.imageUrl;
    let audUrl: string | undefined = undefined;
    try {
      if (newPost.imageDataUrl) {
        const r = storageRef(storage, `uploads/images/${(user?.uid || user?.email || "user").replace(/[^a-zA-Z0-9_-]/g, "_")}/${newPost.id}.png`);
        await uploadString(r, newPost.imageDataUrl, "data_url");
        imgUrl = await getDownloadURL(r);
      }
      if (newPost.audioDataUrl) {
        const r = storageRef(storage, `uploads/audio/${(user?.uid || user?.email || "user").replace(/[^a-zA-Z0-9_-]/g, "_")}/${newPost.id}.webm`);
        await uploadString(r, newPost.audioDataUrl, "data_url");
        audUrl = await getDownloadURL(r);
      }
    } catch {
      // proceed without uploads
    }
    const payload = {
      ...newPost,
      imageUrl: imgUrl || newPost.imageUrl,
      imageDataUrl: undefined,
      audioDataUrl: audUrl ? undefined : newPost.audioDataUrl,
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, "posts"), payload);
    try {
      const followers = listFollowers();
      followers.forEach(f => notify(f, { type: "post", from: newPost.user, postId: newPost.id }));
    } catch {}
    setNewPostContent("");
    setNewPostImageUrl("");
    setNewPostImageData("");
    setNewPostAudioData("");
    setRecording(false);
    setIsPosting(false);
    showToast("Post created successfully!", "success");
  };

  const toggleLike = (id: number) => {
    const target = posts.find(p => p.id === id);
    const likedNow = target ? !target.liked : false;
    const next = posts.map(post => {
      if (post.id === id) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    });
    savePosts(next);
    if (isFirebaseConfigured) {
      const did = docIdByPostId[id];
      if (did) {
        const after = next.find(p => p.id === id)?.likes ?? 0;
        updateDoc(doc(db, "posts", did), { likes: after }).catch(() => {});
      }
    }
    if (likedNow && target) {
      const me = user?.displayName || user?.email?.split("@")[0] || "";
      if (target.user && target.user !== me) {
        try { notify(target.user, { type: "like", from: me, postId: id }); } catch {}
      }
    }
  };

  const toggleComments = (id: number) => {
    const next = posts.map(post => 
      post.id === id ? { ...post, expanded: !post.expanded } : post
    );
    savePosts(next);
  };

  const handleShare = (id: number) => {
    // Mock share
    navigator.clipboard.writeText(`http://localhost:3000/feed/post/${id}`);
    showToast("Link copied to clipboard!", "success");
  };

  useEffect(() => {
    if (!loading && user && !userProfile?.campus) {
      router.push("/onboarding");
    }
  }, [loading, user, userProfile, router]);

  const uniqueAuthors = Array.from(new Set(posts.map(p => p.user)));
  const authorResults = uniqueAuthors
    .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 12);

  const [sortOrder, setSortOrder] = useState<'following' | 'latest' | 'oldest'>('following');
  const visiblePosts = (() => {
    const base = posts
      .filter((p: Post) => !isBlocked(p.user))
      .filter((p: Post) => (selectedUser ? p.user === selectedUser : true));
    const copy = [...base];
    if (sortOrder === 'latest') {
      copy.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sortOrder === 'oldest') {
      copy.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else {
      copy.sort((a, b) => {
        const af = isFollowing(a.user) ? 1 : 0;
        const bf = isFollowing(b.user) ? 1 : 0;
        if (bf !== af) return bf - af;
        return (b.id || 0) - (a.id || 0);
      });
    }
    return copy;
  })();

  return (
    <Suspense fallback={null}>
    <>
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-4 sm:pt-6 pb-24 lg:pb-20">
      <header className="flex items-center gap-2 mb-4">
        <HomeIcon className="w-6 h-6 text-red-600" />
        <h1 className="text-2xl font-bold text-metallic-gold">ONEMSU</h1>
      </header>
      {!isFirebaseConfigured && (
        <div className="mb-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800">
          Cloud mode is disabled. Set Firebase environment variables in your deployment to enable posting and real-time feed.
        </div>
      )}
      <div className={`grid ${user ? 'lg:grid-cols-[260px_minmax(0,1fr)_300px]' : 'lg:grid-cols-1'} gap-6 lg:gap-8`}>
        {/* Left Sidebar */}
        {user && (
        <aside className="space-y-4 hidden lg:block">
          <div className="card-dark rounded-xl p-4 animate-fade-in-up">
            <button
              type="button"
              onClick={() => { router.push('/feed'); router.refresh(); }}
              className="text-3xl font-extrabold bg-gradient-to-r from-rose-700 via-red-600 to-rose-400 bg-clip-text text-transparent"
              aria-label="Go to Newsfeed"
            >
              ONE
            </button>
          </div>
          <div className="card-dark rounded-xl p-2 animate-fade-in-up">
            <nav className="space-y-1">
              {[
                { name: "Newsfeed", href: "/feed" },
                { name: "Groups", href: "/groups" },
                { name: "Messages", href: "/messages" },
                { name: "Profile", href: "/profile" },
              ].map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition
                      ${active ? "bg-zinc-900 shadow ring-1 ring-zinc-700 text-gray-100" : "text-gray-300 hover:bg-zinc-800"}
                    `}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        )}

        {/* Center Feed */}
        <main className="max-w-2xl lg:max-w-3xl mx-auto w-full">
          <div className="card-dark rounded-xl px-4 sm:px-5 py-3 sm:py-4 mb-4 animate-fade-in-up sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70">
            <header className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-metallic-gold">Newsfeed</h1>
              <button
                onClick={() => setIsPosting(true)}
                className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow hover:from-rose-900 hover:via-red-800 hover:to-rose-600 transition"
              >
                <span className="inline-flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </span>
              </button>
            </header>
          </div>
          <div className="card-dark rounded-xl px-4 py-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by name or username..."
                className="w-full pl-10 pr-4 py-2 rounded-xl input-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <label className="text-sm text-gray-400">Sort</label>
              <select
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-gray-100 hover:bg-zinc-800 text-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'following' | 'latest' | 'oldest')}
              >
                <option value="following">Following first</option>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            {searchQuery && (
              <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-zinc-800">
                {authorResults.length === 0 ? (
                  <div className="text-sm text-gray-400 py-3 px-1">No users found</div>
                ) : (
                  authorResults.map(name => (
                    <div key={name} className="py-2 flex items-center justify-between gap-3">
                      <button
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => { router.push(`/profile?user=${encodeURIComponent(name)}`); setSearchQuery(""); }}
                      >
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-metallic-gold">{name}</div>
                          <div className="text-xs text-gray-400">@{name.toLowerCase().replace(/\\s+/g, '')}</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleBlock(name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                            isBlocked(name) ? "bg-red-900/30 text-red-400 hover:bg-red-900/40" : "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                          }`}
                        >
                          {isBlocked(name) ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => toggleFollow(name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                            isFollowing(name) ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isFollowing(name) ? "Unfollow" : "Follow"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedUser && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <div>
                  Viewing timeline of <span className="font-semibold text-metallic-gold">{selectedUser}</span>
                </div>
                <button
                  onClick={() => router.push("/feed")}
                  className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700"
                >
                  Back to all
                </button>
              </div>
            )}
          </div>

      {/* New Post Modal */}
      {isPosting && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPosting(false);
          }}
        >
                  <div className="modal-dark w-full max-w-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Create Post</h3>
                    <button onClick={() => setIsPosting(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handlePost}>
                    <textarea 
                        className="w-full h-40 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-gray-50 text-gray-900"
                        placeholder="What's on your mind?"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        autoFocus
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const s = String(reader.result || "");
                            setNewPostImageData(s);
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg bg-zinc-900 text-gray-100 hover:bg-zinc-800 inline-flex items-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Attach Image
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!recording) {
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                              streamRef.current = stream;
                              const mr = new MediaRecorder(stream);
                              const chunks: BlobPart[] = [];
                              mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                              mr.onstop = () => {
                                const blob = new Blob(chunks, { type: "audio/webm" });
                                const fr = new FileReader();
                                fr.onload = () => {
                                  setNewPostAudioData(String(fr.result || ""));
                                };
                                fr.readAsDataURL(blob);
                                stream.getTracks().forEach(t => t.stop());
                                streamRef.current = null;
                              };
                              mediaRecorderRef.current = mr;
                              mr.start();
                              setRecording(true);
                            } catch {
                            }
                          } else {
                            try {
                              mediaRecorderRef.current?.stop();
                            } finally {
                              setRecording(false);
                            }
                          }
                        }}
                        className={`px-3 py-2 rounded-lg inline-flex items-center gap-2 ${recording ? "bg-red-600 text-white" : "bg-zinc-900 text-gray-100 hover:bg-zinc-800"}`}
                      >
                        <Mic className="w-4 h-4" />
                        {recording ? "Stop Recording" : "Voice Mail"}
                      </button>
                    </div>
                    {(newPostImageData || newPostAudioData || newPostImageUrl) && (
                      <div className="space-y-3 mb-4">
                        {newPostImageData && (
                          <div className="relative">
                            <Image src={newPostImageData} alt="" width={800} height={800} className="w-full rounded-lg border border-gray-200" />
                            <button
                              type="button"
                              onClick={() => setNewPostImageData("")}
                              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/70"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {newPostImageUrl && !newPostImageData && (
                          <div className="relative">
                            <Image src={newPostImageUrl} alt="" width={800} height={800} className="w-full rounded-lg border border-gray-200" />
                            <button
                              type="button"
                              onClick={() => setNewPostImageUrl("")}
                              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/70"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {newPostAudioData && (
                          <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                            <audio controls src={newPostAudioData} className="w-full mr-2" />
                            <button
                              type="button"
                              onClick={() => setNewPostAudioData("")}
                              className="p-2 rounded-lg hover:bg-zinc-800"
                            >
                              <Trash2 className="w-5 h-5 text-gray-200" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-end">
                        <button 
                            type="submit"
                            disabled={!newPostContent.trim()}
                            className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50 hover:from-rose-800 hover:via-red-700 hover:to-rose-600 transition flex items-center"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Post
                        </button>
                    </div>
                </form>
          </div>
        </div>
      )}

          <div className="space-y-4 sm:space-y-5 animate-fade-in-up">
            {visiblePosts.map((post: Post) => (
            <div 
                key={post.id}
                className="p-4 sm:p-5 rounded-xl shadow-sm relative overflow-hidden bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-800 border border-zinc-800"
            >
                <div className="flex items-center mb-3 relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-3 flex items-center justify-center text-white font-bold">
                    {post.user.charAt(0)}
                </div>
                <div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => router.push(`/profile?user=${encodeURIComponent(post.user)}`)}
                      className="font-semibold text-metallic-gold text-base sm:text-lg hover:text-amber-300 transition-colors"
                    >
                      {post.user}
                    </motion.button>
                    <div className="text-xs sm:text-sm text-gray-400">{post.campus} • {post.time}</div>
                </div>
                <div className="ml-auto">
                  {user && (user.displayName || user.email?.split("@")[0]) !== post.user && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleFollow(post.user)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        isFollowing(post.user)
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {isFollowing(post.user) ? "Following" : "Follow"}
                    </motion.button>
                  )}
                  {user && (user.displayName || user.email?.split("@")[0]) === post.user && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                        className="ml-2 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        aria-haspopup="menu"
                      >
                        •••
                      </button>
                      {menuOpenId === post.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow z-10 text-gray-100">
                          <button
                            onClick={() => { setEditingId(post.id); setEditContent(post.content); setMenuOpenId(null); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { 
                              const next = posts.filter(p => p.id !== post.id);
                              savePosts(next);
                              setMenuOpenId(null);
                              showToast("Post deleted", "success");
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => {
                              const next = new Set(mutedPosts);
                              if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
                              saveMuted(next);
                              setMenuOpenId(null);
                              showToast(next.has(post.id) ? "Notifications off" : "Notifications on", "success");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            {mutedPosts.has(post.id) ? "Turn on notifications" : "Turn off notifications"}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${location.origin}/feed#post-${post.id}`);
                              setMenuOpenId(null);
                              showToast("Embed link copied", "success");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            Copy embed link
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
                
                <p id={`post-${post.id}`} className="text-gray-100 mb-3 whitespace-pre-wrap text-[1rem] sm:text-[1.05rem] leading-7">
                  {post.content}
                </p>
                {(post.imageDataUrl || post.imageUrl) && (
                  <motion.img
                    src={post.imageDataUrl || post.imageUrl || ""}
                    alt=""
                    className="w-full rounded-xl border border-gray-100"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  />
                )}
                {post.audioDataUrl && (
                  <div className="mt-2">
                    <audio controls src={post.audioDataUrl} className="w-full" />
                  </div>
                )}
                {mutedPosts.has(post.id) && (
                  <div className="text-xs text-gray-500 mb-2">Notifications off for this post</div>
                )}
                
                <div className="flex items-center text-gray-600 text-sm sm:text-base border-t pt-3 justify-between px-2">
                    <button 
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center transition ${post.liked ? "text-red-500" : "hover:text-red-500"}`}
                    >
                        <Heart className={`w-5 h-5 mr-1 ${post.liked ? "fill-current" : ""}`} />
                        {post.likes}
                    </button>
                    
                    <button 
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center hover:text-blue-500 transition"
                    >
                        <MessageCircle className="w-5 h-5 mr-1" />
                        {post.commentsList?.length ?? post.comments}
                    </button>
                    
                    <button 
                        onClick={() => handleShare(post.id)}
                        className="flex items-center hover:text-green-500 transition"
                    >
                        <Share2 className="w-5 h-5 mr-1" />
                        Share
                    </button>
                </div>

                {post.expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="space-y-3 mb-3">
                      {(post.commentsList || []).map(c => (
                        <div key={c.id} className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">
                            {c.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg text-sm flex-1 text-gray-900">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{c.author}</span>
                              {(user?.displayName || user?.email?.split("@")[0] || "") === post.user && (
                                <button onClick={() => deleteComment(post.id, c.id)} className="text-xs text-red-600">
                                  Delete
                                </button>
                              )}
                            </div>
                            <div>{c.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) => setCommentInput(post.id, e.target.value)}
                        placeholder={user ? "Write a comment..." : "Log in to comment"}
                        disabled={!user}
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-60"
                      />
                      <button
                        className="text-blue-600 font-semibold text-sm disabled:opacity-50"
                        disabled={!user || !(commentInputs[post.id] || "").trim()}
                        onClick={() => addComment(post.id)}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
            </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        {user && (
        <aside className="space-y-4 hidden lg:block">
          <div className="rounded-xl card-dark shadow-sm p-4">
            <div className="font-bold text-metallic-gold mb-2">Discord Server</div>
            <a
              href="https://discord.gg/ftY4z8RsHq"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-amber-400 via-red-600 to-rose-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-amber-500 hover:via-red-700 hover:to-rose-600 transition inline-flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite Link
            </a>
          </div>
          <div className="rounded-xl card-dark shadow-sm p-4">
            <div className="font-bold text-metallic-gold mb-2">Navigation</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <Link href="/my" className="text-blue-600 hover:underline">My Feed</Link>
              </li>
              <li>
                <Link href="/groups" className="text-blue-600 hover:underline">Groups</Link>
              </li>
            </ul>
          </div>
        </aside>
        )}
      </div>
    </div>
    {editingId !== null && (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null); }}
      >
        <div className="modal-dark w-full max-w-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Edit Post</h3>
            <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-100 rounded">✕</button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const next = posts.map((p: Post) => p.id === editingId ? { ...p, content: editContent } : p);
            savePosts(next);
            setEditingId(null);
            showToast("Post updated", "success");
          }}>
            <textarea
              className="w-full h-40 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-gray-50 text-gray-900"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition">Save</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
    </Suspense>
  );
}
