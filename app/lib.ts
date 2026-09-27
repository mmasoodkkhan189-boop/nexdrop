"use client";

import { useEffect, useRef } from "react";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  status: "Active" | "Suspended";
  balance?: number;
  profit?: number;
  guaranteeMoney?: number;
  sellerRating?: number;
  shopName?: string;
  currentPackage?: string | null;
  currentPackageName?: string;
  packageStatus?: string;
  productLimit?: number;
  commissionRate?: number;
  kycStatus?: string;
  profileImage?: string;
};

const KEY = "dz_tab_session";

export function saveSession(role: "customer" | "admin", user: AppUser, token: string) {
  if (typeof window !== "undefined") sessionStorage.setItem(KEY, JSON.stringify({ role, user, token }));
}

export function clearSession() {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

export function getSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Global local event emitter for instant multi-component reactivity in the active tab
type Listener = (data?: any) => void;
const mutationListeners = new Set<Listener>();
const streamListeners = new Set<Listener>();

export function emitLocalChange() {
  mutationListeners.forEach(listener => {
    try {
      listener({ localMutation: true });
    } catch {}
  });
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const s = getSession();
  const headers = new Headers(init.headers || {});
  if (s?.token) headers.set("Authorization", `Bearer ${s.token}`);
  const res = await fetch(input, { ...init, headers });
  
  // If this was a mutating request (POST, PUT, PATCH, DELETE) and it succeeded, emit local change
  const method = (init.method || "GET").toUpperCase();
  if (res.ok && method !== "GET" && method !== "HEAD") {
    emitLocalChange();
  }
  
  return res;
}

export async function apiMe() {
  const r = await apiFetch("/api/auth/me", { cache: "no-store" });
  if (!r.ok) throw new Error("Not authenticated");
  return r.json();
}

// Singleton Stream Controller (Only ONE SSE connection per browser window)
let activeController: AbortController | null = null;
let activeToken: string | null = null;
let isStreaming = false;

function startSharedStream(token: string) {
  if (isStreaming && activeToken === token) return;
  
  if (activeController) {
    activeController.abort();
    activeController = null;
  }

  isStreaming = true;
  activeToken = token;
  const controller = new AbortController();
  activeController = controller;
  let buffer = "";

  fetch(`/api/stream?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
    signal: controller.signal
  })
    .then(async res => {
      if (!res.ok || !res.body) {
        isStreaming = false;
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const dataLine = lines.find(line => line.startsWith("data: "));
          if (dataLine) {
            try {
              const parsed = JSON.parse(dataLine.slice(6));
              streamListeners.forEach(listener => {
                try {
                  listener(parsed);
                } catch {}
              });
            } catch {}
          }
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      isStreaming = false;
    });
}

function stopSharedStreamIfEmpty() {
  if (streamListeners.size === 0 && activeController) {
    activeController.abort();
    activeController = null;
    activeToken = null;
    isStreaming = false;
  }
}

/**
 * Universal Real-Time Sync Hook for Next.js Client Components.
 * Subscribes to the single shared Server-Sent Events stream and local mutations.
 */
export function useRealtimeStream(onUpdate?: (data: any) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const session = getSession();
    if (!session?.token) return;

    const handleUpdate: Listener = data => {
      onUpdateRef.current?.(data);
    };

    mutationListeners.add(handleUpdate);
    streamListeners.add(handleUpdate);

    // Start shared singleton stream if not already active
    startSharedStream(session.token);

    return () => {
      mutationListeners.delete(handleUpdate);
      streamListeners.delete(handleUpdate);
      stopSharedStreamIfEmpty();
    };
  }, []);
}
