import { useEffect } from "react";

type Props = {
  enabled?: boolean;
  bottomOffset?: number;
  rightOffset?: number;
  debug?: boolean;
  onOpen?: () => void;
  retryAttempts?: number;
  attemptTimeoutMs?: number;
  retryBackoffMs?: number;
  identityKey?: string;
};

const BASE_SCRIPTS = [
  "https://terra-santos-consultoria-e-desenvolvimento-ltda.odoo.com/im_livechat/loader/3",
  "https://terra-santos-consultoria-e-desenvolvimento-ltda.odoo.com/im_livechat/assets_embed.js",
];

const STYLE_TAG_ID = "odoo-livechat-overrides";
const STYLE_HIDE_ID = "odoo-livechat-visibility";
const SCRIPT_TAG_CLASS = "odoo-livechat-script";

const SELECTORS = [
  'iframe[src*="im_livechat"]',
  "#odoo-livechat-iframe",
  '[id^="odoo-livechat-iframe"]',
  ".o_livechat_widget",
  ".o-livechat",
  ".o_livechat_button",
  ".o_livechat_float_button",
  ".o-thread-window",
  ".o-threadWindow",
  ".o_thread_window",
  ".s_livechat",
].join(", ");

const CLOSED_MARKER = "[ZION_CHAT_ENCERRADO]";

const ZION_LIVECHAT_IDENTITY_LS_KEY = "zion.livechat.identity";
const ZION_LIVECHAT_POS_LS_KEY = "zion.livechat.pos";

declare global {
  interface Window {
    odooLivechatReady?: Promise<void>;
    reloadOdooLivechat?: () => Promise<void>;
    resetOdooLivechatSession?: () => Promise<void>;
    __odooLivechatLoaded?: boolean;
    __odooLivechatLoadingPromise?: Promise<void>;
    __odooLivechatUserPos?: { top: number; left: number };
    __odooLivechatClosedApplied?: boolean;
  }
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function deleteCookieEverywhere(name: string) {
  const host = window.location.hostname;
  const base = `${name}=; Max-Age=0; path=/;`;
  document.cookie = base;
  document.cookie = `${base} domain=${host};`;
  document.cookie = `${base} domain=.${host};`;
}

function purgeLivechatStorage(debug: boolean) {
  const log = (...a: any[]) => debug && console.warn("[Livechat]", ...a);

  const keyMatches = (k: string) => {
    const kk = k.toLowerCase();
    return (
      kk.includes("livechat") ||
      kk.includes("im_livechat") ||
      kk.includes("odoo") ||
      kk.includes("mail.guest") ||
      kk.includes("mail_guest") ||
      kk.includes("guest") ||
      kk.includes("visitor") ||
      kk.includes("chatbot") ||
      kk.includes("discuss")
    );
  };

  try {
    const lsKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) lsKeys.push(k);
    }
    lsKeys.forEach((k) => {
      if (k === ZION_LIVECHAT_POS_LS_KEY) return;
      if (k === ZION_LIVECHAT_IDENTITY_LS_KEY) return;
      if (keyMatches(k)) {
        localStorage.removeItem(k);
        log("localStorage removido:", k);
      }
    });
  } catch {}

  try {
    const ssKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) ssKeys.push(k);
    }
    ssKeys.forEach((k) => {
      if (keyMatches(k)) {
        sessionStorage.removeItem(k);
        log("sessionStorage removido:", k);
      }
    });
  } catch {}

  try {
    const cookiePairs = (document.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    cookiePairs.forEach((pair) => {
      const eq = pair.indexOf("=");
      const name = (eq >= 0 ? pair.slice(0, eq) : pair).trim();
      const nn = name.toLowerCase();

      if (
        nn.includes("livechat") ||
        nn.includes("im_livechat") ||
        nn.includes("odoo") ||
        nn.includes("guest") ||
        nn.includes("visitor")
      ) {
        deleteCookieEverywhere(name);
        log("cookie removido:", name);
      }
    });
  } catch {}
}

export default function OdooLivechatLoader({
  enabled = true,
  bottomOffset = 160,
  rightOffset = 24,
  debug = false,
  onOpen,
  retryAttempts = 3,
  attemptTimeoutMs = 7000,
  retryBackoffMs = 800,
  identityKey,
}: Props) {
  useEffect(() => {
    const warn = (...a: any[]) => debug && console.warn("[Livechat]", ...a);
    const err = (...a: any[]) => debug && console.error("[Livechat]", ...a);

    const upsertStyle = (id: string, text: string) => {
      let el = document.getElementById(id) as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = id;
      }
      el.textContent = text;
      document.head.appendChild(el);
    };

    const setNodeTextContent = (node: unknown, text: string) => {
      if (!node) return;
      try {
        (node as any).textContent = text;
      } catch {}
    };

    let storedPosString: string | null = null;
    try {
      storedPosString = localStorage.getItem(ZION_LIVECHAT_POS_LS_KEY);
    } catch {
      storedPosString = null;
    }
    const storedPos = safeJsonParse<{ top: number; left: number }>(storedPosString);

    if (storedPos) {
      window.__odooLivechatUserPos = storedPos;
    }

    const cssBase = `
      ${SELECTORS} {
        position: fixed !important;
        bottom: ${bottomOffset}px !important;
        right: ${rightOffset}px !important;
        inset: auto ${rightOffset}px ${bottomOffset}px auto !important;
        z-index: 2147483647 !important;
        transform: none !important;
        pointer-events: auto !important;
      }
      div.o_livechat_button, button.o_livechat_button {
        cursor: pointer !important;
      }
    `.trim();

    upsertStyle(STYLE_TAG_ID, cssBase);

    let dragEl: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragEl) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newLeft = startLeft + dx;
      const newTop = startTop + dy;

      dragEl.style.left = `${newLeft}px`;
      dragEl.style.top = `${newTop}px`;
      dragEl.style.bottom = "auto";
      dragEl.style.right = "auto";
      dragEl.style.inset = "auto";
    };

    const onMouseUp = () => {
      if (!dragEl) return;
      const rect = dragEl.getBoundingClientRect();
      const pos = { top: rect.top, left: rect.left };

      window.__odooLivechatUserPos = pos;

      try {
        localStorage.setItem(ZION_LIVECHAT_POS_LS_KEY, JSON.stringify(pos));
      } catch {}

      dragEl.style.cursor = "";
      dragEl = null;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.currentTarget as HTMLElement | null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      dragEl = target;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      dragEl.style.position = "fixed";
      dragEl.style.left = `${rect.left}px`;
      dragEl.style.top = `${rect.top}px`;
      dragEl.style.bottom = "auto";
      dragEl.style.right = "auto";
      dragEl.style.inset = "auto";
      dragEl.style.cursor = "move";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    const makeDraggable = (el: HTMLElement) => {
      if (el.dataset.odooDraggableAttached === "1") return;
      el.dataset.odooDraggableAttached = "1";
      el.addEventListener("mousedown", onMouseDown as any);
    };

    const applyPositionToWidgets = () => {
      const nodes = document.querySelectorAll<HTMLElement>(SELECTORS);
      const userPos = window.__odooLivechatUserPos;

      nodes.forEach((el) => {
        try {
          el.style.setProperty("position", "fixed", "important");
          el.style.setProperty("z-index", "2147483647", "important");
          el.style.setProperty("pointer-events", "auto", "important");
          el.style.setProperty("opacity", "1", "important");
          el.style.setProperty("visibility", "visible", "important");

          if (userPos) {
            el.style.setProperty("top", `${userPos.top}px`, "important");
            el.style.setProperty("left", `${userPos.left}px`, "important");
            el.style.setProperty("bottom", "auto", "important");
            el.style.setProperty("right", "auto", "important");
            el.style.setProperty("inset", "auto", "important");
          } else {
            el.style.setProperty("bottom", `${bottomOffset}px`, "important");
            el.style.setProperty("right", `${rightOffset}px`, "important");
            el.style.setProperty(
              "inset",
              `auto ${rightOffset}px ${bottomOffset}px auto`,
              "important"
            );
            el.style.removeProperty("top");
            el.style.removeProperty("left");
          }

          makeDraggable(el);
        } catch (e) {
          warn("Falha ao aplicar estilo em nó do livechat:", e);
        }
      });
    };

    const applyClosedState = () => {
      if (window.__odooLivechatClosedApplied) return;

      const root =
        document.querySelector(
          ".o_thread_window, .o-livechat, .o_livechat_widget, .o-threadWindow, .o_threadWindow"
        ) || document.body;

      const messageContainers = root.querySelectorAll(
        ".o_mail_discuss, .o_ThreadView, .o_thread_window, .o-livechat, .o_livechat_widget, .o-threadWindow, .o_threadWindow"
      );

      let lastBubble: unknown = null;

      messageContainers.forEach((mc) => {
        const candidates = mc.querySelectorAll(
          ".o-discuss-message, .o-message, .o_livechat_message, .o_mail_message, .o-mail-Message, .o_ChatWindow_message"
        );

        const last = candidates.length ? candidates.item(candidates.length - 1) : null;
        if (last) lastBubble = last;
      });

      if (lastBubble) {
        setNodeTextContent(lastBubble, "Esta conversa no chat ao vivo foi encerrada.");
      }

      const input =
        (root.querySelector("textarea") as HTMLTextAreaElement | null) ||
        (root.querySelector('input[type="text"]') as HTMLInputElement | null);

      if (input) {
        input.value = "";
        input.disabled = true;
        input.readOnly = true;
        input.placeholder = "Conversa encerrada";
      }

      const sendBtn =
        (root.querySelector('button[type="submit"]') as HTMLButtonElement | null) ||
        (root.querySelector(
          ".o_livechat_button_send, .o-mail-Composer-send, .o_ChatWindow_send"
        ) as HTMLButtonElement | null);

      if (sendBtn) {
        sendBtn.disabled = true;
      }

      window.__odooLivechatClosedApplied = true;
    };

    const scanForClosedMarker = (root: ParentNode | null) => {
      if (!root) return;
      if (window.__odooLivechatClosedApplied) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let current: Node | null;

      while ((current = walker.nextNode())) {
        const value = current.nodeValue || "";
        if (value.includes(CLOSED_MARKER)) {
          applyClosedState();
          break;
        }
      }
    };

    const removeOldScripts = () => {
      document
        .querySelectorAll<HTMLScriptElement>(`script.${SCRIPT_TAG_CLASS}`)
        .forEach((s) => {
          try {
            s.parentElement?.removeChild(s);
          } catch {}
        });
    };

    const removeOdooDom = () => {
      document.querySelectorAll(SELECTORS).forEach((n) => {
        try {
          (n as HTMLElement).remove();
        } catch {}
      });
      window.__odooLivechatClosedApplied = false;
    };

    const loadScriptSequential = (src: string, timeoutMs = 10000) =>
      new Promise<void>((resolve, reject) => {
        const ts = Date.now();
        const s = document.createElement("script");
        s.className = SCRIPT_TAG_CLASS;
        s.async = true;
        s.type = "text/javascript";
        s.src = `${src}?v=${ts}`;

        const to = window.setTimeout(() => {
          err("Timeout carregando script:", s.src);
          cleanup();
          reject(new Error("timeout"));
        }, timeoutMs);

        const cleanup = () => {
          s.onload = null;
          s.onerror = null;
          window.clearTimeout(to);
        };

        s.onload = () => {
          cleanup();
          resolve();
        };

        s.onerror = () => {
          cleanup();
          reject(new Error("onerror"));
        };

        document.head.appendChild(s);
      });

    const loadAllScriptsSequential = async () => {
      removeOldScripts();
      removeOdooDom();
      for (const src of BASE_SCRIPTS) {
        await loadScriptSequential(src, attemptTimeoutMs || 15000);
      }
      window.__odooLivechatLoaded = true;
    };

    const ensureLoaded = async () => {
      if (window.__odooLivechatLoadingPromise) {
        await window.__odooLivechatLoadingPromise;
        applyPositionToWidgets();
        scanForClosedMarker(document.body);
        return;
      }

      window.__odooLivechatLoadingPromise = (async () => {
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
          try {
            await loadAllScriptsSequential();
            applyPositionToWidgets();
            scanForClosedMarker(document.body);
            return;
          } catch (e) {
            if (attempt < retryAttempts) {
              const delay = retryBackoffMs * attempt;
              await new Promise((r) => setTimeout(r, delay));
            } else {
              throw e;
            }
          }
        }
      })();

      await window.__odooLivechatLoadingPromise;
    };

    const hardResetSession = async () => {
      window.__odooLivechatLoaded = false;
      window.__odooLivechatLoadingPromise = undefined;
      window.__odooLivechatClosedApplied = false;

      try {
        purgeLivechatStorage(debug);
      } catch {}

      try {
        removeOdooDom();
      } catch {}
      try {
        removeOldScripts();
      } catch {}
    };

    window.reloadOdooLivechat = async () => {
      await hardResetSession();
      await ensureLoaded();
    };

    window.resetOdooLivechatSession = async () => {
      await hardResetSession();
    };

    const currentIdentity = (identityKey ?? "").trim();

    let previousIdentity = "";
    try {
      previousIdentity = (localStorage.getItem(ZION_LIVECHAT_IDENTITY_LS_KEY) || "").trim();
    } catch {}

    const identityChanged = currentIdentity !== previousIdentity;

    const shouldHardReset =
      (previousIdentity.length > 0 && currentIdentity.length === 0) || // logout
      (previousIdentity.length > 0 && currentIdentity.length > 0 && identityChanged) || // troca
      (previousIdentity.length === 0 && currentIdentity.length > 0); // login vindo de "anon"

    let observer: MutationObserver | undefined;

    (async () => {
      if (shouldHardReset) {
        warn("Resetando sessão do livechat por mudança de identidade/logout.", {
          previousIdentity,
          currentIdentity,
        });

        await hardResetSession();

        if (!currentIdentity) {
          try {
            localStorage.removeItem(ZION_LIVECHAT_IDENTITY_LS_KEY);
          } catch {}
        }
      }

      if (currentIdentity) {
        try {
          localStorage.setItem(ZION_LIVECHAT_IDENTITY_LS_KEY, currentIdentity);
        } catch {}
      }

      if (enabled) {
        upsertStyle(
          STYLE_HIDE_ID,
          `
            ${SELECTORS} {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              pointer-events: auto !important;
            }
          `.trim()
        );

        applyPositionToWidgets();
        scanForClosedMarker(document.body);

        window.odooLivechatReady = ensureLoaded().then(() => {
          applyPositionToWidgets();
          scanForClosedMarker(document.body);
          onOpen?.();
        });

        if (typeof MutationObserver !== "undefined") {
          observer = new MutationObserver((mutations) => {
            applyPositionToWidgets();
            for (const mut of mutations) {
              mut.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                  scanForClosedMarker((node as unknown as ParentNode) ?? null);
                }
              });
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      } else {
        upsertStyle(
          STYLE_HIDE_ID,
          `
            ${SELECTORS} {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `.trim()
        );

        try {
          removeOdooDom();
        } catch {}

        window.__odooLivechatLoaded = false;
        window.__odooLivechatLoadingPromise = undefined;
        window.__odooLivechatClosedApplied = false;
      }
    })();

    return () => {
      if (observer) observer.disconnect();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    enabled,
    bottomOffset,
    rightOffset,
    debug,
    onOpen,
    retryAttempts,
    attemptTimeoutMs,
    retryBackoffMs,
    identityKey,
  ]);

  return null;
}
