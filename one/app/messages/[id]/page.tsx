"use client";

import { use } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, MessageSquare, Phone, Video, Info, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  seen?: boolean;
  unsent?: boolean;
};

type Thread = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  createdBy: string;
};

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const userKey = useMemo(() => user?.email || user?.uid || "guest", [user]);
  const threadId = decodeURIComponent(id);

  const readThreads = (): Thread[] => {
    try {
      const raw = localStorage.getItem(`threads:${userKey}`);
      const parsed: Thread[] = raw ? JSON.parse(raw) : [];
      return parsed.filter(t => t.createdBy === userKey);
    } catch {
      return [];
    }
  };

  const readMessages = (): Message[] => {
    try {
      const raw = localStorage.getItem(`messages:${userKey}:${threadId}`);
      return raw ? (JSON.parse(raw) as Message[]) : [];
    } catch {
      return [];
    }
  };
  const saveMessages = (list: Message[]) => {
    try {
      localStorage.setItem(`messages:${userKey}:${threadId}`, JSON.stringify(list));
    } catch {}
  };
  const saveThreads = (list: Thread[]) => {
    try {
      localStorage.setItem(`threads:${userKey}`, JSON.stringify(list));
    } catch {}
  };

  const thread = readThreads().find(t => t.id === threadId) || null;
  const [messages, setMessages] = useState<Message[]>(readMessages);
  const [text, setText] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [calling, setCalling] = useState<null | "voice" | "video">(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!thread) return;
    const list = readThreads();
    const idx = list.findIndex(t => t.id === threadId);
    if (idx >= 0) {
      const updated = { ...list[idx], unread: 0 };
      const next = [updated, ...list.filter((t, i) => i !== idx)];
      saveThreads(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(120, ta.scrollHeight)}px`;
  };

  const send = () => {
    const v = text.trim();
    if (!v) return;
    const now = new Date();
    const m: Message = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      from: "me",
      text: v,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    const next = [...messages, m];
    setMessages(next);
    saveMessages(next);
    setText("");
    // update thread preview
    const list = readThreads();
    const idx = list.findIndex(t => t.id === threadId);
    if (idx >= 0) {
      const updated: Thread = {
        ...list[idx],
        lastMessage: v,
        time: m.time,
        unread: 0
      };
      const reordered = [updated, ...list.filter((_, i) => i !== idx)];
      saveThreads(reordered);
    }
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const deleteMessage = (id: string) => {
    const next = messages.filter(m => m.id !== id);
    setMessages(next);
    saveMessages(next);
    setMenuFor(null);
  };

  const unsendMessage = (id: string) => {
    const next = messages.map(m => m.id === id ? { ...m, text: "You unsent a message", unsent: true } : m);
    setMessages(next);
    saveMessages(next);
    setMenuFor(null);
  };

  if (!thread) {
    return (
      <div className="max-w-xl mx-auto pt-4 pb-24 px-4">
        <div className="card-dark rounded-xl p-4 mb-4 flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-metallic-gold">Messages</h1>
        </div>
        <div className="card-dark rounded-xl p-6 text-sm">
          Thread not found.
          <div className="mt-4">
            <Link href="/messages" className="text-blue-500 hover:underline">Back to Messages</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-4 pb-24 px-4">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="bg-zinc-900 text-gray-200 p-2 rounded-lg hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-metallic-gold">{thread.name}</h1>
            <div className="text-xs text-gray-400">Chat</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCalling("voice")}
            className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white p-2 rounded-lg hover:from-rose-900 hover:via-red-800 hover:to-rose-600"
            title="Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCalling("video")}
            className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white p-2 rounded-lg hover:from-rose-900 hover:via-red-800 hover:to-rose-600"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          <Link
            href={`/feed?user=${encodeURIComponent(thread.name)}`}
            className="bg-zinc-900 text-gray-200 p-2 rounded-lg hover:bg-zinc-800"
            title="View timeline"
          >
            <Info className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="card-dark rounded-xl p-4 min-h-[70vh] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-6">Start your conversation</div>
          )}
          {messages.map((m) => {
            const mine = m.from === "me";
            const isHi = highlightedId === m.id;
            const bubbleBase = `max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-6 shadow transition`;
            const bubbleTone = mine
              ? "bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white"
              : "bg-zinc-800 text-gray-100";
            const bubbleHi = isHi ? " ring-2 ring-rose-500/40 shadow-lg" : "";
            return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${bubbleBase} ${bubbleTone}${bubbleHi}`}
                onClick={() => setHighlightedId(isHi ? null : m.id)}
              >
                <div className={`${m.unsent ? "italic opacity-80" : ""}`}>{m.text}</div>
                <div className={`text-[10px] mt-1 ${mine ? "opacity-80 text-blue-100" : "opacity-70 text-gray-400"}`}>{m.time}</div>
                <div className="flex justify-end mt-1">
                  <button
                    onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                    className="p-1 rounded hover:bg-black/10"
                    title="More"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                {menuFor === m.id && (
                  <div className="mt-1 flex gap-2 justify-end">
                    {m.from === "me" && !m.unsent && (
                      <button
                        onClick={() => unsendMessage(m.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-300 hover:bg-red-900/40"
                      >
                        Unsend
                      </button>
                    )}
                    <button
                      onClick={() => deleteMessage(m.id)}
                      className="text-xs px-2 py-1 rounded bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )})}
          <div ref={endRef} />
        </div>
        <div className="mt-3 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoResize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Write a message..."
            className="flex-1 input-dark px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 resize-none leading-6"
            style={{ overflow: "hidden" }}
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="bg-gradient-to-r from-rose-800 via-red-700 to-rose-500 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50 hover:from-rose-900 hover:via-red-800 hover:to-rose-600 inline-flex items-center"
          >
            <Send className="w-4 h-4 mr-1" />
            Send
          </button>
        </div>
      </div>

      {calling && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCalling(null)}>
          <div className="card-dark rounded-xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl font-bold text-metallic-gold mb-2">
              {calling === "voice" ? "Voice Call" : "Video Call"}
            </div>
            <div className="text-sm text-gray-400 mb-4">Connecting to {thread.name}...</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setCalling(null)}
                className="bg-red-700 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-800"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
