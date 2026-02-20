"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Users, Send, Heart, MessageCircle, Share2, Plus, X, Image as ImageIcon, Mic, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";

export default function GroupDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  // const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const campusMap: Record<string, string> = {
    "msu-main": "MSU Main",
    "msu-iit": "MSU IIT",
    "msu-gensan": "MSU Gensan",
    "msu-tawi-tawi": "MSU Tawi-Tawi",
    "msu-naawan": "MSU Naawan",
    "msu-maguindanao": "MSU Maguindanao",
    "msu-sulu": "MSU Sulu",
    "msu-buug": "MSU Buug",
    "msu-lncat": "MSU LNCAT",
    "msu-lnac": "MSU LNAC",
    "msu-msat": "MSU MSAT",
  };

  const key = decodeURIComponent(id).toLowerCase();
  const isCampusGroup = !!campusMap[key];
  const campusName = isCampusGroup ? campusMap[key] : "";

  const slug = decodeURIComponent(id).toLowerCase();
  const initialJoined = (() => {
    try {
      const u = user?.email || user?.uid || "guest";
      const key = `group_membership:${u}`;
      const s = localStorage.getItem(key);
      const set = s ? new Set<string>(JSON.parse(s)) : new Set<string>();
      return set.has(slug);
    } catch { return false; }
  })();

  const [group, setGroup] = useState(() => ({
    id,
    name: isCampusGroup ? `${campusName} Group` : "CCS Students",
    campus: isCampusGroup ? campusName : "MSU-IIT",
    description: isCampusGroup 
      ? `All posts from ${campusName} campus are collected here.`
      : "Official group for College of Computer Studies students. Share updates, events, and resources here.",
    members: 1205,
    joined: initialJoined,
    coverImage: "bg-gradient-to-r from-rose-800 via-red-700 to-rose-500"
  }));

  const userKey = (() => {
    const u = user?.email || user?.uid || "guest";
    return `group_membership:${u}`;
  })();
  const readMembership = (): Set<string> => {
    try {
      const s = localStorage.getItem(userKey);
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  };
  const saveMembership = (set: Set<string>) => {
    try {
      localStorage.setItem(userKey, JSON.stringify(Array.from(set)));
    } catch {}
  };

  type PostG = {
    id: number;
    user: string;
    content: string;
    imageDataUrl?: string;
    imageUrl?: string;
    audioDataUrl?: string;
    time: string;
    likes: number;
    comments: number;
    liked: boolean;
    campus?: string;
  };
  const readAllPosts = (): PostG[] => {
    try {
      const s = typeof window !== "undefined" ? localStorage.getItem("posts") : null;
      return s ? (JSON.parse(s) as PostG[]) : [];
    } catch { return []; }
  };

  const [posts, setPosts] = useState(() => {
    if (isCampusGroup) {
      const all = readAllPosts();
      return all.filter((p) => p.campus === campusName);
    }
    return [
      {
        id: 1,
        user: "John Smith",
        content: "Anyone have the schedule for the upcoming tech talk?",
        time: "1h ago",
        likes: 12,
        comments: 3,
        liked: false
      },
      {
        id: 2,
        user: "Sarah Lee",
        content: "Looking for team members for the hackathon! PM me if interested.",
        time: "3h ago",
        likes: 24,
        comments: 8,
        liked: true
      }
    ];
  });

  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImageUrl, setNewPostImageUrl] = useState("");
  const [newPostImageData, setNewPostImageData] = useState<string>("");
  const [newPostAudioData, setNewPostAudioData] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleJoin = () => {
    const slug = decodeURIComponent(id).toLowerCase();
    const current = readMembership();
    const next = new Set(current);
    let joined: boolean;
    if (next.has(slug)) {
      next.delete(slug);
      joined = false;
      showToast("Left group", "success");
    } else {
      next.add(slug);
      joined = true;
      showToast("Joined group", "success");
    }
    saveMembership(next);
    setGroup(prev => ({ ...prev, joined }));
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost = {
      id: Date.now(),
      user: user?.displayName || user?.email?.split("@")[0] || "Me",
      content: newPostContent,
      imageDataUrl: newPostImageData || (newPostImageUrl.trim() ? newPostImageUrl.trim() : undefined),
      audioDataUrl: newPostAudioData || undefined,
      time: "Just now",
      likes: 0,
      comments: 0,
      liked: false
    };

    const withCampus = isCampusGroup ? { ...newPost, campus: campusName } : newPost;
    const next = [withCampus, ...posts];
    setPosts(next);
    if (isCampusGroup) {
      try {
        const all = readAllPosts();
        localStorage.setItem("posts", JSON.stringify([withCampus, ...all]));
      } catch {}
    }
    setNewPostContent("");
    setNewPostImageUrl("");
    setNewPostImageData("");
    setNewPostAudioData("");
    setRecording(false);
    setIsPosting(false);
    showToast("Posted to group!", "success");
  };

  const toggleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className={`h-48 ${group.coverImage} relative`}>
        <div className="absolute top-4 left-4 z-10">
          <Link href="/groups">
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.div>
          </Link>
        </div>
        <div className="absolute -bottom-16 left-4 right-4 card-dark rounded-xl p-4 shadow-md flex items-start justify-between">
            <div>
                <h1 className="text-2xl font-bold text-metallic-gold">{group.name}</h1>
                <p className="text-sm text-gray-500">{group.campus} • {group.members} members</p>
                <p className="text-sm text-gray-700 mt-2 max-w-md">{group.description}</p>
            </div>
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={toggleJoin}
                className={`px-6 py-2 rounded-full font-semibold transition shadow-sm ${
                    group.joined 
                    ? "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100" 
                    : "bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white hover:from-rose-800 hover:via-red-700 hover:to-rose-600"
                }`}
            >
                {group.joined ? "Leave" : "Join Group"}
            </motion.button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-20">
        {/* Create Post Button */}
        <div className="flex justify-end mb-6">
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPosting(true)}
                disabled={!group.joined}
                className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center shadow-lg transition ${
                  group.joined ? "bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white hover:from-rose-800 hover:via-red-700 hover:to-rose-600" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
            >
                <Plus className="w-4 h-4 mr-1" />
                Post to Group
            </motion.button>
        </div>

        {/* Gate content if not joined */}
        {!group.joined ? (
          <div className="card-dark rounded-xl p-6 shadow-sm text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-gray-500" />
            </div>
            <h3 className="font-bold text-metallic-gold mb-1">Join this group to view posts</h3>
            <p className="text-sm text-gray-600 mb-4">Become a member to see and share content.</p>
            <button
              onClick={toggleJoin}
              className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white px-6 py-2 rounded-full font-semibold hover:from-rose-800 hover:via-red-700 hover:to-rose-600 transition"
            >
              Join Group
            </button>
          </div>
        ) : (
        /* Posts List */
        <div className="space-y-4">
            <AnimatePresence>
                {posts.map((post, index) => (
                    <motion.div 
                        key={post.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="card-dark p-4 rounded-xl shadow-sm relative overflow-hidden"
                    >
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center text-gray-600 font-bold text-sm">
                                {post.user.charAt(0)}
                            </div>
                            <div>
                                <Link href={`/feed?user=${encodeURIComponent(post.user)}`} className="font-semibold text-metallic-gold hover:underline underline-offset-2">
                                  {post.user}
                                </Link>
                                <div className="text-xs text-gray-500">{post.time}</div>
                            </div>
                        </div>
                        
                        <p className="text-gray-100 mb-3">{post.content}</p>
                        {(post.imageDataUrl || post.imageUrl) && (
                          <motion.img 
                            src={(post.imageDataUrl || post.imageUrl) as string} 
                            alt="" 
                            className="w-full rounded-lg border border-gray-100"
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          />
                        )}
                        {post.audioDataUrl && (
                          <div className="mt-2">
                            <audio controls src={post.audioDataUrl} className="w-full" />
                          </div>
                        )}
                        
                        <div className="flex items-center text-gray-500 text-sm border-t pt-3 justify-between px-2">
                            <button 
                                onClick={() => toggleLike(post.id)}
                                className={`flex items-center transition ${post.liked ? "text-red-500" : "hover:text-red-500"}`}
                            >
                                <Heart className={`w-5 h-5 mr-1 ${post.liked ? "fill-current" : ""}`} />
                                {post.likes}
                            </button>
                            <button className="flex items-center hover:text-blue-500 transition">
                                <MessageCircle className="w-5 h-5 mr-1" />
                                {post.comments}
                            </button>
                            <button className="flex items-center hover:text-green-500 transition">
                                <Share2 className="w-5 h-5 mr-1" />
                                Share
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        )}
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsPosting(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-dark w-full max-w-lg p-6"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Post to {group.name}</h3>
                    <button onClick={() => setIsPosting(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handlePost}>
                    <textarea 
                        className="w-full h-32 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-gray-50 text-gray-900"
                        placeholder="Share something with the group..."
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
                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50 hover:bg-blue-700 transition flex items-center"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Post
                        </button>
                    </div>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
