import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";

export type DSUser = {
  displayName: string;
  username: string;
  bio?: string;
  location?: string;
  website?: string;
  campus?: string | null;
  createdAt?: number;
  followers?: number;
  following?: number;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  followersList?: string[];
  followingList?: string[];
  sessionVersion?: number;
};

export type DSPost = {
  id: string;
  author: string;
  text: string;
  createdAt: unknown;
};

export type DSThread = {
  id: string;
  participants: string[];
  names?: string[];
  lastMessage?: string;
  updatedAt: unknown;
};

export type DSMessage = {
  id: string;
  from: string;
  text: string;
  createdAt: unknown;
};

export async function getUserByEmail(email: string) {
  const ref = doc(db, "users", email);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as DSUser) : null;
}

export async function getUserByDisplayName(name: string) {
  const q = query(collection(db, "users"), where("displayName", "==", name));
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  const d = snaps.docs[0];
  return { id: d.id, ...(d.data() as DSUser) };
}

export async function upsertUser(email: string, data: Partial<DSUser>) {
  const ref = doc(db, "users", email);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data as Partial<DSUser>);
  } else {
    await setDoc(ref, data as Partial<DSUser>);
  }
}

export async function followUser(myEmail: string, myDisplay: string, targetDisplay: string) {
  const meRef = doc(db, "users", myEmail);
  const tq = query(collection(db, "users"), where("displayName", "==", targetDisplay));
  const tRes = await getDocs(tq);
  if (tRes.empty) return;
  const tRef = tRes.docs[0].ref;
  await updateDoc(meRef, {
    following: increment(1),
    followingList: arrayUnion(targetDisplay),
  });
  await updateDoc(tRef, {
    followers: increment(1),
    followersList: arrayUnion(myDisplay),
  });
  const nColl = collection(db, "users", tRes.docs[0].id, "notifications");
  await addDoc(nColl, {
    type: "follow",
    from: myDisplay,
    time: serverTimestamp(),
    read: false,
  });
}

export async function unfollowUser(myEmail: string, myDisplay: string, targetDisplay: string) {
  const meRef = doc(db, "users", myEmail);
  const tq = query(collection(db, "users"), where("displayName", "==", targetDisplay));
  const tRes = await getDocs(tq);
  if (tRes.empty) return;
  const tRef = tRes.docs[0].ref;
  await updateDoc(meRef, {
    following: increment(-1),
    followingList: arrayRemove(targetDisplay),
  });
  await updateDoc(tRef, {
    followers: increment(-1),
    followersList: arrayRemove(myDisplay),
  });
}

export async function createPost(author: string, text: string) {
  const ref = await addDoc(collection(db, "posts"), {
    author,
    text,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listPosts(limit?: number) {
  const qBase = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snaps = await getDocs(qBase);
  const list: DSPost[] = [];
  snaps.forEach((d) => {
    const data = d.data() as Partial<DSPost>;
    const { id: _omit, ...rest } = data;
    list.push({ id: d.id, ...(rest as Omit<DSPost, "id">) });
  });
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export async function listUserPosts(displayName: string) {
  const qx = query(collection(db, "posts"), where("author", "==", displayName), orderBy("createdAt", "desc"));
  const snaps = await getDocs(qx);
  const list: DSPost[] = [];
  snaps.forEach((d) => {
    const data = d.data() as Partial<DSPost>;
    const { id: _omit, ...rest } = data;
    list.push({ id: d.id, ...(rest as Omit<DSPost, "id">) });
  });
  return list;
}

export async function createThread(participants: string[], names?: string[]) {
  const ref = await addDoc(collection(db, "threads"), {
    participants,
    names: names || [],
    lastMessage: "",
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(threadId: string, from: string, text: string) {
  const mRef = await addDoc(collection(db, "threads", threadId, "messages"), {
    from,
    text,
    createdAt: serverTimestamp(),
  });
  const tRef = doc(db, "threads", threadId);
  await updateDoc(tRef, { lastMessage: text, updatedAt: serverTimestamp() });
  return mRef.id;
}

export async function listThreadsFor(name: string) {
  const qx = query(collection(db, "threads"), where("participants", "array-contains", name), orderBy("updatedAt", "desc"));
  const snaps = await getDocs(qx);
  const list: DSThread[] = [];
  snaps.forEach((d) => {
    const data = d.data() as Partial<DSThread>;
    const { id: _omit, ...rest } = data;
    list.push({ id: d.id, ...(rest as Omit<DSThread, "id">) });
  });
  return list;
}

export async function listMessages(threadId: string) {
  const qx = query(collection(db, "threads", threadId, "messages"), orderBy("createdAt", "asc"));
  const snaps = await getDocs(qx);
  const list: DSMessage[] = [];
  snaps.forEach((d) => {
    const data = d.data() as Partial<DSMessage>;
    const { id: _omit, ...rest } = data;
    list.push({ id: d.id, ...(rest as Omit<DSMessage, "id">) });
  });
  return list;
}

export async function addNotification(userEmail: string, n: { type: string; from?: string; read?: boolean }) {
  await addDoc(collection(db, "users", userEmail, "notifications"), {
    type: n.type,
    from: n.from || "",
    read: n.read ?? false,
    time: serverTimestamp(),
  });
}

export async function setTyping(threadId: string, email: string, isTyping: boolean) {
  const tRef = doc(db, "threads", threadId);
  await updateDoc(tRef, { [`typing.${email}`]: isTyping, updatedAt: serverTimestamp() });
}

export async function markMessageSeen(threadId: string, messageId: string, email: string) {
  const mRef = doc(db, "threads", threadId, "messages", messageId);
  await updateDoc(mRef, { seenBy: arrayUnion(email) });
}
