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
  type MusicTrack,
  type Note,
  type Post,
  parseMusicUrl,
  type Team,
} from "@/lib/qonvo-data";
import { DEMO_ADS, DEMO_JOINS, DEMO_NOTES, DEMO_POSTS, DEMO_TRACKS } from "@/lib/qonvo-seed";
import { joinTeamRow, listAds, listMsgs, listPins, listPosts, listTeams, listTracks, purgeMsgs, saveAdRow, saveComment, saveMsg, savePin, savePost, saveTeam, saveTrack } from "@/lib/forum-server";
import { setAdStatus } from "@/lib/staff-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

function guestName() {
  return `Guest#${Math.floor(1000 + Math.random() * 9000)}`;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function passKey(name: string, pass: string) {
  return `${name.toLowerCase()}::${pass}`;
}

export function useQonvo() {
  const session = useCurrentUserState();
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
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [openTrack, setOpenTrack] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");

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
    const posts = [
      ...DEMO_POSTS.filter((d) => !posts0.some((p) => p.id === d.id)),
      ...posts0.map((p) => {
        const demo = DEMO_POSTS.find((d) => d.id === p.id);
        return demo ? { ...p, image: demo.image } : p;
      }),
    ];
    const ads = [
      ...DEMO_ADS.filter((d) => !ads0.some((p) => p.id === d.id)),
      ...ads0,
    ];
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
    const tracks0 = loadJson<MusicTrack[]>("tracks", []);
    const tracks = [
      ...DEMO_TRACKS.filter((d) => !tracks0.some((t) => t.id === d.id)),
      ...tracks0.map((t) => {
        const demo = DEMO_TRACKS.find((d) => d.id === t.id);
        return demo ?? t;
      }),
    ].filter((t) => !!parseMusicUrl(t.url));
    setTracks(tracks);
    saveJson("tracks", tracks);
    setReady(true);
    void Promise.all([listPosts(), listTracks(), listAds()])
      .then(([dbPosts, dbTracks, dbAds]) => {
        if (dbPosts.length) {
          setPosts(
            dbPosts.map((p) => ({
              ...p,
              excerpt: p.excerpt ?? undefined,
              category: p.category ?? undefined,
              tags: p.tags ?? undefined,
              link: p.link ?? undefined,
              image: p.image ?? undefined,
              slug: p.slug ?? undefined,
              status: p.status as Post["status"],
              comments: p.comments ?? [],
            })),
          );
        }
        if (dbTracks.length) {
          setTracks(
            dbTracks.map((t) => ({
              ...t,
              embed: t.embed ?? undefined,
              cover: t.cover ?? undefined,
              genre: t.genre ?? undefined,
              album: t.album ?? undefined,
              note: t.note ?? undefined,
              tags: t.tags ?? undefined,
            })),
          );
        }
        if (dbAds.length) setCampaigns(dbAds);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void listMsgs({ data: roomId })
      .then(setMsgs)
      .catch(() => setMsgs(loadJson(`msgs.${roomId}`, [])));
  }, [roomId, ready]);

  useEffect(() => {
    if (session.isPending) return;
    if (session.user) {
      const name = session.user.displayName || session.user.primaryEmail || session.user.id.slice(0, 16);
      setHandle(name);
      setAuthed(true);
      saveJson("me", name);
      saveJson("authed", name);
      void listPins()
        .then(setPins)
        .catch(() => undefined);
      void listTeams()
        .then(setTeams)
        .catch(() => undefined);
    } else {
      setAuthed(false);
    }
  }, [session.isPending, session.user]);

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

  const register = useCallback((name: string, pass: string, agreed?: boolean) => {
    const n = name.trim().slice(0, 24);
    const p = pass.trim();
    if (!agreed) {
      setAuthErr("Accept the Terms to register.");
      return false;
    }
    if (n.length < 3 || p.length < 4) {
      setAuthErr("Username 3+ chars, password 4+.");
      return false;
    }
    const users = loadJson<Record<string, string>>("users", {});
    const key = n.toLowerCase();
    if (users[key]) {
      setAuthErr("That username is taken. Sign in.");
      return false;
    }
    users[key] = passKey(n, p);
    saveJson("users", users);
    setHandle(n);
    saveJson("me", n);
    saveJson("authed", n);
    saveJson("terms", "1");
    setAuthed(true);
    setAuthErr("");
    recordJoin(n, roomId);
    note(`Registered ${n}`);
    return true;
  }, [note, recordJoin, roomId]);

  const login = useCallback((name: string, pass: string) => {
    const n = name.trim();
    const users = loadJson<Record<string, string>>("users", {});
    const key = n.toLowerCase();
    if (!users[key] || users[key] !== passKey(n, pass.trim())) {
      setAuthErr("Wrong username or password.");
      return false;
    }
    setHandle(n);
    saveJson("me", n);
    saveJson("authed", n);
    setAuthed(true);
    setAuthErr("");
    recordJoin(n, roomId);
    note(`Signed in ${n}`);
    return true;
  }, [note, recordJoin, roomId]);

  const logout = useCallback(() => {
    saveJson("authed", "");
    setAuthed(false);
  }, []);

  const needAccount = useCallback(() => {
    if (session.user || (authed && handle)) return true;
    note("Register or sign in to do that.");
    return false;
  }, [authed, handle, note, session.user]);

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
      if (!needAccount()) return;
      const who = session.user?.displayName || session.user?.primaryEmail || ensureHandle();
      setMsgs((prev) => [...prev, { n: who, t: body, ts: Date.now(), rx: {} }]);
      void saveMsg({ data: { roomId, text: body } }).catch(() => undefined);
      note(`Sent in ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
    },
    [ensureHandle, needAccount, note, roomId, session.user],
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

  const purgeChat = useCallback(() => {
    setMsgs([]);
    void purgeMsgs({ data: roomId }).catch(() => undefined);
    note(`Chat purged in ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
  }, [note, roomId]);

  const pinRoom = useCallback(() => {
    setPins((prev) => [roomId, ...prev.filter((p) => p !== roomId)].slice(0, 30));
    void savePin({ data: { roomId, on: true } }).catch(() => undefined);
    note(`Bookmarked ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
  }, [note, roomId]);

  const unpin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p !== id));
    void savePin({ data: { roomId: id, on: false } }).catch(() => undefined);
  }, []);

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
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
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
      setPosts((prev) => [item, ...prev]);
      void savePost({
        data: {
          title: t,
          body: b,
          excerpt: item.excerpt,
          category: draft.category,
          tags: draft.tags,
          link: draft.link,
          image: draft.image,
          slug: draft.slug,
        },
      }).catch(() => undefined);
      if (item.status === "publish") {
        setOpenPost(item.id);
        note(`New feed posted: “${t}”`);
      } else {
        note(`Draft saved: “${t}”`);
      }
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const commentPost = useCallback(
    (postId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, { author: who, body: text, ts: Date.now() }] } : p,
        ),
      );
      void saveComment({ data: { postId, body: text } }).catch(() => undefined);
    },
    [ensureHandle, needAccount, session.user],
  );

  const createTeam = useCallback(
    (name: string) => {
      const n = name.trim();
      if (!n) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      const item = { id: uid(), name: n, members: [who] };
      setTeams((prev) => [item, ...prev]);
      void saveTeam({ data: { name: n } }).catch(() => undefined);
      note(`Created team ${n}`);
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const joinTeam = useCallback(
    (id: string) => {
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      setTeams((prev) =>
        prev.map((t) => (t.id === id && !t.members.includes(who) ? { ...t, members: [...t.members, who] } : t)),
      );
      void joinTeamRow({ data: id }).catch(() => undefined);
    },
    [ensureHandle, needAccount, session.user],
  );

  const saveAd = useCallback(
    (name: string, text: string, extra?: Partial<Campaign>) => {
      const n = name.trim();
      if (!n) return;
      if (!needAccount()) return;
      const row = {
        id: uid(),
        name: n,
        note: text.trim(),
        ts: Date.now(),
        status: extra?.status ?? "pending",
        placement: extra?.placement ?? "sidebar",
        txHash: extra?.txHash,
        amount: extra?.amount,
      } as Campaign;
      setCampaigns((prev) => [row, ...prev]);
      void saveAdRow({
        data: {
          name: n,
          note: text.trim(),
          placement: row.placement,
          status: row.status,
          amount: extra?.amount,
          txHash: extra?.txHash,
        },
      }).catch(() => undefined);
      note(`Ad submitted: ${n}`);
    },
    [needAccount, note],
  );

  const patchAd = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (patch.status) {
      void setAdStatus({ data: { id, status: patch.status } }).catch(() => undefined);
    }
  }, []);

  const publishTrack = useCallback(
    (draft: {
      title: string;
      artist: string;
      url: string;
      cover?: string;
      genre?: string;
      album?: string;
      note?: string;
      tags?: string;
    }) => {
      const parsed = parseMusicUrl(draft.url);
      if (!parsed) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      const item: MusicTrack = {
        id: uid(),
        title: draft.title.trim() || "Untitled",
        artist: draft.artist.trim() || who,
        url: parsed.url,
        platform: parsed.platform,
        embed: parsed.embed,
        cover: draft.cover,
        genre: draft.genre,
        album: draft.album,
        note: draft.note,
        tags: draft.tags,
        author: who,
        ts: Date.now(),
      };
      setTracks((prev) => [item, ...prev]);
      void saveTrack({
        data: {
          title: item.title,
          artist: item.artist,
          url: item.url,
          platform: item.platform,
          embed: item.embed,
          cover: item.cover,
          genre: item.genre,
          album: item.album,
          note: item.note,
          tags: item.tags,
        },
      }).catch(() => undefined);
      setOpenTrack(item.id);
      note(`Music listed: “${item.title}”`);
    },
    [ensureHandle, needAccount, note, session.user],
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
    setTracks([]);
    setOpenPost(null);
    setOpenTrack(null);
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
    tracks,
    openPost,
    setOpenPost,
    openTrack,
    setOpenTrack,
    scores,
    badges,
    openRoom,
    rename,
    send,
    react,
    purgeChat,
    pinRoom,
    unpin,
    publishPost,
    publishTrack,
    commentPost,
    createTeam,
    joinTeam,
    saveAd,
    patchAd,
    reset,
    authed,
    authErr,
    register,
    login,
    logout,
    setJoinHandle: rename,
  };
}
