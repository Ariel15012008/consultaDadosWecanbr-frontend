// src/components/ChatConsole.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  listOpenSessions,
  getMessages,
  sendMessage,
  createTicket,
  setPresenceOnline,
  setPresenceOffline,
  sendMessageWithAttachment,
  getTicketByChannel,
  type Message,
  type OpenSession,
  type TicketByChannel,
} from "@/utils/livechatApi";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DEFAULT_CHANNEL =
  Number(import.meta.env.VITE_ODOO_CHANNEL_ID || 0) || undefined;

const API_ENV = (import.meta.env.VITE_API_ENVIRONMENT || "dev").toLowerCase();

const RAW_API_BASE_URL =
  API_ENV === "prod"
    ? import.meta.env.VITE_API_URL_PROD
    : import.meta.env.VITE_API_URL_DEV;

const API_BASE_URL = String(RAW_API_BASE_URL || "").replace(/\/$/, "");

// ===============================
// Helpers novos (DATA + EMAIL)
// ===============================
function formatOdooDate(raw?: string | null): string {
  if (!raw) return "";

  // Odoo costuma mandar "YYYY-MM-DD HH:mm:ss" (sem timezone)
  // Vamos assumir UTC para padronizar. Se seu backend já manda local, remova o "Z".
  const base = raw.includes("T") ? raw : raw.replace(" ", "T");
  const iso =
    /Z$|[+-]\d{2}:\d{2}$/.test(base) ? base : `${base}Z`;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;

  // Ajuste o timeZone se quiser forçar SP:
  // timeZone: "America/Sao_Paulo"
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // timeZone: "America/Sao_Paulo",
  }).format(d);
}

function extractEmailFromText(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0] ?? null;
}

function extractEmailFromEmailFrom(value?: string | null): string | null {
  if (!value) return null;
  // Pode vir "Nome <email@dominio.com>"
  const angle = value.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  return extractEmailFromText(value);
}

function htmlToPlainText(html?: string | null): string {
  if (!html) return "";
  const pre = html
    .replace(/<\/(p|div|li|h[1-6]|br)\s*>/gi, "</$1>\n")
    .replace(/<li[^>]*>/gi, "• ");
  const container = document.createElement("div");
  container.innerHTML = pre;
  const text = container.innerText;
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function sanitizeHtml(html?: string | null): string {
  if (!html) return "";
  const container = document.createElement("div");
  container.innerHTML = html;
  container
    .querySelectorAll("script, iframe, object, embed, link, style, img")
    .forEach((el) => el.remove());
  return container.innerHTML.trim();
}

function filterOdooBot(msgs: Message[]): Message[] {
  return msgs.filter((m) => {
    if (!Array.isArray(m.author_id)) return true;
    const [id, name] = m.author_id as any;
    const nameStr = String(name ?? "");
    return !(id === 1 || nameStr.toLowerCase().includes("odoobot"));
  });
}

// ===============================
// MessageBubble com autor melhorado
// ===============================
function MessageBubble({
  m,
  visitorFallback,
}: {
  m: Message;
  visitorFallback?: string | null;
}) {
  const rawBody = m.body ?? "";
  const plain = htmlToPlainText(rawBody);
  const safeHtml = sanitizeHtml(rawBody);
  const attachments = m.attachments ?? [];

  const hasPlainText = plain.length > 0;
  const hasAttachments = attachments.length > 0;

  const hasHtmlContent = hasPlainText && safeHtml.trim().length > 0;
  const hasAnyContent = hasHtmlContent || hasAttachments;

  if (!hasAnyContent) return null;

  // Autor:
  // 1) author_id (partner)
  // 2) email_from (quando existir)
  // 3) fallback coletado do próprio chat (email digitado)
  // 4) "Visitante"
  const authorFromAuthorId = Array.isArray((m as any).author_id)
    ? String((m as any).author_id?.[1] ?? "").trim()
    : "";

  const authorFromEmailFrom = extractEmailFromEmailFrom((m as any).email_from);

  const author =
    authorFromAuthorId ||
    authorFromEmailFrom ||
    (visitorFallback?.trim() || "") ||
    "Visitante";

  const dateLabel = formatOdooDate((m as any).date ?? null);

  const bubbleClasses = hasHtmlContent
    ? "px-3 py-2 rounded-xl bg-muted whitespace-pre-wrap break-words prose prose-sm max-w-none"
    : "px-3 py-1 rounded-xl bg-muted text-xs";

  return (
    <div className="mb-3">
      <div className="text-xs text-muted-foreground">
        {author} · {dateLabel}
      </div>

      <div className={bubbleClasses}>
        {hasHtmlContent && (
          <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
        )}

        {hasAttachments && (
          <div className={hasHtmlContent ? "mt-2 space-y-1" : "space-y-0.5"}>
            {attachments.map((att: any) => (
              <div key={`${m.id}-${att.id}`}>
                <a
                  href={`${API_BASE_URL}/livechat/attachment/${att.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-xs underline text-blue-600 hover:text-blue-800"
                >
                  {att.mimetype?.startsWith("image/")
                    ? `Baixar imagem (${att.name})`
                    : `Baixar arquivo (${att.name})`}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatConsole() {
  const [sessions, setSessions] = useState<OpenSession[]>([]);
  const [channelId, setChannelId] = useState<number | undefined>(DEFAULT_CHANNEL);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");

  const pollRef = useRef<number | null>(null);
  const sessionPollRef = useRef<number | null>(null);
  const ticketPollRef = useRef<number | null>(null);

  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState("");

  const [ticketStatus, setTicketStatus] = useState<TicketByChannel | null>(null);
  const [checkingTicket, setCheckingTicket] = useState(false);

  const sessionsInFlightRef = useRef(false);
  const ticketInFlightRef = useRef(false);

  const ticketReqSeqRef = useRef(0);

  const lastTicketExistsRef = useRef<boolean | null>(null);
  const closedToastShownForChannelRef = useRef<number | null>(null);

  // [NOVO] guarda email do visitante por canal (capturado do próprio chat)
  const visitorEmailByChannelRef = useRef<Record<number, string>>({});

  const isNearBottom = () => {
    const el = scrollParentRef.current;
    if (!el) return false;
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const scrollToBottom = () => {
    const el = scrollParentRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const selectedSession = useMemo(
    () => sessions.find((s) => s.channel_id === channelId) ?? null,
    [sessions, channelId],
  );

  type LoadSessionsOpts = { silent?: boolean };
  type RefreshTicketOpts = { silent?: boolean };

  const loadSessions = useCallback(
    async (opts: LoadSessionsOpts = {}) => {
      if (sessionsInFlightRef.current) return [];
      sessionsInFlightRef.current = true;

      const silent = !!opts.silent;
      if (!silent) setLoadingSessions(true);

      try {
        const rows = await listOpenSessions(200);
        setSessions(rows);

        if (!rows.length) {
          setChannelId(undefined);
          setMessages([]);
          return rows;
        }

        if (channelId && rows.some((s) => s.channel_id === channelId)) {
          return rows;
        }

        const fromEnv =
          DEFAULT_CHANNEL &&
          rows.find((s) => s.channel_id === DEFAULT_CHANNEL)?.channel_id;

        const selected = fromEnv ?? rows[0].channel_id;
        setChannelId(selected);
        return rows;
      } catch (e) {
        console.error(e);
        if (!silent) toast.error("Erro ao carregar canais abertos");
        return [];
      } finally {
        if (!silent) setLoadingSessions(false);
        sessionsInFlightRef.current = false;
      }
    },
    [channelId],
  );

  const refreshTicketStatus = useCallback(
    async (opts: RefreshTicketOpts = {}) => {
      if (!channelId) {
        setTicketStatus(null);
        return;
      }

      if (ticketInFlightRef.current) return;
      ticketInFlightRef.current = true;

      const reqSeq = ++ticketReqSeqRef.current;

      const silent = !!opts.silent;
      if (!silent) setCheckingTicket(true);

      try {
        const status = await getTicketByChannel(channelId);

        if (reqSeq !== ticketReqSeqRef.current) return;

        const prevExists = lastTicketExistsRef.current;
        const alreadyShown = closedToastShownForChannelRef.current === channelId;

        setTicketStatus(status);
        lastTicketExistsRef.current = status.exists;

        if (
          status.exists &&
          !alreadyShown &&
          (prevExists === false || prevExists === null)
        ) {
          toast.message(
            status.ticket_id
              ? `Conversa encerrada: atendimento segue pelo chamado #${status.ticket_id}.`
              : "Conversa encerrada: atendimento seguirá pelo chamado criado.",
            { duration: 6000 },
          );
          closedToastShownForChannelRef.current = channelId;
        }

        if (status.exists) {
          if (dialogOpen) setDialogOpen(false);
          await loadSessions({ silent: true });
        }
      } catch (e) {
        console.error(e);
        if (!silent) toast.error("Erro ao verificar ticket do canal");
      } finally {
        if (!silent) setCheckingTicket(false);
        ticketInFlightRef.current = false;
      }
    },
    [channelId, loadSessions, dialogOpen],
  );

  useEffect(() => {
    const goOnline = async () => {
      try {
        await setPresenceOnline();
      } catch (e) {
        console.error(e);
      }
    };

    const goOffline = async () => {
      try {
        await setPresenceOffline();
      } catch (e) {
        console.error(e);
      }
    };

    void goOnline();

    const handleBeforeUnload = () => {
      void setPresenceOffline().catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void goOffline();
    };
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    ticketReqSeqRef.current += 1;
    setTicketStatus(null);
    setCheckingTicket(false);
    lastTicketExistsRef.current = null;
    setDialogOpen(false);
  }, [channelId]);

  useEffect(() => {
    if (sessionPollRef.current) window.clearInterval(sessionPollRef.current);

    sessionPollRef.current = window.setInterval(() => {
      void loadSessions({ silent: true });
    }, 120_000);

    return () => {
      if (sessionPollRef.current) {
        window.clearInterval(sessionPollRef.current);
        sessionPollRef.current = null;
      }
    };
  }, [loadSessions]);

  useEffect(() => {
    if (!channelId) {
      setTicketStatus(null);
      if (ticketPollRef.current) {
        window.clearInterval(ticketPollRef.current);
        ticketPollRef.current = null;
      }
      return;
    }

    void refreshTicketStatus({ silent: true });

    if (ticketPollRef.current) window.clearInterval(ticketPollRef.current);
    ticketPollRef.current = window.setInterval(() => {
      void refreshTicketStatus({ silent: true });
    }, 120_000);

    return () => {
      if (ticketPollRef.current) {
        window.clearInterval(ticketPollRef.current);
        ticketPollRef.current = null;
      }
    };
  }, [channelId, refreshTicketStatus]);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const updateVisitorEmailFallback = (rows: Message[]) => {
      // procura email digitado em qualquer mensagem
      for (const m of rows) {
        const plain = htmlToPlainText(m.body ?? "");
        const email = extractEmailFromText(plain);
        if (email) {
          visitorEmailByChannelRef.current[channelId] = email;
          return;
        }
      }
    };

    const loadAllMessages = async (stickToBottom: boolean) => {
      try {
        let rows = await getMessages(channelId, 200);
        rows = filterOdooBot(rows);
        if (cancelled) return;

        updateVisitorEmailFallback(rows);
        setMessages(rows);

        if (stickToBottom) setTimeout(scrollToBottom, 0);
      } catch (e) {
        console.error(e);
      }
    };

    const initialLoad = async () => {
      setLoadingMessages(true);
      try {
        await loadAllMessages(true);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    const startPolling = () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          if (!channelId) return;
          const shouldStick = isNearBottom();
          await loadAllMessages(shouldStick);
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    };

    void (async () => {
      await initialLoad();
      if (!cancelled) startPolling();
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [channelId]);

  const handleSend = async () => {
    if (!channelId || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage({ channel_id: channelId, body: text.trim() });
      setText("");

      const shouldStick = isNearBottom();
      let rows = await getMessages(channelId, 200);
      rows = filterOdooBot(rows);

      // atualiza fallback do visitante
      for (const m of rows) {
        const email = extractEmailFromText(htmlToPlainText(m.body ?? ""));
        if (email) {
          visitorEmailByChannelRef.current[channelId] = email;
          break;
        }
      }

      setMessages(rows);
      if (shouldStick) setTimeout(scrollToBottom, 0);
    } catch (e: any) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      toast.error(detail || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleFileButtonClick = () => {
    if (!channelId || uploading || sending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!channelId) {
      toast.error("Selecione um canal primeiro");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      await sendMessageWithAttachment({
        channel_id: channelId,
        file,
        body: text.trim() || undefined,
      });

      setText("");
      e.target.value = "";

      const shouldStick = isNearBottom();
      let rows = await getMessages(channelId, 200);
      rows = filterOdooBot(rows);

      for (const m of rows) {
        const email = extractEmailFromText(htmlToPlainText(m.body ?? ""));
        if (email) {
          visitorEmailByChannelRef.current[channelId] = email;
          break;
        }
      }

      setMessages(rows);
      if (shouldStick) setTimeout(scrollToBottom, 0);
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail;
      toast.error(detail || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!channelId) {
      toast.error("Selecione um canal primeiro");
      return;
    }

    if (ticketStatus?.exists) {
      toast.error(
        ticketStatus.ticket_id
          ? `Já existe ticket para este canal (ID ${ticketStatus.ticket_id}).`
          : "Já existe ticket para este canal.",
      );
      return;
    }

    const title = dialogTitle.trim();
    if (!title) {
      toast.error("Informe um título para o chamado");
      return;
    }

    const lines = messages.map((m) => {
      const author = Array.isArray((m as any).author_id)
        ? String((m as any).author_id[1] ?? "Visitante")
        : (visitorEmailByChannelRef.current[channelId] || "Visitante");

      const body = htmlToPlainText(m.body);
      return `${author}: ${body}`;
    });

    const compactLines = lines.filter((line) => line.trim().length > 0);

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const descriptionHtml = compactLines.length
      ? compactLines.map((line) => escapeHtml(line)).join("<br/>")
      : escapeHtml("Sem descrição");

    const extraInfo = selectedSession
      ? `<br/><br/>Canal: #${selectedSession.channel_id} (${escapeHtml(
          selectedSession.channel_name,
        )})`
      : `<br/><br/>Canal: #${channelId}`;

    try {
      setCreatingTicket(true);

      const ticket = await createTicket({
        channel_id: channelId,
        title,
        description: descriptionHtml + extraInfo,
      });

      const ticketId = (ticket as any)?.ticket_id ?? (ticket as any)?.id;
      toast.success(
        ticketId ? `Ticket criado (ID ${ticketId})` : "Ticket criado com sucesso",
      );

      setDialogOpen(false);
      setDialogTitle("");

      await loadSessions({ silent: true });
      await refreshTicketStatus({ silent: true });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      if (!channelId) {
        toast.error("Selecione um canal primeiro");
        return;
      }
      if (ticketStatus?.exists) {
        toast.error(
          ticketStatus.ticket_id
            ? `Este canal já tem ticket (ID ${ticketStatus.ticket_id}).`
            : "Este canal já tem ticket.",
        );
        return;
      }
      const session = selectedSession;
      const defaultTitle = session?.channel_name
        ? `Atendimento - ${session.channel_name}`
        : `Chamado canal #${channelId}`;
      setDialogTitle(defaultTitle);
      setDialogOpen(true);
    } else {
      if (!creatingTicket) setDialogOpen(false);
    }
  };

  const disableCreateTicket =
    !channelId || creatingTicket || checkingTicket || !!ticketStatus?.exists;

  const visitorFallback =
    channelId ? visitorEmailByChannelRef.current[channelId] : null;

  return (
    <div
      className="
        container mx-auto
        max-w-screen-xl
        pl-[max(env(safe-area-inset-left),1rem)]
        pr-[max(env(safe-area-inset-right),1rem)]
        sm:px-6 md:px-8
      "
    >
      <Card className="w-full max-w-5xl mx-auto md:mt-6 mt-2 rounded-xl">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg">
            Console do Chat (Odoo)
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 md:space-y-4">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="w-full sm:w-80">
              <Select
                value={channelId ? String(channelId) : ""}
                onValueChange={(v) => setChannelId(Number(v))}
                disabled={!sessions.length || loadingSessions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.channel_id} value={String(s.channel_id)}>
                      #{s.channel_id} · {s.channel_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void loadSessions({ silent: false })}
              disabled={loadingSessions}
            >
              Recarregar canais
            </Button>

            <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <AlertDialogTrigger asChild>
                <Button className="w-full sm:w-auto" disabled={disableCreateTicket}>
                  {ticketStatus?.exists ? "Chamado já criado" : "Criar chamado"}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Novo chamado</AlertDialogTitle>
                  <AlertDialogDescription>
                    Informe o título que deseja usar para o chamado deste atendimento.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-2">
                  <Input
                    autoFocus
                    placeholder="Título do chamado"
                    value={dialogTitle}
                    onChange={(e) => setDialogTitle(e.target.value)}
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={creatingTicket}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={creatingTicket}
                    onClick={(e: { preventDefault: () => void }) => {
                      e.preventDefault();
                      void handleCreateTicket();
                    }}
                  >
                    {creatingTicket ? "Criando..." : "Confirmar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator className="my-2 md:my-3" />

          <div className="border rounded-md h-[56vh] md:h-[520px] min-h-[300px]">
            <ScrollArea className="h-full p-3" ref={scrollParentRef as any}>
              {loadingMessages && (
                <div className="text-sm text-muted-foreground">
                  Carregando mensagens…
                </div>
              )}

              {!loadingMessages && !messages.length && (
                <div className="text-sm text-muted-foreground">
                  {channelId ? "Sem mensagens." : "Nenhum canal aberto disponível."}
                </div>
              )}

              {!loadingMessages &&
                messages.map((m, idx) => (
                  <MessageBubble
                    key={`${m.id}-${(m as any).date ?? ""}-${idx}`}
                    m={m}
                    visitorFallback={visitorFallback}
                  />
                ))}
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="gap-2 flex flex-col sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          <Input
            placeholder="Digite sua mensagem…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full"
            disabled={!channelId}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleFileButtonClick}
            disabled={!channelId || uploading || sending}
            className="w-full sm:w-auto"
          >
            {uploading ? "Enviando arquivo..." : "Anexar arquivo"}
          </Button>

          <Button
            onClick={() => void handleSend()}
            disabled={sending || uploading || !text.trim() || !channelId}
            className="w-full sm:w-auto"
          >
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
