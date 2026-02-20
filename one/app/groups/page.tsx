"use client";

import { useMemo, useState } from "react";
import { Users, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function GroupsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  const campusGroups = [
    { slug: "msu-main", display: "MSU Main" },
    { slug: "msu-iit", display: "MSU IIT" },
    { slug: "msu-gensan", display: "MSU Gensan" },
    { slug: "msu-tawi-tawi", display: "MSU Tawi-Tawi" },
    { slug: "msu-naawan", display: "MSU Naawan" },
    { slug: "msu-maguindanao", display: "MSU Maguindanao" },
    { slug: "msu-sulu", display: "MSU Sulu" },
    { slug: "msu-buug", display: "MSU Buug" },
    { slug: "msu-lncat", display: "MSU LNCAT" },
    { slug: "msu-lnac", display: "MSU LNAC" },
    { slug: "msu-msat", display: "MSU MSAT" },
  ];

  type Group = {
    id: number;
    name: string;
    campus: string;
    members: string;
    category: "Academic" | "Interest" | "Gaming" | "Campus" | "General";
    joined: boolean;
    slug: string;
  };

  const baseGroups: Group[] = [
    {
      id: 1,
      name: "CCS Students",
      campus: "MSU-IIT",
      members: "1.2k members",
      category: "Academic",
      joined: false,
      slug: "ccs-students"
    },
    {
      id: 2,
      name: "Anime Lovers",
      campus: "All Campuses",
      members: "850 members",
      category: "Interest",
      joined: false,
      slug: "anime-lovers"
    },
    {
      id: 3,
      name: "Esports Varsities",
      campus: "MSU-Marawi",
      members: "300 members",
      category: "Gaming",
      joined: false,
      slug: "esports-varsities"
    }
  ];

  const campusGroupEntries: Group[] = campusGroups.map((c, idx) => ({
    id: 100 + idx,
    name: `${c.display} Group`,
    campus: c.display,
    members: "—",
    category: "Campus",
    joined: false,
    slug: c.slug
  }));

  const userKey = useMemo(() => {
    const id = user?.email || user?.uid || "guest";
    return `group_membership:${id}`;
  }, [user]);

  const countsKey = "group_member_counts";
  const readCounts = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem(countsKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };
  const saveCounts = (m: Record<string, number>) => {
    try { localStorage.setItem(countsKey, JSON.stringify(m)); } catch {}
  };
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>(() => readCounts());
  const getBaseCount = (g: Group) => {
    const fromMap = memberCounts[g.slug];
    if (typeof fromMap === "number") return Math.max(0, fromMap);
    const m = String(g.members || "").trim();
    const n = Number((m.match(/\d+/)?.[0]) || 0) || 0;
    return Math.max(0, n);
  };
  const setCountFor = (slug: string, n: number) => {
    const next = { ...memberCounts, [slug]: Math.max(0, n) };
    setMemberCounts(next);
    saveCounts(next);
  };

  const readGroups = (): Group[] => {
    try {
      const s = localStorage.getItem("groups_list");
      const parsed: Group[] = s ? JSON.parse(s) : [...campusGroupEntries, ...baseGroups];
      const hasCampus = parsed.some(g => g.category === "Campus");
      if (!hasCampus) {
        const merged = [...campusGroupEntries, ...parsed];
        try { localStorage.setItem("groups_list", JSON.stringify(merged)); } catch {}
        return merged;
      }
      return parsed;
    } catch {
      return [...campusGroupEntries, ...baseGroups];
    }
  };
  const saveGroups = (list: Group[]) => {
    try {
      localStorage.setItem("groups_list", JSON.stringify(list));
    } catch {}
  };
  const readMembership = (): Set<string> => {
    try {
      const s = localStorage.getItem(userKey);
      if (!s) return new Set();
      return new Set(JSON.parse(s));
    } catch {
      return new Set();
    }
  };
  const saveMembership = (set: Set<string>) => {
    try {
      localStorage.setItem(userKey, JSON.stringify(Array.from(set)));
    } catch {}
  };

  const [groups, setGroups] = useState<Group[]>(readGroups);
  const [membership, setMembership] = useState<Set<string>>(readMembership());

  const toggleJoin = (id: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking join
    e.stopPropagation();
    if (!user) {
      showToast("Log in to join groups", "error");
      return;
    }
    
    const g = groups.find(gx => gx.id === id);
    if (!g) return;
    const slug = g.slug ?? String(g.id);
    const next = new Set(membership);
    if (next.has(slug)) {
      next.delete(slug);
      showToast(`Left ${g.name}`, "success");
      setCountFor(slug, getBaseCount(g) - 1);
    } else {
      next.add(slug);
      showToast(`Joined ${g.name}`, "success");
      setCountFor(slug, getBaseCount(g) + 1);
    }
    setMembership(next);
    saveMembership(next);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const slug = newGroupName.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 60);
    const newGroup: Group = {
      id: Date.now(),
      name: newGroupName,
      campus: "General",
      members: "1 member",
      category: "General",
      joined: true,
      slug
    };

    const next = [newGroup, ...groups];
    setGroups(next);
    saveGroups(next);
    const mem = new Set(membership);
    mem.add(slug);
    setMembership(mem);
    saveMembership(mem);
    setCountFor(slug, 1);
    setNewGroupName("");
    setIsCreating(false);
    showToast("Group created successfully!", "success");
  };

  return (
    <div className="max-w-xl mx-auto pt-4 pb-24 px-4">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-metallic-gold">Groups</h1>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCreating(true)}
          className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:from-rose-800 hover:via-red-700 hover:to-rose-600 transition flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create
        </motion.button>
      </header>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsCreating(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-dark w-full max-w-sm p-6"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Create Group</h3>
                    <button onClick={() => setIsCreating(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleCreateGroup}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input 
                        type="text"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-gray-50 text-gray-900"
                        placeholder="e.g. Hiking Club"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end">
                        <button 
                            type="submit"
                            disabled={!newGroupName.trim()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50 hover:bg-blue-700 transition"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="space-y-4">
        <AnimatePresence>
            {groups.map((group, index) => {
              const slug = group.slug ?? String(group.id);
              const joined = membership.has(slug);
              return (
            <Link 
              href={`/groups/${encodeURIComponent(slug)}`} 
              key={group.id} 
              className="block"
              onClick={(e) => {
                if (!joined) {
                  e.preventDefault();
                  showToast("Join group to view and post", "error");
                }
              }}
            >
            <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="card-dark p-4 rounded-xl shadow-sm flex items-center cursor-pointer hover:bg-zinc-800"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-4 flex-shrink-0">
                    <Users className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-metallic-gold truncate">{group.name}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {group.campus} • {group.category} • {(() => {
                        const c = getBaseCount(group);
                        return `${c} ${c === 1 ? "member" : "members"}`;
                      })()}
                      {joined && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Joined</span>}
                    </p>
                    </div>
                    
                    <div className="text-xs text-gray-400 mr-3 hidden sm:block">
                    {group.members}
                    </div>
                    
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => toggleJoin(group.id, e)}
                        className={`px-4 py-1.5 text-sm rounded-full font-semibold transition ${
                            joined 
                            ? "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100" 
                            : "bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 text-white hover:from-rose-800 hover:via-red-700 hover:to-rose-600"
                        }`}
                    >
                    {joined ? (
                        <span className="flex items-center"><X className="w-3 h-3 mr-1" /> Leave</span>
                    ) : "Join"}
                    </motion.button>
                </motion.div>
            </Link>
              )})}
        </AnimatePresence>
      </div>
    </div>
  );
}
