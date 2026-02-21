"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, X, UserPlus, Star } from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
 
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, app } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { createThread } from "@/lib/datastore";

export default function MessagesPage() {
  const { showToast } = useToast();
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [isNewChat, setIsNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userKey = useMemo(() => user?.email || user?.uid || "guest", [user]);
  const isFirebaseConfigured = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (app.options as any) || {};
      return Boolean(opts.apiKey && opts.apiKey !== "YOUR_API_KEY");
    } catch { return false; }
  }, []);
  if (!isFirebaseConfigured) {
    return (
      <div className="max-w-2xl lg:max-w-3xl mx-auto pt-4 pb-24 px-4">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-metallic-gold">Messages</h1>
          </div>
        </header>
        <div className="card-dark rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-300">
            Messaging requires Firebase to be configured. Please add Firebase environment variables to your deployment.
          </p>
        </div>
      </div>
    );
  }
  
  type Thread = {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    createdBy: string;
    participants?: string[];
  };
  
  type Friend = {
    id: string;
    name: string;
    avatarColor: string;
  };
  
  const [friends, setFriends] = useState<Friend[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setFriends([]);
      return;
    }
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Friend[] = [];
      snap.forEach(d => {
        const data = d.data() as { displayName?: string };
        const email = d.id;
        const name = data?.displayName || email.split("@")[0];
        if (email === user?.email) return;
        list.push({ id: email, name, avatarColor: "bg-gray-200" });
      });
      setFriends(list);
    });
    return () => unsub();
  }, [isFirebaseConfigured, user?.email]);
  
  const readThreads = (): Thread[] => {
    try {
      const raw = localStorage.getItem(`threads:${userKey}`);
      const parsed: Thread[] = raw ? JSON.parse(raw) : [];
      return parsed.filter(t => t.createdBy === userKey);
    } catch {
      return [];
    }
  };
  const saveThreads = (list: Thread[]) => {
    try {
      localStorage.setItem(`threads:${userKey}`, JSON.stringify(list));
    } catch {}
  };
  const [conversations, setConversations] = useState<Thread[]>(readThreads);
  const pinKey = useMemo(() => `threads:pinned:${userKey}`, [userKey]);
  const readPinned = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(pinKey) || "[]")); } catch { return new Set(); }
  };
  const savePinned = (s: Set<string>) => {
    try { localStorage.setItem(pinKey, JSON.stringify(Array.from(s))); } catch {}
  };
  const [pinned, setPinned] = useState<Set<string>>(readPinned);
  useEffect(() => {
    if (!isFirebaseConfigured || !user?.email) return;
    const q = query(
      collection(db, "threads"),
      where("participants", "array-contains", user.email),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Thread[] = [];
      snap.forEach(d => {
        const data = d.data() as { names?: string[]; participants?: string[]; lastMessage?: string; updatedAt?: unknown };
        const names = data?.names || [];
        const name = names.find(n => n !== (userProfile?.displayName || user?.email?.split("@")[0])) || names[0] || "Chat";
        let t = "";
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ts = (data as any).updatedAt;
          if (ts && typeof ts.toDate === "function") {
            t = ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          }
        } catch {}
        list.push({
          id: d.id,
          name,
          lastMessage: data?.lastMessage || "",
          time: t,
          unread: 0,
          createdBy: userKey,
          participants: data?.participants || []
        });
      });
      setConversations(list);
    });
    return () => unsub();
  }, [isFirebaseConfigured, user?.email, userKey, userProfile?.displayName]);
  
  let seq = 0;
  const genId = () => {
    seq += 1;
    return `t-${seq}`;
  };
  const startThread = (f: Friend) => {
    const exists = conversations.find(c => c.name === f.name);
    if (exists) {
      setIsNewChat(false);
      showToast(`Opened chat with ${f.name}`, "success");
      router.push(`/messages/${exists.id}`);
      return;
    }
    if (isFirebaseConfigured && user?.email) {
      const names = [userProfile?.displayName || user.email.split("@")[0], f.name];
      const participants = [user.email, f.id];
      createThread(participants, names).then(id => {
        setIsNewChat(false);
        showToast(`Started chat with ${f.name}`, "success");
        router.push(`/messages/${id}`);
      }).catch(() => {
        setIsNewChat(false);
        showToast("Unable to start chat", "error");
      });
      return;
    }
    showToast("Messaging requires Firebase to be configured", "error");
  };

  // handled entirely via friend list; search box filters available friends

  const removeThread = (id: string) => {
    const next = conversations.filter(c => c.id !== id);
    setConversations(next);
    saveThreads(next);
    showToast("Conversation removed", "success");
  };
  const markRead = (id: string) => {
    const next = conversations.map(c => c.id === id ? { ...c, unread: 0 } : c);
    setConversations(next);
    saveThreads(next);
    showToast("Marked as read", "success");
  };

  const ChatRow = ({ chat, index }: { chat: Thread; index: number }) => {
    const x = useMotionValue(0);
    const handleEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
      const dx = info?.offset?.x ?? 0;
      if (dx <= -80) {
        removeThread(chat.id);
        return;
      }
      if (dx >= 80) {
        markRead(chat.id);
        return;
      }
    };
    const onClickOpen = () => {
      router.push(`/messages/${chat.id}`);
    };
    const isPinned = pinned.has(chat.id);
    const togglePin = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = new Set(pinned);
      if (next.has(chat.id)) {
        next.delete(chat.id);
        showToast("Unpinned", "success");
      } else {
        next.add(chat.id);
        showToast("Pinned", "success");
      }
      setPinned(next);
      savePinned(next);
    };
    return (
      <div className="relative mb-2">
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="h-full w-full flex">
            <div className="flex-1 bg-emerald-900/20 text-emerald-400 flex items-center pl-4">Read</div>
            <div className="flex-1 bg-red-900/20 text-red-400 flex items-center justify-end pr-4">Remove</div>
          </div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          drag="x"
          dragConstraints={{ left: -120, right: 120 }}
          onDragEnd={handleEnd}
          style={{ x }}
          className="card-dark p-4 rounded-xl shadow-sm flex items-center hover:bg-zinc-800 transition cursor-pointer relative"
          onClick={onClickOpen}
        >
          <div className="w-12 h-12 bg-gray-200 rounded-full mr-4 flex-shrink-0 flex items-center justify-center text-gray-700 font-bold">
            {chat.name.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="font-semibold text-metallic-gold truncate hover:text-amber-300 transition-colors text-left"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/feed?user=${encodeURIComponent(chat.name)}`);
                }}
                title="View timeline"
              >
                {chat.name}
              </motion.button>
              <span className="text-xs text-gray-400">{chat.time}</span>
            </div>
            <p className={`text-sm truncate ${chat.unread > 0 ? "font-semibold text-gray-100" : "text-gray-300"}`}>
              {chat.lastMessage}
            </p>
          </div>
          <button
            onClick={togglePin}
            className={`ml-3 p-1.5 rounded-full ${isPinned ? "bg-yellow-500/20 text-yellow-400" : "hover:bg-zinc-800 text-gray-400"}`}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Star className="w-4 h-4" />
          </button>
          {chat.unread > 0 && (
            <div className="ml-3 bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
              {chat.unread}
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto pt-4 pb-24 px-4">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-metallic-gold">Messages</h1>
          <div className="mt-1 h-1 w-16 bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 rounded" />
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsNewChat(true)}
          className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white px-4 py-2 rounded-full shadow-md hover:from-rose-900 hover:via-red-800 hover:to-rose-600 transition inline-flex items-center"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          New Chat
        </motion.button>
      </header>
      
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search messages..." 
          className="w-full pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 input-dark shadow-sm"
        />
      </div>
      <div className="flex justify-end mb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            if (!user) return;
            const meName = userProfile?.displayName || user.email?.split("@")[0] || "Me";
            const existing = conversations.find(c => c.name === meName);
            if (existing) {
              router.push(`/messages/${existing.id}`);
              return;
            }
            if (isFirebaseConfigured && user.email) {
              try {
                const id = await createThread([user.email], [meName]);
                router.push(`/messages/${id}`);
                return;
              } catch {}
            }
            showToast("Messaging requires Firebase to be configured", "error");
          }}
          className="bg-zinc-900 text-gray-100 px-4 py-2 rounded-full shadow hover:bg-zinc-800"
        >
          Saved Messages
        </motion.button>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {isNewChat && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsNewChat(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-dark w-full max-w-sm p-6"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">New Message</h3>
                    <button onClick={() => setIsNewChat(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Choose a friend</label>
                  <div className="relative mb-3">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 input-dark"
                      placeholder="Search friends..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {friends
                      .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(f => (
                        <button
                          key={f.id}
                          onClick={() => startThread(f)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition text-left"
                        >
                          <div className={`w-8 h-8 ${f.avatarColor} rounded-full flex items-center justify-center text-gray-700 font-bold`}>
                            {f.name.charAt(0)}
                          </div>
                          <span className="font-medium">{f.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {[...conversations]
            .sort((a, b) => (pinned.has(b.id) ? 1 : 0) - (pinned.has(a.id) ? 1 : 0))
            .map((chat, index) => (
            <ChatRow key={chat.id} chat={chat} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
