import crypto from "node:crypto";

/*
 * Support desk helpers shared by /api/support and /api/support/stream.
 *
 * Typing indicators and agent presence are short-lived, so they live in
 * memory rather than db.json. They sit on globalThis because Next.js can
 * load this module once per route bundle; globalThis keeps one copy.
 */

type Ephemeral = { agentsSeen: Map<string, number>; typing: Map<string, number> };

const g = globalThis as any;
const live: Ephemeral = g.__nexdropSupport || (g.__nexdropSupport = { agentsSeen: new Map(), typing: new Map() });

const AGENT_ONLINE_MS = 20_000;
const TYPING_MS = 4_000;

export const SUPPORT_TOPICS = ["orders", "withdrawals", "account", "packages", "other"] as const;

export function markAgentSeen(adminId: string){
  live.agentsSeen.set(adminId, Date.now());
}

export function isSupportOnline(){
  const now = Date.now();
  for(const seen of live.agentsSeen.values()){
    if(now - seen < AGENT_ONLINE_MS) return true;
  }
  return false;
}

export function setTyping(conversationId: string, side: "agent" | "customer"){
  live.typing.set(`${conversationId}:${side}`, Date.now());
}

export function clearTyping(conversationId: string, side: "agent" | "customer"){
  live.typing.delete(`${conversationId}:${side}`);
}

function isTyping(conversationId: string, side: "agent" | "customer"){
  const at = live.typing.get(`${conversationId}:${side}`);
  return !!at && Date.now() - at < TYPING_MS;
}

export function ticketNumber(conversationId: string){
  return "NX-" + String(conversationId).replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function getOrCreateConversation(db: any, customerId: string){
  let c = db.conversations.find((x: any) => x.customerId === customerId);
  if(!c){
    const now = new Date().toISOString();
    c = { id: crypto.randomUUID(), customerId, status: "open", createdAt: now, updatedAt: now };
    db.conversations.push(c);
  }
  return c;
}

export function addSupportSystemMessage(db: any, c: any, text: string){
  const message = {
    id: crypto.randomUUID(),
    conversationId: c.id,
    senderId: "system",
    senderRole: "system",
    text,
    createdAt: new Date().toISOString(),
    readBy: []
  };
  db.messages.push(message);
  c.updatedAt = message.createdAt;
  return message;
}

function senderRoleOf(m: any, customerId: string){
  if(m.senderId === "system") return "system";
  return m.senderId === customerId ? "customer" : "agent";
}

// Agents read customer messages; customers read agent messages. System events never count.
function unreadFor(messages: any[], viewer: any, customerId: string){
  return messages.filter((m: any) => {
    const role = senderRoleOf(m, customerId);
    if(role === "system") return false;
    const fromOtherSide = viewer.role === "admin" ? role === "customer" : role === "agent";
    return fromOtherSide && !(m.readBy || []).includes(viewer.id);
  }).length;
}

export function serializeConversation(db: any, c: any, viewer: any){
  const customer = db.users.find((u: any) => u.id === c.customerId);
  const raw = db.messages.filter((m: any) => m.conversationId === c.id);
  const namesById = new Map<string, string>(db.users.map((u: any) => [u.id, u.name]));

  const messages = raw.map((m: any) => {
    const senderRole = senderRoleOf(m, c.customerId);
    return {
      ...m,
      senderRole,
      senderName: senderRole === "system" ? "Nexdrop" : (namesById.get(m.senderId) || (senderRole === "agent" ? "Support" : "Customer"))
    };
  });

  const isAgent = viewer.role === "admin";

  return {
    id: c.id,
    customerId: c.customerId,
    ticket: ticketNumber(c.id),
    status: c.status === "resolved" ? "resolved" : "open",
    topic: c.topic || null,
    createdAt: c.createdAt || raw[0]?.createdAt || c.updatedAt,
    updatedAt: c.updatedAt,
    resolvedAt: c.resolvedAt || null,
    customer: customer ? {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      profileImage: customer.profileImage || "",
      // Extra profile context is only for agents
      ...(isAgent ? {
        shopName: customer.shopName || "",
        country: customer.country || "",
        kycStatus: customer.kycStatus || "pending",
        plan: customer.currentPackageName || customer.currentPackage || "",
        status: customer.status,
        createdAt: customer.createdAt,
        orderCount: (db.orders || []).filter((o: any) => o.customerId === customer.id).length
      } : {})
    } : null,
    messages,
    unreadCount: unreadFor(raw, viewer, c.customerId),
    typing: isTyping(c.id, isAgent ? "customer" : "agent")
  };
}

export function supportSnapshot(db: any, viewer: any){
  const supportOnline = isSupportOnline();

  if(viewer.role === "admin"){
    const conversations = db.conversations.map((c: any) => serializeConversation(db, c, viewer));
    return {
      conversations,
      unreadCount: conversations.reduce((sum: number, c: any) => sum + c.unreadCount, 0),
      supportOnline
    };
  }

  const c = db.conversations.find((x: any) => x.customerId === viewer.id);
  const conversation = c ? serializeConversation(db, c, viewer) : null;
  return { conversation, unreadCount: conversation?.unreadCount || 0, supportOnline };
}
