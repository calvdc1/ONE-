"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, MessageSquare, User, Bell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

export default function Navbar() {
  const { user, listNotifications, markAllNotificationsRead } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const notifications = listNotifications ? listNotifications() : [];
  const unread = notifications.filter(n => !n.read).length;

  const navItems = useMemo(() => ([
    { name: 'Newsfeed', href: '/feed', icon: Home },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Profile', href: '/profile', icon: User },
  ]), []);

  useEffect(() => {
    setIsClient(true);
    navItems.forEach(item => {
      try {
        router.prefetch(item.href);
      } catch {}
    });
  }, [router, navItems]);

  // Ensure consistent SSR/CSR markup: only render navbar once mounted on client and user is known
  if (!isClient || !user) {
    return null;
  }
  // Render both: a top header for desktop and a bottom bar for mobile

  return (
    <>
    {/* Desktop top header */}
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 items-center justify-between px-6 py-3 z-50">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 rounded-lg text-gray-300 hover:text-metallic-gold"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => { router.push('/feed'); router.refresh(); }}
          className="font-extrabold text-2xl text-metallic-gold"
          aria-label="Go to Newsfeed"
        >
          ONE
        </button>
      </div>
      <div className="flex-1 max-w-xl mx-6">
        <input
          type="text"
          placeholder="Search"
          className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-gray-200 placeholder:text-gray-400"
          onFocus={() => setNotifOpen(false)}
        />
      </div>
      <div className="flex items-center gap-4 relative">
        <Link href="/feed" className={`text-gray-300 hover:text-metallic-gold ${pathname === '/feed' ? 'text-metallic-gold' : ''}`} aria-label="Newsfeed">
          <Home className="w-6 h-6" />
        </Link>
        <Link href="/groups" className={`text-gray-300 hover:text-metallic-gold ${pathname?.startsWith('/groups') ? 'text-metallic-gold' : ''}`} aria-label="Groups">
          <Users className="w-6 h-6" />
        </Link>
        <Link href="/messages" className={`text-gray-300 hover:text-metallic-gold ${pathname?.startsWith('/messages') ? 'text-metallic-gold' : ''}`} aria-label="Messages">
          <MessageSquare className="w-6 h-6" />
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Notifications"
            className="relative p-1.5 rounded-lg text-gray-300 hover:text-metallic-gold"
          >
            <Bell className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute top-10 right-0 w-80 max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-200">Notifications</span>
                <button
                  onClick={() => { if (markAllNotificationsRead) { markAllNotificationsRead(); } }}
                  className="text-xs text-blue-500"
                >
                  Mark all read
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="text-xs text-gray-400 py-6 text-center">No notifications</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-2 rounded ${n.read ? '' : 'bg-zinc-800'}`}>
                    <div className="text-sm text-gray-100">
                      {n.type === 'follow' && (<span><b>{n.from}</b> followed you</span>)}
                      {n.type === 'like' && (<span><b>{n.from}</b> liked your post</span>)}
                      {n.type === 'comment' && (<span><b>{n.from}</b> commented on your post</span>)}
                      {n.type === 'post' && (<span><b>{n.from}</b> posted a new update</span>)}
                    </div>
                    <div className="text-[10px] text-gray-400">{new Date(n.time).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <Link href="/profile" className={`text-gray-300 hover:text-metallic-gold ${pathname === '/profile' ? 'text-metallic-gold' : ''}`} aria-label="Profile">
          <User className="w-6 h-6" />
        </Link>
      </div>
    </nav>

    {/* Mobile bottom bar */}
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 lg:hidden flex items-center gap-2 px-4 py-2 z-50">
      <button
        type="button"
        onClick={() => { router.push('/feed'); router.refresh(); }}
        className="font-extrabold text-lg text-metallic-gold shrink-0 z-10"
        aria-label="Go to Newsfeed"
      >
        ONE
      </button>
      <div className="relative ml-2 mr-2 shrink-0 z-10">
        <button
          type="button"
          onClick={() => setNotifOpen(o => !o)}
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-gray-300 hover:text-metallic-gold"
        >
          <Bell className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute bottom-12 right-0 w-72 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-2 z-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-200">Notifications</span>
              <button
                onClick={() => { if (markAllNotificationsRead) { markAllNotificationsRead(); } }}
                className="text-xs text-blue-500"
              >
                Mark all read
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">No notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-2 rounded ${n.read ? '' : 'bg-zinc-800'}`}>
                  <div className="text-sm text-gray-100">
                    {n.type === 'follow' && (<span><b>{n.from}</b> followed you</span>)}
                    {n.type === 'like' && (<span><b>{n.from}</b> liked your post</span>)}
                    {n.type === 'comment' && (<span><b>{n.from}</b> commented on your post</span>)}
                    {n.type === 'post' && (<span><b>{n.from}</b> posted a new update</span>)}
                  </div>
                  <div className="text-[10px] text-gray-400">{new Date(n.time).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-around items-center h-14 flex-1 min-w-0">
        {navItems.map((item) => {
          // Check if current path matches the item href or is a sub-path (e.g. /groups/123)
          // Exception: /feed is somewhat root-like for auth users, but strict matching is safer unless subpages exist
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} className="relative group flex flex-col items-center justify-center w-full p-2">
                {isActive && (
                    <motion.div
                        layoutId="nav-pill"
                    className="absolute inset-0 bg-zinc-800 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                
                <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center ${isActive ? 'text-metallic-gold' : 'text-gray-400 hover:text-metallic-gold'} transition-colors duration-200`}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[11px] mt-1 font-semibold">{item.name}</span>
                </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
