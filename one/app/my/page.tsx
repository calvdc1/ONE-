"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2, Send, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

export default function MyFeedPage() {
  const { user, userProfile, loading } = useAuth();
  const { showToast } = useToast();
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

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

  const readAllPosts = (): Post[] => {
    try {
      const s = typeof window !== "undefined" ? localStorage.getItem("posts") : null;
      return s ? (JSON.parse(s) as Post[]) : [];
    } catch { return []; }
  };
  const [posts, setPosts] = useState<Post[]>(() => readAllPosts());
  const savePosts = (next: Post[]) => {
    setPosts(next);
    try {
      localStorage.setItem("posts", JSON.stringify(next));
    } catch {}
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

  if (!loading && !user) {
    return <div className="p-8 text-center">Please <Link className="text-blue-600 font-semibold" href="/login">log in</Link> to see your feed.</div>;
  }

  const authorName = user?.displayName || user?.email?.split("@")[0] || "Me";
  const myPosts = posts.filter((p: Post) => p.user === authorName);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    const newPost = {
      id: Date.now(),
      user: authorName,
      campus: userProfile?.campus || "Unknown",
      content: newPostContent,
      time: "Just now",
      likes: 0,
      comments: 0,
      liked: false,
      expanded: false,
    };
    const next = [newPost, ...posts];
    savePosts(next);
    setIsPosting(false);
    setNewPostContent("");
    showToast("Post created!", "success");
  };

  const toggleLike = (id: number) => {
    const next = posts.map(post => {
      if (post.id === id) {
        return { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 };
      }
      return post;
    });
    savePosts(next);
  };

  return (
    <div className="mx-auto max-w-xl w-full px-4 pt-6 pb-24">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Feed</h1>
          <button
            onClick={() => setIsPosting(true)}
            className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white px-5 py-2 rounded-full text-sm font-semibold shadow hover:from-rose-800 hover:via-red-700 hover:to-rose-600 transition"
          >
            <span className="inline-flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </span>
          </button>
        </header>
      </div>

      {isPosting && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPosting(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl">
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
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newPostContent.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50 hover:from-emerald-600 hover:to-emerald-700 transition inline-flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {myPosts.length === 0 && (
          <div className="text-center text-gray-600 bg-white border border-gray-100 rounded-2xl p-6">You haven’t posted yet.</div>
        )}
        {myPosts.map((post) => (
          <div key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-3 flex items-center justify-center text-white font-bold">
                {post.user.charAt(0)}
              </div>
              <div>
                <Link href={`/profile?user=${encodeURIComponent(post.user)}`} className="font-semibold text-gray-900 text-base hover:underline underline-offset-2">
                  {post.user}
                </Link>
                <div className="text-xs text-gray-500">{post.campus} • {post.time}</div>
              </div>
              <div className="ml-auto">
                <div className="relative">
                  <button
                    onClick={() => setEditingId(editingId === post.id ? null : post.id)}
                    className="ml-2 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    aria-haspopup="menu"
                  >
                    •••
                  </button>
                  {editingId === post.id && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow z-10">
                      <button
                        onClick={() => { setEditContent(post.content); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Edit content below
                      </button>
                      <button
                        onClick={() => { 
                          const next = posts.filter(p => p.id !== post.id);
                          savePosts(next);
                          setEditingId(null);
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
                          showToast(next.has(post.id) ? "Notifications off" : "Notifications on", "success");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {mutedPosts.has(post.id) ? "Turn on notifications" : "Turn off notifications"}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${location.origin}/feed#post-${post.id}`);
                          showToast("Embed link copied", "success");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Copy embed link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-gray-900 mb-4 whitespace-pre-wrap text-[1rem] leading-7">{post.content}</p>
            {mutedPosts.has(post.id) && (
              <div className="text-xs text-gray-500 mb-2">Notifications off for this post</div>
            )}
            <div className="flex items-center text-gray-600 text-sm border-t pt-3 justify-between px-2">
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
            {editingId === post.id && (
              <div className="mt-4 border-t pt-3">
                <textarea
                  className="w-full h-24 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 bg-gray-50 text-gray-900"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                  <button
                    onClick={() => {
                      const next = posts.map(p => p.id === post.id ? { ...p, content: editContent } : p);
                      savePosts(next);
                      setEditingId(null);
                      showToast("Post updated", "success");
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
