"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MessageCircle, Send, ArrowLeft, Users, User, Phone, MoreVertical, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Chat = {
  id: string;
  wa_chatid: string;
  wa_contactName: string;
  wa_groupSubject?: string;
  wa_isGroup: boolean;
  wa_lastMsgTimestamp: number;
  wa_unreadCount: number;
  wa_lastMessageTextVote: string;
  wa_lastMessageSender: string;
  wa_lastMessageType: string;
  phone: string;
  image: string;
  imagePreview: string;
};

type Message = {
  id: string;
  messageid: string;
  text: string;
  fromMe: boolean;
  messageTimestamp: number;
  messageType: string;
  sender: string;
};

type Tab = "personal" | "groups";

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatMsgTime(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

export function ChatPageClient() {
  const [tab, setTab] = useState<Tab>("personal");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const type = tab === "groups" ? "&type=groups" : "";
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/whatsapp?action=chats&limit=100${type}${searchParam}`);
      const data = await res.json();
      setChats(data.chats ?? []);
    } catch {
      setChats([]);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Fetch messages
  useEffect(() => {
    if (!selectedChat) return;
    setLoadingMsgs(true);
    fetch(`/api/whatsapp?action=messages&chatid=${encodeURIComponent(selectedChat.wa_chatid)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        const msgs = (data.messages ?? []).map((m: Record<string, unknown>) => ({
          ...m,
          text: (m.text as string) || "",
        }));
        // Sort oldest first for display
        msgs.sort((a: Message, b: Message) => a.messageTimestamp - b.messageTimestamp);
        setMessages(msgs);
        setLoadingMsgs(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .catch(() => setLoadingMsgs(false));
  }, [selectedChat]);

  // Send message
  async function handleSend() {
    if (!newMsg.trim() || !selectedChat || sending) return;
    const text = newMsg.trim();
    setNewMsg("");
    setSending(true);

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      messageid: "",
      text,
      fromMe: true,
      messageTimestamp: Date.now(),
      messageType: "Conversation",
      sender: "",
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const phone = selectedChat.wa_chatid.split("@")[0];
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, text }),
      });
    } catch {
      // ignore
    }
    setSending(false);
  }

  const showMobileSidebar = !selectedChat;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-4 -my-4 md:-mx-6 md:-my-8">
      {/* ─── Sidebar ─── */}
      <div className={`${showMobileSidebar ? "flex" : "hidden"} md:flex w-full md:w-[340px] flex-shrink-0 border-r border-slate-200 bg-white flex-col`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Conversas</h2>
            <Button variant="ghost" size="sm" onClick={fetchChats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setTab("personal")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "personal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Contatos
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "groups" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Grupos
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs border-slate-200 rounded-lg bg-slate-50"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading && chats.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}
          {!loading && chats.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhuma conversa encontrada</p>
            </div>
          )}
          {chats.map((chat) => {
            const isSelected = selectedChat?.wa_chatid === chat.wa_chatid;
            const name = chat.wa_contactName || chat.wa_groupSubject || chat.phone || "Sem nome";
            const lastMsg = chat.wa_lastMessageTextVote || "";
            const time = formatTime(chat.wa_lastMsgTimestamp);
            const pic = chat.imagePreview || chat.image;

            return (
              <div
                key={chat.id || chat.wa_chatid}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 transition-colors ${
                  isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                }`}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-slate-200 flex items-center justify-center">
                  {pic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">{getInitials(name)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {lastMsg || (chat.wa_lastMessageType === "image" ? "Foto" : chat.wa_lastMessageType === "video" ? "Vídeo" : chat.wa_lastMessageType === "audio" || chat.wa_lastMessageType === "ptt" ? "Áudio" : "")}
                  </p>
                </div>

                {/* Unread badge */}
                {chat.wa_unreadCount > 0 && (
                  <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {chat.wa_unreadCount > 99 ? "99+" : chat.wa_unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Chat area ─── */}
      <div className={`${showMobileSidebar ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
              <button onClick={() => setSelectedChat(null)} className="md:hidden p-1">
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>

              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center flex-shrink-0">
                {(selectedChat.imagePreview || selectedChat.image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedChat.imagePreview || selectedChat.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-500">
                    {getInitials(selectedChat.wa_contactName || selectedChat.phone)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {selectedChat.wa_contactName || selectedChat.phone}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedChat.phone}
                </p>
              </div>

              <div className="flex gap-1">
                <a
                  href={`tel:${selectedChat.wa_chatid?.split("@")[0]}`}
                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <button className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
              style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0iI2UyZThmMCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjFmNWY5Ii8+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJ1cmwoI3ApIi8+PC9zdmc+')", backgroundSize: "60px 60px" }}
            >
              {loadingMsgs && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-slate-400 bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                    Nenhuma mensagem nos últimos 7 dias
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id || msg.messageid}
                  className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm ${
                      msg.fromMe
                        ? "bg-emerald-100 text-slate-900 rounded-tr-none"
                        : "bg-white text-slate-900 rounded-tl-none"
                    }`}
                  >
                    {msg.text ? (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        {msg.messageType === "image" ? "Foto" : msg.messageType === "video" ? "Vídeo" : msg.messageType === "audio" || msg.messageType === "ptt" ? "Áudio" : msg.messageType === "document" ? "Documento" : msg.messageType === "sticker" ? "Figurinha" : msg.messageType}
                      </p>
                    )}
                    <p className={`text-[10px] mt-0.5 text-right ${msg.fromMe ? "text-emerald-600" : "text-slate-400"}`}>
                      {formatMsgTime(msg.messageTimestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="flex-1 h-10 rounded-full bg-white border-slate-200"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={!newMsg.trim() || sending}
                  size="sm"
                  className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-emerald-300" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-600">LuxCRM Chat</p>
              <p className="text-sm text-slate-400 mt-1">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
