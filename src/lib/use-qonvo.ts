import { useCallback, useEffect, useState } from "react";
import {
  ROOMS,
  allRoomMessages,
  clearAll,
  loadJson,
  saveJson,
  type Campaign,
  type ChatMsg,
  type Join,
  type Note,
  type Post,
  type Team,
} from "@/lib/qonvo-data";
import { DEMO_ADS, DEMO_JOINS, DEMO_NOTES, DEMO_POSTS } from "@/lib/qonvo-seed";

function guestName() {
  return `Guest#${Math.floor(1000 + Math.random() * 9000)}`;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useQonvo() {
  const [ready, setReady] = useState(false);
  const [handle, setHandle] = useState("");
  const [roomId, setRoomId] = useState("global");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [joins, setJoins] = useState<Join[]>([]);
  const [openPost, setOpenPost] = useState<string | null>(null);

  const persistNotes = useCallback((next: Note[]) => {
    setNotes(next);
    saveJson("notes", next);
  }, []);

  const note = useCallback(
    (text: string) => {
      persistNotes([{ id: uid(), text, ts: Date.now() }, ...notes].slice(0, 50));
    },
    [notes, persistNotes],
  );

  useEffect(() => {
    setHandle(loadJson("me", ""));
    setRoomId(loadJson("room", "global"));
    const posts0 = loadJson<Post[]>("posts", []);
    const ads0 = loadJson<Campaign[]>("ads", []);
    const notes0 = loadJson<Note[]>("notes", []);
    const joins0 = loadJson<Join[]>("joins", []);
    const posts = DEMO_POSTS.some((d) => posts0.some((p) => p.id === d.id))
      ? posts0
      : [...DEMO_POSTS, ...posts0];
    const ads = DEMO_ADS.some((d) => ads0.some((p) => p.id === d.id))
      ? ads0
      : [...DEMO_ADS, ...ads0];
    setPosts(posts);
    saveJson("posts", posts);
    setCampaigns(
      ads.map((c) => ({
        ...c,
        status: c.status ?? "pending",
        placement: c.placement ?? "sidebar",
      })),
    );
    saveJson("ads", ads);
    const notes = notes0.length ? notes0 : DEMO_NOTES;
    const joins = joins0.length ? joins0 : DEMO_JOINS;
    setNotes(notes);
    setJoins(joins);
    if (!notes0.length) saveJson("notes", notes);
    if (!joins0.length) saveJson("joins", joins);
    setPins(loadJson("pins", []));
    setTeams(loadJson("teams", []));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const stored = loadJson<ChatMsg[]>(`msgs.${roomId}`, []);
    setMsgs(stored);
  }, [roomId, ready]);

  const recordJoin = useCallback((name: string, room?: string) => {
    setJoins((prev) => {
      const next = [{ name, ts: Date.now(), room }, ...prev.filter((j) => j.name !== name)].slice(0, 20);
      saveJson("joins", next);
      return next;
    });
  }, []);

  const openRoom = useCallback((id: string) => {
    setRoomId(id);
    saveJson("room", id);
  }, []);

  const ensureHandle = useCallback(() => {
    if (handle) return handle;
    const name = guestName();
    setHandle(name);
    saveJson("me", name);
    recordJoin(name, roomId);
    return name;
  }, [handle, recordJoin, roomId]);

  const rename = useCallback((name: string) => {
    const next = name.trim().slice(0, 24);
    if (!next) return;
    setHandle(next);
    saveJson("me", next);
    recordJoin(next, roomId);
    note(`Handle set to ${next}`);
  }, [note, recordJoin, roomId]);

  const send = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body) return;
      const who = ensureHandle();
      setMsgs((prev) => {
        const next = [...prev, { n: who, t: body, ts: Date.now(), rx: {} }];
        saveJson(`msgs.${roomId}`, next.slice(-80));
        return next;
      });
      note(`Sent in ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
    },
    [ensureHandle, note, roomId],
  );

  const react = useCallback(
    (ts: number, kind: string) => {
      setMsgs((prev) => {
        const next = prev.map((m) => {
          if (m.ts !== ts) return m;
          const rx = { ...(m.rx ?? {}) };
          rx[kind] = (rx[kind] ?? 0) + 1;
          return { ...m, rx };
        });
        saveJson(`msgs.${roomId}`, next);
        return next;
      });
    },
    [roomId],
  );

  const pinRoom = useCallback(() => {
    const next = [roomId, ...pins.filter((p) => p !== roomId)].slice(0, 30);
    setPins(next);
    saveJson("pins", next);
    note(`Bookmarked ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
  }, [note, pins, roomId]);

  const unpin = useCallback((id: string) => {
    const next = pins.filter((p) => p !== id);
    setPins(next);
    saveJson("pins", next);
  }, [pins]);

  const publishPost = useCallback(
    (draft: {
      title: string;
      body: string;
      excerpt?: string;
      category?: string;
      tags?: string;
      link?: string;
      image?: string;
      slug?: string;
      status?: "draft" | "publish";
    }) => {
      const t = draft.title.trim();
      const b = draft.body.trim();
      if (!t || !b) return;
      const who = ensureHandle();
      const item: Post = {
        id: uid(),
        title: t,
        body: b,
        excerpt: draft.excerpt?.trim() || b.slice(0, 140),
        author: who,
        ts: Date.now(),
        comments: [],
        category: draft.category,
        tags: draft.tags?.trim(),
        link: draft.link,
        image: draft.image,
        slug: draft.slug,
        status: draft.status ?? "publish",
      };
      const next = [item, ...posts];
      setPosts(next);
      saveJson("posts", next);
      if (item.status === "publish") {
        setOpenPost(item.id);
        note(`New feed posted: “${t}”`);
      } else {
        note(`Draft saved: “${t}”`);
      }
    },
    [ensureHandle, note, posts],
  );

  const commentPost = useCallback(
    (postId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      const who = ensureHandle();
      const next = posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, { author: who, body: text, ts: Date.now() }] } : p,
      );
      setPosts(next);
      saveJson("posts", next);
    },
    [ensureHandle, posts],
  );

  const createTeam = useCallback(
    (name: string) => {
      const n = name.trim();
      if (!n) return;
      const who = ensureHandle();
      const next = [{ id: uid(), name: n, members: [who] }, ...teams];
      setTeams(next);
      saveJson("teams", next);
      note(`Created team ${n}`);
    },
    [ensureHandle, note, teams],
  );

  const joinTeam = useCallback(
    (id: string) => {
      const who = ensureHandle();
      const next = teams.map((t) =>
        t.id === id && !t.members.includes(who) ? { ...t, members: [...t.members, who] } : t,
      );
      setTeams(next);
      saveJson("teams", next);
    },
    [ensureHandle, teams],
  );

  const saveAd = useCallback(
    (name: string, text: string, extra?: Partial<Campaign>) => {
      const n = name.trim();
      if (!n) return;
      const next: Campaign[] = [
        {
          id: uid(),
          name: n,
          note: text.trim(),
          ts: Date.now(),
          status: extra?.status ?? "pending",
          placement: extra?.placement ?? "sidebar",
          txHash: extra?.txHash,
          amount: extra?.amount,
        },
        ...campaigns,
      ];
      setCampaigns(next);
      saveJson("ads", next);
      note(`Ad submitted: ${n}`);
    },
    [campaigns, note],
  );

  const patchAd = useCallback(
    (id: string, patch: Partial<Campaign>) => {
      const next = campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c));
      setCampaigns(next);
      saveJson("ads", next);
    },
    [campaigns],
  );

  const reset = useCallback(() => {
    clearAll();
    setHandle("");
    setRoomId("global");
    setMsgs([]);
    setPosts([]);
    setPins([]);
    setNotes([]);
    setTeams([]);
    setCampaigns([]);
    setJoins([]);
    setOpenPost(null);
  }, []);

  const scores = allRoomMessages().reduce<Record<string, number>>((acc, m) => {
    acc[m.n] = (acc[m.n] ?? 0) + 1;
    return acc;
  }, {});

  const badges = [
    { id: "msg", label: "First message", on: allRoomMessages().some((m) => m.n === handle) },
    { id: "pin", label: "Bookmarker", on: pins.length > 0 },
    { id: "post", label: "Forum starter", on: posts.some((p) => p.author === handle) },
    { id: "team", label: "Teammate", on: teams.some((t) => t.members.includes(handle)) },
    { id: "travel", label: "World traveler", on: pins.length >= 5 },
  ];

  return {
    ready,
    handle,
    roomId,
    msgs,
    posts,
    pins,
    notes,
    teams,
    campaigns,
    joins,
    openPost,
    setOpenPost,
    scores,
    badges,
    openRoom,
    rename,
    send,
    react,
    pinRoom,
    unpin,
    publishPost,
    commentPost,
    createTeam,
    joinTeam,
    saveAd,
    patchAd,
    reset,
    setJoinHandle: rename,
  };
}
