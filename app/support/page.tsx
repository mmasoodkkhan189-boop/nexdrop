"use client";

import { FormEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserShell, AdminShell } from "../components";
import { apiFetch, apiMe, clearSession, getSession } from "../lib";
import { useRouter } from "next/navigation";


/* ============================================================
   Types
   ============================================================ */

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "agent" | "customer" | "system";
  senderName: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  readBy?: string[];
};

type CustomerInfo = {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  shopName?: string;
  country?: string;
  kycStatus?: string;
  plan?: string;
  status?: string;
  createdAt?: string;
  orderCount?: number;
};

type Conversation = {
  id: string;
  customerId: string;
  ticket: string;
  status: "open" | "resolved";
  topic: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  customer?: CustomerInfo | null;
  messages: Message[];
  unreadCount: number;
  typing: boolean;
  draft?: boolean;
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const TOPICS: { id: string; label: string; icon: string; opener: string }[] = [
  { id: "orders",      label: "Orders",          icon: "📦", opener: "Hi, I need help with an order." },
  { id: "withdrawals", label: "Withdrawals",     icon: "💳", opener: "Hi, I have a question about a withdrawal." },
  { id: "account",     label: "Account & KYC",   icon: "🪪", opener: "Hi, I need help with my account / KYC." },
  { id: "packages",    label: "Packages",        icon: "⭐", opener: "Hi, I have a question about packages." },
  { id: "other",       label: "Something else",  icon: "💬", opener: "Hi, I need some help." }
];

const TOPIC_LABEL: Record<string, string> = Object.fromEntries(TOPICS.map(t => [t.id, t.label]));

const QUICK_REPLIES = [
  "Hi! Thanks for reaching out to Nexdrop Care. How can I help you today?",
  "Could you share a few more details, like the order ID or a screenshot?",
  "Thanks, I'm checking this for you now. One moment please.",
  "This should be sorted now. Is there anything else I can help with?",
  "Glad I could help! I'll mark this conversation as resolved."
];


/* ============================================================
   Helpers
   ============================================================ */

function initials(name?: string){
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if(parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function clock(dateStr: string){
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: Date, b: Date){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function dayLabel(dateStr: string){
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if(sameDay(d, today)) return "Today";
  if(sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function shortDate(dateStr?: string | null){
  if(!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function listTime(dateStr: string){
  const label = dayLabel(dateStr);
  return label === "Today" ? clock(dateStr) : label === "Yesterday" ? "Yesterday" : new Date(dateStr).toLocaleDateString([], { day: "numeric", month: "short" });
}

function preview(m?: Message){
  if(!m) return "No messages yet";
  if(m.text) return m.text;
  if(m.imageUrl) return "Photo";
  return "";
}

/* An outgoing message is "seen" once the other side has it in readBy. */
function seenByOtherSide(m: Message, customerId: string){
  const readBy = m.readBy || [];
  return m.senderRole === "agent" ? readBy.includes(customerId) : readBy.some(id => id !== customerId);
}


/* ============================================================
   Icons
   ============================================================ */

const Icon = {
  send: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>,
  clip: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  bolt: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>,
  reopen: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>,
  headset: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/><path d="M18 17v1a3 3 0 0 1-3 3h-3"/></svg>,
  event: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>
};


/* ============================================================
   Live stream
   ============================================================ */

function useSupportStream(onData: (data: any) => void){
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(()=>{
    const session = getSession();
    if(!session?.token) return;

    const controller = new AbortController();
    let buffer = "";

    fetch(`/api/support/stream?token=${encodeURIComponent(session.token)}`, {
      cache: "no-store",
      signal: controller.signal
    }).then(async r=>{
      if(!r.ok || !r.body) throw new Error();
      const reader = r.body.getReader();
      const decoder = new TextDecoder();

      while(true){
        const { value, done } = await reader.read();
        if(done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for(const chunk of chunks){
          const line = chunk.split("\n").find(x=>x.startsWith("data: "));
          if(line){
            try{ onDataRef.current(JSON.parse(line.slice(6))); }catch{}
          }
        }
      }
    }).catch(()=>{});

    return ()=>controller.abort();
  },[]);
}

async function postSupport(body: any){
  const r = await apiFetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}


/* ============================================================
   Small pieces
   ============================================================ */

function Avatar({ name, src, kind = "customer", size = 42, dot }: { name?: string; src?: string; kind?: "customer" | "agent"; size?: number; dot?: "open" | "resolved" | "online" | "away" }){
  return (
    <span className={`nc-avatar ${kind} ${src ? "has-photo" : ""}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {src ? <img src={src} alt={name || "Profile photo"}/> : kind === "agent" ? Icon.headset : initials(name)}
      {dot && <i className={`nc-dot ${dot}`}/>}
    </span>
  );
}

function StatusPill({ status }: { status: "open" | "resolved" }){
  return <span className={`nc-pill ${status}`}>{status === "resolved" ? "Resolved" : "Open"}</span>;
}

function TypingBubble({ label }: { label: string }){
  return (
    <div className="nc-typing" aria-live="polite">
      <span className="nc-typing-dots"><i/><i/><i/></span>
      <span>{label}</span>
    </div>
  );
}


/* ============================================================
   Message thread (grouped bubbles)
   ============================================================ */

type Block =
  | { kind: "day"; key: string; label: string }
  | { kind: "event"; key: string; m: Message }
  | { kind: "group"; key: string; mine: boolean; role: "agent" | "customer"; name: string; messages: Message[] };

function buildBlocks(messages: Message[], isMine: (m: Message)=>boolean): Block[]{
  const blocks: Block[] = [];
  let lastDay = "";
  for(const m of messages){
    const day = dayLabel(m.createdAt);
    if(day !== lastDay){
      blocks.push({ kind: "day", key: "d-" + m.id, label: day });
      lastDay = day;
    }
    if(m.senderRole === "system"){
      blocks.push({ kind: "event", key: m.id, m });
      continue;
    }
    const prev = blocks[blocks.length - 1];
    const lastMsg = prev?.kind === "group" ? prev.messages[prev.messages.length - 1] : null;
    const closeInTime = lastMsg && new Date(m.createdAt).getTime() - new Date(lastMsg.createdAt).getTime() < 5 * 60_000;
    if(prev?.kind === "group" && lastMsg && lastMsg.senderId === m.senderId && closeInTime){
      prev.messages.push(m);
    }else{
      blocks.push({ kind: "group", key: "g-" + m.id, mine: isMine(m), role: m.senderRole as "agent" | "customer", name: m.senderName, messages: [m] });
    }
  }
  return blocks;
}

function Thread({
  conversation,
  isAgent,
  onImage,
  emptyState
}: {
  conversation: Conversation;
  isAgent: boolean;
  onImage: (src: string)=>void;
  emptyState: ReactNode;
}){
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMine = useCallback((m: Message)=> isAgent ? m.senderRole === "agent" : m.senderRole === "customer", [isAgent]);
  const blocks = useMemo(()=>buildBlocks(conversation.messages, isMine), [conversation.messages, isMine]);

  // Only the newest outgoing group shows a receipt, to keep the thread calm.
  const lastMineKey = useMemo(()=>{
    for(let i = blocks.length - 1; i >= 0; i--){
      const b = blocks[i];
      if(b.kind === "group" && b.mine) return b.key;
    }
    return "";
  },[blocks]);

  useEffect(()=>{
    const el = scrollRef.current;
    if(el) el.scrollTop = el.scrollHeight;
  },[conversation.messages.length, conversation.id, conversation.typing]);

  return (
    <div className="nc-thread" ref={scrollRef}>
      {conversation.messages.length === 0 ? emptyState : blocks.map(b=>{
        if(b.kind === "day"){
          return <div className="nc-day" key={b.key}><span>{b.label}</span></div>;
        }
        if(b.kind === "event"){
          return (
            <div className="nc-event" key={b.key}>
              <span>{Icon.event}{b.m.text}<em>{clock(b.m.createdAt)}</em></span>
            </div>
          );
        }
        const last = b.messages[b.messages.length - 1];
        return (
          <div className={`nc-group ${b.mine ? "mine" : "theirs"} ${b.role}`} key={b.key}>
            {!b.mine && <Avatar name={b.name} src={b.role === "customer" ? conversation.customer?.profileImage : undefined} kind={b.role === "agent" ? "agent" : "customer"} size={32}/>}
            <div className="nc-group-body">
              {!b.mine && (
                <div className="nc-sender">
                  {b.name}
                  {b.role === "agent" && <span className="nc-role">Support</span>}
                </div>
              )}
              {b.messages.map((m,i)=>(
                <div
                  className={`nc-bubble ${m.imageUrl ? "with-image" : ""} ${i === 0 ? "first" : ""} ${i === b.messages.length - 1 ? "last" : ""}`}
                  key={m.id}
                >
                  {m.imageUrl && (
                    <button type="button" className="nc-image" onClick={()=>onImage(m.imageUrl!)}>
                      <img src={m.imageUrl} alt="Attachment"/>
                    </button>
                  )}
                  {m.text && <p>{m.text}</p>}
                </div>
              ))}
              <div className="nc-meta">
                {clock(last.createdAt)}
                {b.key === lastMineKey && (
                  seenByOtherSide(last, conversation.customerId)
                    ? <span className="nc-receipt seen">· Seen</span>
                    : <span className="nc-receipt">· Sent</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {conversation.typing && (
        <TypingBubble label={isAgent ? `${conversation.customer?.name || "Customer"} is typing` : "Support is typing"}/>
      )}
    </div>
  );
}


/* ============================================================
   Composer
   ============================================================ */

function Composer({
  customerId,
  isAgent,
  onSent,
  focusKey
}: {
  customerId: string;
  isAgent: boolean;
  onSent: ()=>void;
  focusKey: string;
}){
  const [text,setText] = useState("");
  const [file,setFile] = useState("");
  const [sending,setSending] = useState(false);
  const [error,setError] = useState("");
  const [quickOpen,setQuickOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingPing = useRef(0);

  useEffect(()=>{
    setText(""); setFile(""); setError(""); setQuickOpen(false);
    inputRef.current?.focus();
  },[focusKey]);

  useEffect(()=>{
    const el = inputRef.current;
    if(!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  },[text]);

  const pingTyping = ()=>{
    const now = Date.now();
    if(now - lastTypingPing.current < 2500) return;
    lastTypingPing.current = now;
    postSupport({ action: "typing", customerId }).catch(()=>{});
  };

  const send = async(e?: FormEvent)=>{
    e?.preventDefault();
    if((!text.trim() && !file) || sending) return;
    setSending(true);
    setError("");
    try{
      await postSupport({ text: text.trim(), imageUrl: file, customerId });
      setText("");
      setFile("");
      if(fileRef.current) fileRef.current.value = "";
      lastTypingPing.current = 0;
      onSent();
    }catch(err: any){
      setError(err?.message || "Unable to send message");
    }finally{
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      send();
    }
  };

  const pickFile = (f?: File)=>{
    if(!f) return;
    if(!f.type.startsWith("image/")){ setError("Only images can be attached."); return; }
    if(f.size > MAX_IMAGE_BYTES){ setError("Image is too large (max 2 MB)."); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = ()=>setFile(String(reader.result));
    reader.readAsDataURL(f);
  };

  return (
    <div className="nc-composer-wrap">
      {quickOpen && isAgent && (
        <div className="nc-quick">
          <div className="nc-quick-head">Quick replies</div>
          {QUICK_REPLIES.map(q=>(
            <button type="button" key={q} onClick={()=>{ setText(q); setQuickOpen(false); inputRef.current?.focus(); }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {file && (
        <div className="nc-attach">
          <img src={file} alt="Selected attachment"/>
          <span>Photo attached</span>
          <button type="button" onClick={()=>{ setFile(""); if(fileRef.current) fileRef.current.value = ""; }} aria-label="Remove attachment">✕</button>
        </div>
      )}

      {error && <div className="nc-error">{error}</div>}

      <form className="nc-composer" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>pickFile(e.target.files?.[0])}/>
        <button type="button" className="nc-tool" onClick={()=>fileRef.current?.click()} aria-label="Attach image" title="Attach image">
          {Icon.clip}
        </button>
        {isAgent && (
          <button type="button" className={`nc-tool ${quickOpen ? "on" : ""}`} onClick={()=>setQuickOpen(v=>!v)} aria-label="Quick replies" title="Quick replies">
            {Icon.bolt}
          </button>
        )}
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={e=>{ setText(e.target.value); if(e.target.value.trim()) pingTyping(); }}
          onKeyDown={onKeyDown}
          placeholder={isAgent ? "Reply to customer…" : "Write your message…"}
          disabled={sending}
        />
        <button type="submit" className="nc-send" disabled={sending || (!text.trim() && !file)} aria-label="Send message">
          {Icon.send}
        </button>
      </form>
      <div className="nc-hint">Enter to send · Shift + Enter for a new line</div>
    </div>
  );
}


/* ============================================================
   Image viewer
   ============================================================ */

function Lightbox({ src, onClose }: { src: string; onClose: ()=>void }){
  useEffect(()=>{
    const onKey = (e: globalThis.KeyboardEvent)=>{ if(e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[onClose]);

  return (
    <div className="nc-lightbox" onClick={onClose} role="dialog" aria-label="Image preview">
      <img src={src} alt="Attachment full size" onClick={e=>e.stopPropagation()}/>
      <button type="button" onClick={onClose} aria-label="Close preview">✕</button>
    </div>
  );
}


/* ============================================================
   Agent (admin) desk
   ============================================================ */

function useMarkRead(conversation: Conversation | null){
  const customerId = conversation?.customerId;
  const unread = conversation?.unreadCount || 0;
  useEffect(()=>{
    if(!customerId || !unread) return;
    postSupport({ action: "markRead", customerId }).catch(()=>{});
  },[customerId, unread]);
}

function CustomerPanel({ c, onClose }: { c: Conversation; onClose: ()=>void }){
  const cu = c.customer;
  const rows: [string, ReactNode][] = [
    ["Email", cu?.email || "—"],
    ["Shop", cu?.shopName || "—"],
    ["Country", cu?.country || "—"],
    ["Plan", cu?.plan || "No active plan"],
    ["KYC", <span className={`nc-kyc ${cu?.kycStatus || "pending"}`} key="kyc">{cu?.kycStatus || "pending"}</span>],
    ["Orders", String(cu?.orderCount ?? 0)],
    ["Member since", shortDate(cu?.createdAt)]
  ];
  return (
    <aside className="nc-panel">
      <div className="nc-panel-top">
        <button type="button" className="nc-tool nc-panel-close" onClick={onClose} aria-label="Close details">✕</button>
        <Avatar name={cu?.name} src={cu?.profileImage} size={64}/>
        <b>{cu?.name || "Customer"}</b>
        <span className={`nc-account ${cu?.status === "Suspended" ? "off" : ""}`}>{cu?.status || "Active"} account</span>
      </div>

      <div className="nc-card">
        <div className="nc-card-title">Ticket</div>
        <div className="nc-ticket-row"><span>Number</span><b>{c.ticket}</b></div>
        <div className="nc-ticket-row"><span>Status</span><StatusPill status={c.status}/></div>
        <div className="nc-ticket-row"><span>Topic</span><b>{c.topic ? TOPIC_LABEL[c.topic] || c.topic : "—"}</b></div>
        <div className="nc-ticket-row"><span>Opened</span><b>{c.draft ? "Not started" : shortDate(c.createdAt)}</b></div>
      </div>

      <div className="nc-card">
        <div className="nc-card-title">Customer</div>
        {rows.map(([k,v])=>(
          <div className="nc-ticket-row" key={k}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>

      {cu && (
        <Link href={`/admin/users/${cu.id}`} className="nc-panel-link">Open full profile →</Link>
      )}
    </aside>
  );
}

function AgentDesk({ userId }: { userId: string }){

  const [conversations,setConversations] = useState<Conversation[]>([]);
  const [customers,setCustomers] = useState<CustomerInfo[]>([]);
  const [selected,setSelected] = useState("");
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState<"open" | "resolved" | "all">("open");
  const [picking,setPicking] = useState(false);
  const [showPanel,setShowPanel] = useState(true);
  const [mobileChat,setMobileChat] = useState(false);
  const [lightbox,setLightbox] = useState("");
  const [busy,setBusy] = useState(false);

  const load = useCallback(async()=>{
    const r = await apiFetch(`/api/support?t=${Date.now()}`, { cache: "no-store" });
    if(!r.ok) return;
    const d = await r.json();
    setConversations(d.conversations || []);
  },[]);

  useEffect(()=>{
    load();
    apiFetch("/api/admin/users", { cache: "no-store" })
      .then(r=>r.ok ? r.json() : { users: [] })
      .then(d=>setCustomers((d.users || [])
        .filter((u: any)=>u.role === "customer")
        .map((u: any)=>({
          id: u.id, name: u.name, email: u.email, profileImage: u.profileImage || "", shopName: u.shopName, country: u.country,
          kycStatus: u.kycStatus, plan: u.currentPackageName || u.currentPackage || "", status: u.status, createdAt: u.createdAt
        }))))
      .catch(()=>{});
  },[load]);

  useSupportStream(d=>{ if(d.conversations) setConversations(d.conversations); });

  const lastAt = (c: Conversation)=>new Date(c.messages.at(-1)?.createdAt || c.updatedAt).getTime();

  const counts = useMemo(()=>({
    open: conversations.filter(c=>c.status === "open").length,
    resolved: conversations.filter(c=>c.status === "resolved").length,
    unread: conversations.reduce((s,c)=>s + (c.unreadCount || 0), 0)
  }),[conversations]);

  const q = search.trim().toLowerCase();
  const matches = (name?: string, email?: string, ticket?: string)=>
    !q || (name || "").toLowerCase().includes(q) || (email || "").toLowerCase().includes(q) || (ticket || "").toLowerCase().includes(q);

  const list = useMemo(()=>[...conversations]
    .filter(c=>filter === "all" || c.status === filter)
    .filter(c=>matches(c.customer?.name, c.customer?.email, c.ticket))
    .sort((a,b)=>(b.unreadCount ? 1 : 0) - (a.unreadCount ? 1 : 0) || lastAt(b) - lastAt(a))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ,[conversations, filter, q]);

  const pickList = useMemo(()=>customers.filter(u=>matches(u.name, u.email))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ,[customers, q]);

  const active: Conversation | null = useMemo(()=>{
    if(!selected) return null;
    const existing = conversations.find(c=>c.customerId === selected);
    if(existing) return existing;
    const cu = customers.find(u=>u.id === selected);
    if(!cu) return null;
    const now = new Date().toISOString();
    return { id: "draft-" + cu.id, customerId: cu.id, ticket: "New", status: "open", topic: null, createdAt: now, updatedAt: now, customer: cu, messages: [], unreadCount: 0, typing: false, draft: true };
  },[selected, conversations, customers]);

  useMarkRead(active);

  const open = (customerId: string)=>{
    setSelected(customerId);
    setPicking(false);
    setSearch("");
    setMobileChat(true);
  };

  const toggleStatus = async()=>{
    if(!active || active.draft || busy) return;
    setBusy(true);
    try{
      await postSupport({ action: "setStatus", customerId: active.customerId, status: active.status === "resolved" ? "open" : "resolved" });
      await load();
    }catch{}
    finally{ setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Customer Service</span>
          <h1>Nexdrop Care Desk</h1>
        </div>
        <div className="nc-top-stats">
          <span><b>{counts.open}</b> open</span>
          <span><b>{counts.unread}</b> unread</span>
          <span><b>{counts.resolved}</b> resolved</span>
        </div>
      </div>

      <div className={`nc-desk ${showPanel && active ? "with-panel" : ""} ${mobileChat ? "mobile-chat" : ""}`}>

        {/* ---- inbox ---- */}
        <aside className="nc-inbox">
          <div className="nc-inbox-head">
            <div>
              <b>{picking ? "Start a conversation" : "Inbox"}</b>
              <small>{picking ? "Choose a customer to message" : `${conversations.length} tickets`}</small>
            </div>
            <button
              type="button"
              className={`nc-new ${picking ? "on" : ""}`}
              onClick={()=>{ setPicking(v=>!v); setSearch(""); }}
              title={picking ? "Back to inbox" : "New conversation"}
            >
              {picking ? Icon.back : Icon.plus}
              <span>{picking ? "Inbox" : "New"}</span>
            </button>
          </div>

          <label className="nc-search">
            {Icon.search}
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={picking ? "Search customers…" : "Search name, email or ticket…"}/>
          </label>

          {!picking && (
            <div className="nc-tabs" role="tablist">
              {(["open","resolved","all"] as const).map(f=>(
                <button type="button" key={f} role="tab" aria-selected={filter===f} className={filter===f ? "on" : ""} onClick={()=>setFilter(f)}>
                  {f === "open" ? "Open" : f === "resolved" ? "Resolved" : "All"}
                  <em>{f === "open" ? counts.open : f === "resolved" ? counts.resolved : conversations.length}</em>
                </button>
              ))}
            </div>
          )}

          <div className="nc-list">
            {picking ? (
              pickList.length === 0 ? <div className="nc-list-empty">No customers found.</div> :
              pickList.map(u=>(
                <button type="button" key={u.id} className="nc-item" onClick={()=>open(u.id)}>
                  <Avatar name={u.name} src={u.profileImage} size={40}/>
                  <span className="nc-item-main">
                    <span className="nc-item-line"><b>{u.name}</b></span>
                    <span className="nc-item-line"><span className="nc-item-preview">{u.email}</span></span>
                  </span>
                </button>
              ))
            ) : list.length === 0 ? (
              <div className="nc-list-empty">
                {conversations.length === 0 ? "No tickets yet. Use “New” to message a customer." : "Nothing here."}
              </div>
            ) : list.map(c=>{
              const last = c.messages.at(-1);
              const fromAgent = last?.senderRole === "agent";
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`nc-item ${c.customerId === selected ? "active" : ""} ${c.unreadCount ? "has-unread" : ""}`}
                  onClick={()=>open(c.customerId)}
                >
                  <Avatar name={c.customer?.name} src={c.customer?.profileImage} size={42} dot={c.status}/>
                  <span className="nc-item-main">
                    <span className="nc-item-line">
                      <b>{c.customer?.name || "Customer"}</b>
                      <small>{listTime(last?.createdAt || c.updatedAt)}</small>
                    </span>
                    <span className="nc-item-line">
                      <span className="nc-item-preview">
                        {c.typing ? <em className="nc-item-typing">typing…</em> : <>{fromAgent && <span className="nc-you">You: </span>}{preview(last)}</>}
                      </span>
                      {!!c.unreadCount && <span className="nc-count">{c.unreadCount > 99 ? "99+" : c.unreadCount}</span>}
                    </span>
                    <span className="nc-item-tags">
                      <span className="nc-tag">{c.ticket}</span>
                      {c.topic && <span className="nc-tag soft">{TOPIC_LABEL[c.topic] || c.topic}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ---- conversation ---- */}
        {active ? (
          <section className="nc-chat">
            <header className="nc-chat-head">
              <button type="button" className="nc-tool nc-back" onClick={()=>setMobileChat(false)} aria-label="Back to inbox">{Icon.back}</button>
              <Avatar name={active.customer?.name} src={active.customer?.profileImage} size={42}/>
              <div className="nc-chat-title">
                <b>{active.customer?.name || "Customer"}</b>
                <small>
                  {active.typing ? <span className="nc-live">typing…</span> : <>{active.ticket}{active.topic ? ` · ${TOPIC_LABEL[active.topic] || active.topic}` : ""}</>}
                </small>
              </div>
              <div className="nc-chat-actions">
                {!active.draft && <StatusPill status={active.status}/>}
                {!active.draft && (
                  <button type="button" className={`nc-action ${active.status === "resolved" ? "ghost" : ""}`} onClick={toggleStatus} disabled={busy}>
                    {active.status === "resolved" ? <>{Icon.reopen} Reopen</> : <>{Icon.check} Mark resolved</>}
                  </button>
                )}
                <button type="button" className={`nc-tool ${showPanel ? "on" : ""}`} onClick={()=>setShowPanel(v=>!v)} aria-label="Customer details" title="Customer details">
                  {Icon.info}
                </button>
              </div>
            </header>

            <Thread
              conversation={active}
              isAgent
              onImage={setLightbox}
              emptyState={
                <div className="nc-empty">
                  <Avatar name={active.customer?.name} src={active.customer?.profileImage} size={64}/>
                  <b>Start a conversation with {active.customer?.name}</b>
                  <span>Your message opens a new support ticket in their Help Center.</span>
                </div>
              }
            />

            {active.status === "resolved" && !active.draft && (
              <div className="nc-resolved-bar">
                {Icon.check} Resolved {active.resolvedAt ? `on ${shortDate(active.resolvedAt)}` : ""}. The customer can reply to reopen it.
              </div>
            )}

            <Composer customerId={active.customerId} isAgent onSent={load} focusKey={active.customerId}/>
          </section>
        ) : (
          <section className="nc-chat nc-chat-idle">
            <div className="nc-empty">
              <span className="nc-empty-badge">{Icon.headset}</span>
              <b>Nexdrop Care Desk</b>
              <span>Pick a ticket from the inbox, or press <b>New</b> to message any customer.</span>
            </div>
          </section>
        )}

        {/* ---- customer details ---- */}
        {active && showPanel && <CustomerPanel c={active} onClose={()=>setShowPanel(false)}/>}
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={()=>setLightbox("")}/>}
    </>
  );
}


/* ============================================================
   Customer help center
   ============================================================ */

function HelpCenter(){

  const [conversation,setConversation] = useState<Conversation | null>(null);
  const [online,setOnline] = useState(false);
  const [lightbox,setLightbox] = useState("");
  const [sendingTopic,setSendingTopic] = useState("");
  const started = useRef(false);

  const load = useCallback(async()=>{
    const r = await apiFetch(`/api/support?t=${Date.now()}`, { cache: "no-store" });
    if(!r.ok) return;
    const d = await r.json();
    setOnline(!!d.supportOnline);
    if(d.conversation){
      setConversation(d.conversation);
    }else if(!started.current){
      started.current = true;
      const s = await postSupport({ action: "startConversation" }).catch(()=>({}));
      if(s.conversation) setConversation(s.conversation);
    }
  },[]);

  useEffect(()=>{ load().catch(()=>{}); },[load]);

  useSupportStream(d=>{
    setOnline(!!d.supportOnline);
    if(d.conversation) setConversation(d.conversation);
  });

  useMarkRead(conversation);

  const startTopic = async(t: typeof TOPICS[number])=>{
    if(sendingTopic) return;
    setSendingTopic(t.id);
    try{
      await postSupport({ text: t.opener, topic: t.id });
      await load();
    }catch{}
    finally{ setSendingTopic(""); }
  };

  if(!conversation){
    return <div className="loading-screen">Opening Nexdrop Care…</div>;
  }

  const agentsInThread = Array.from(new Set(conversation.messages.filter(m=>m.senderRole === "agent").map(m=>m.senderName)));

  return (
    <>
      <div className="nc-hero">
        <div className="nc-hero-main">
          <span className="nc-hero-badge">{Icon.headset}</span>
          <div>
            <span className="eyebrow">Help Center</span>
            <h1>Nexdrop Care</h1>
            <p>Chat directly with our support team. Replies appear here instantly.</p>
          </div>
        </div>
        <div className={`nc-presence ${online ? "online" : ""}`}>
          <i/>
          <div>
            <b>{online ? "Support is online" : "Support is away"}</b>
            <small>{online ? "An agent can reply right now" : "Leave a message, we'll reply here"}</small>
          </div>
        </div>
      </div>

      <div className="nc-help">
        <section className="nc-chat">
          <header className="nc-chat-head">
            <Avatar kind="agent" size={42} dot={online ? "online" : "away"}/>
            <div className="nc-chat-title">
              <b>Nexdrop Support</b>
              <small>
                {conversation.typing ? <span className="nc-live">typing…</span> : online ? "Online" : "Away · we'll get back to you"}
              </small>
            </div>
            <div className="nc-chat-actions">
              <span className="nc-tag">{conversation.ticket}</span>
              <StatusPill status={conversation.status}/>
            </div>
          </header>

          <Thread
            conversation={conversation}
            isAgent={false}
            onImage={setLightbox}
            emptyState={
              <div className="nc-welcome">
                <span className="nc-empty-badge">{Icon.headset}</span>
                <b>Hi! How can we help?</b>
                <span>Pick a topic to get started, or just type your question below.</span>
                <div className="nc-topics">
                  {TOPICS.map(t=>(
                    <button type="button" key={t.id} onClick={()=>startTopic(t)} disabled={!!sendingTopic}>
                      <span>{t.icon}</span>{sendingTopic === t.id ? "Sending…" : t.label}
                    </button>
                  ))}
                </div>
              </div>
            }
          />

          {conversation.status === "resolved" && (
            <div className="nc-resolved-bar">
              {Icon.check} This conversation was resolved. Send a message if you need more help.
            </div>
          )}

          <Composer customerId={conversation.customerId} isAgent={false} onSent={load} focusKey={conversation.id}/>
        </section>

        <aside className="nc-help-side">
          <div className="nc-card">
            <div className="nc-card-title">Your ticket</div>
            <div className="nc-ticket-row"><span>Number</span><b>{conversation.ticket}</b></div>
            <div className="nc-ticket-row"><span>Status</span><StatusPill status={conversation.status}/></div>
            <div className="nc-ticket-row"><span>Topic</span><b>{conversation.topic ? TOPIC_LABEL[conversation.topic] || conversation.topic : "—"}</b></div>
            <div className="nc-ticket-row"><span>Opened</span><b>{shortDate(conversation.createdAt)}</b></div>
          </div>

          <div className="nc-card">
            <div className="nc-card-title">Talking with</div>
            {agentsInThread.length === 0 ? (
              <p className="nc-muted">An agent will join as soon as you send a message.</p>
            ) : agentsInThread.map(n=>(
              <div className="nc-agent" key={n}>
                <Avatar kind="agent" size={34}/>
                <div><b>{n}</b><small>Nexdrop Support</small></div>
              </div>
            ))}
          </div>

          <div className="nc-card nc-tips">
            <div className="nc-card-title">Tips for a faster answer</div>
            <ul>
              <li>Mention your order ID if it's about an order.</li>
              <li>Attach a screenshot with the 📎 button.</li>
              <li>Keep everything in this one chat.</li>
            </ul>
          </div>
        </aside>
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={()=>setLightbox("")}/>}
    </>
  );
}


/* ============================================================
   Page
   ============================================================ */

export default function Support(){

  const router = useRouter();
  const [role,setRole] = useState<"customer" | "admin" | null>(null);
  const [userId,setUserId] = useState("");
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    apiMe()
      .then(d=>{
        setRole(d.user.role);
        setUserId(d.user.id);
      })
      .catch(()=>{
        clearSession();
        router.replace("/login");
      })
      .finally(()=>setLoading(false));
  },[router]);

  if(loading) return <div className="loading-screen">Loading Nexdrop Care…</div>;

  if(role === "admin") return <AdminShell><AgentDesk userId={userId}/></AdminShell>;

  return <UserShell><HelpCenter/></UserShell>;
}
