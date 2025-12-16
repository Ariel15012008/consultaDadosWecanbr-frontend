// src/utils/livechatApi.ts
import { z } from "zod";
import api from "@/utils/axiosInstance";

export const ChannelSchema = z.object({
  id: z.number(),
  name: z.string(),
  channel_type: z.string().nullable().optional(),
  public: z.string().nullable().optional(),
});
export type Channel = z.infer<typeof ChannelSchema>;

export const AttachmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  mimetype: z.string().nullable().optional(),
  url: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const MessageSchema = z.object({
  id: z.number(),
  date: z.string().nullable().optional(),
  author_id: z.array(z.union([z.number(), z.string()])).nullable().optional(),
  body: z.string().nullable().optional(),
  message_type: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  res_id: z.number().nullable().optional(),
  attachments: z.array(AttachmentSchema).optional().default([]),
});
export type Message = z.infer<typeof MessageSchema>;

export const SendMessageInSchema = z.object({
  channel_id: z.number().int().positive(),
  body: z.string().trim().min(1, "Mensagem vazia"),
});
export type SendMessageIn = z.infer<typeof SendMessageInSchema>;

export type Order = "id asc" | "id desc" | "date asc" | "date desc";

export const TicketInSchema = z.object({
  channel_id: z.number().int().positive(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});
export type TicketIn = z.infer<typeof TicketInSchema>;

export const TicketSchema = z
  .object({
    id: z.number().optional(),
    ticket_id: z.number().optional(),
    channel_id: z.number().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type Ticket = z.infer<typeof TicketSchema>;

export const TicketByChannelSchema = z.object({
  exists: z.boolean(),
  ticket_id: z.number().nullable().optional(),
});
export type TicketByChannel = z.infer<typeof TicketByChannelSchema>;

export const OpenSessionSchema = z.object({
  channel_id: z.number(),
  channel_name: z.string(),
  last_message_date: z.string().nullable().optional(),
});
export type OpenSession = z.infer<typeof OpenSessionSchema>;

export async function listChannels(limit = 50): Promise<Channel[]> {
  const { data } = await api.get(`/livechat/channels`, { params: { limit } });
  const parsed = z.array(ChannelSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/channels");
  }
  return parsed.data;
}

export async function listOpenSessions(limit = 50): Promise<OpenSession[]> {
  const { data } = await api.get(`/livechat/open-sessions`, {
    params: { limit },
  });
  const parsed = z.array(OpenSessionSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/open-sessions");
  }
  return parsed.data;
}

export async function getMessages(
  channel_id: number,
  limit = 100,
): Promise<Message[]> {
  const { data } = await api.get(`/livechat/messages`, {
    params: { channel_id, limit },
  });
  const parsed = z.array(MessageSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/messages");
  }
  return parsed.data;
}

export async function getMessageById(message_id: number): Promise<Message> {
  const { data } = await api.get(`/livechat/message/${message_id}`);
  const parsed = MessageSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/message/{id}");
  }
  return parsed.data;
}

export async function getMessagesSince(params: {
  channel_id: number;
  after_id: number;
  limit?: number;
  include_current?: boolean;
}): Promise<Message[]> {
  const { data } = await api.get(`/livechat/messages/since`, { params });
  const parsed = z.array(MessageSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/messages/since");
  }
  return parsed.data;
}

export async function getHistory(params: {
  channel_id: number;
  limit?: number;
  offset?: number;
  order?: Order;
  after_id?: number;
  before_id?: number;
  date_from?: string;
  date_to?: string;
}): Promise<Message[]> {
  const { data } = await api.get(`/livechat/history`, { params });
  const parsed = z.array(MessageSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/history");
  }
  return parsed.data;
}

export async function sendMessage(payload: SendMessageIn): Promise<number> {
  const valid = SendMessageInSchema.parse(payload);
  const { data } = await api.post(`/livechat/send`, valid);
  if (typeof data !== "number") {
    throw new Error("Resposta inválida de /livechat/send");
  }
  return data;
}

export async function sendMessageWithAttachment(params: {
  channel_id: number;
  file: File;
  body?: string;
}): Promise<number> {
  const formData = new FormData();
  formData.append("channel_id", String(params.channel_id));
  if (params.body && params.body.trim()) {
    formData.append("body", params.body.trim());
  }
  formData.append("file", params.file);

  const { data } = await api.post(`/livechat/send-attachment`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (typeof data !== "number") {
    throw new Error("Resposta inválida de /livechat/send-attachment");
  }
  return data;
}

export async function createTicket(payload: TicketIn): Promise<Ticket> {
  const valid = TicketInSchema.parse(payload);
  const { data } = await api.post(`/livechat/ticket`, valid);
  const parsed = TicketSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/ticket");
  }
  return parsed.data;
}

export async function getTicketByChannel(
  channel_id: number,
): Promise<TicketByChannel> {
  const { data } = await api.get(`/livechat/ticket/by-channel`, {
    params: { channel_id },
  });
  const parsed = TicketByChannelSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Resposta inválida de /livechat/ticket/by-channel");
  }
  return parsed.data;
}

export async function setPresenceOnline(): Promise<void> {
  await api.post("/livechat/presence/online");
}

export async function setPresenceOffline(): Promise<void> {
  await api.post("/livechat/presence/offline");
}

export async function closeLivechatChannel(channel_id: number): Promise<void> {
  await api.post("/livechat/close", null, { params: { channel_id } });
}
