// src/utils/netDebug.ts
export type NetPhase = "request" | "response" | "error";

export type NetDebugEvent = {
  id: string;
  phase: NetPhase;
  url: string;
  baseURL: string;
  method: string;
  withCredentials: boolean;
  startedAt?: number;
  durationMs?: number;
  status?: number;
  requestHeaders?: Record<string, unknown>;
  responseHeaders?: Record<string, string>;
  errorCode?: string;
  errorMessage?: string;
  preflightHint?: string;
  payloadPreview?: unknown;
};

type NetDebugStore = {
  events: NetDebugEvent[];
  max: number;
};

declare global {
  interface Window {
    __NETDEBUG?: NetDebugStore;
  }
}

const MAX_EVENTS = 200;

function getStore(): NetDebugStore {
  if (!window.__NETDEBUG) {
    window.__NETDEBUG = { events: [], max: MAX_EVENTS };
  }
  return window.__NETDEBUG;
}

export function publishNetEvent(ev: NetDebugEvent) {
  const store = getStore();
  store.events.push(ev);
  if (store.events.length > store.max) {
    store.events.splice(0, store.events.length - store.max);
  }
  // Notifica listeners
  document.dispatchEvent(new CustomEvent<NetDebugEvent>("netdebug:event", { detail: ev }));
}

export function getNetEvents() {
  return getStore().events.slice().reverse(); // mais recentes primeiro
}

export function clearNetEvents() {
  const store = getStore();
  store.events = [];
  document.dispatchEvent(new CustomEvent("netdebug:clear"));
}
