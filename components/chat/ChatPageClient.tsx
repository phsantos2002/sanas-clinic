"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, MessageCircle, Send, ArrowLeft, Users, User, Phone, RefreshCw,
  PanelRightOpen, PanelRightClose, Image, Paperclip, Mic, X, Check, CheckCheck,
  Reply, Download, Smile, FileText, MapPin, Video, Archive, Pin, Trash2,
  Forward, Edit3, MoreVertical, ChevronDown, Star, Bell, BellOff,
  Copy, ArrowDown, Filter, Hash, Link2, Shield, UserPlus, UserMinus,
  Volume2, VolumeX, Eye, EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LeadContextPanel } from "@/components/chat/LeadContextPanel";
import { SuggestedReplies } from "@/components/chat/SuggestedReplies";
import { AIStatusBadge } from "@/components/chat/AIStatusBadge";
import { toast } from "sonner";

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
  wa_pinned?: boolean;
  wa_archived?: boolean;
  wa_muted?: boolean;
};

type Message = {
  id: string;
  messageid: string;
  text: string;
  fromMe: boolean;
  messageTimestamp: number;
  messageType: string;
  sender: string;
  senderName?: string;
  quotedMsg?: { text?: string; sender?: string; messageType?: string };
  mediaUrl?: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
  lat?: number;
  lng?: number;
  ack?: number;
  isStarred?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: { emoji: string; sender: string }[];
};

type Tab = "personal" | "groups" | "archived";

const POLL_INTERVAL = 5000; // 5s auto-refresh for new messages
const CHAT_POLL_INTERVAL = 15000; // 15s auto-refresh for chat list
const MSG_PAGE_SIZE = 100;
const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatMsgTime(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function shouldShowDateSeparator(msgs: Message[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(msgs[index].messageTimestamp);
  const prev = new Date(msgs[index - 1].messageTimestamp);
  return curr.toDateString() !== prev.toDateString();
}

// ACK icons
function AckIcon({ ack }: { ack?: number }) {
  if (ack === undefined || ack === null) return null;
  if (ack >= 3) return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (ack >= 2) return <CheckCheck className="h-3 w-3 text-slate-400" />;
  if (ack >= 1) return <Check className="h-3 w-3 text-slate-400" />;
  return <Check className="h-3 w-3 text-slate-300" />;
}

function MediaPreview({ msg }: { msg: Message }) {
  const t = msg.messageType;
  if (t === "image" && msg.mediaUrl) {
    return (
      <div className="mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={msg.mediaUrl} alt="" className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" onClick={() => window.open(msg.mediaUrl, "_blank")} />
        {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
      </div>
    );
  }
  if (t === "video" && msg.mediaUrl) {
    return (
      <div className="mb-1">
        <video src={msg.mediaUrl} controls className="max-w-[240px] rounded-lg" />
        {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
      </div>
    );
  }
  if ((t === "audio" || t === "ptt") && msg.mediaUrl) {
    return <audio src={msg.mediaUrl} controls className="max-w-[240px]" />;
  }
  if (t === "document") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/40 rounded-lg">
        <FileText className="h-5 w-5 text-slate-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{msg.fileName || "Documento"}</p>
        </div>
        {msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </a>
        )}
      </div>
    );
  }
  if (t === "sticker" && msg.mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={msg.mediaUrl} alt="sticker" className="w-24 h-24" />;
  }
  if (t === "location" && msg.lat && msg.lng) {
    return (
      <a
        href={`https://maps.google.com/?q=${msg.lat},${msg.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 bg-white/40 rounded-lg hover:bg-white/60 transition-colors"
      >
        <MapPin className="h-5 w-5 text-red-500" />
        <span className="text-xs">Ver localizacao</span>
      </a>
    );
  }
  return null;
}

// Chat context menu actions
function apiPost(action: string, body: Record<string, unknown>) {
  return fetch(`/api/whatsapp?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ChatPageClient() {
  const [tab, setTab] = useState<Tab>("personal");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"all" | "unread">("all");
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgOffset, setMsgOffset] = useState(0);
  const [msgTotal, setMsgTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageid for reaction picker
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null); // chatid for context menu
  const [showMsgMenu, setShowMsgMenu] = useState<string | null>(null); // messageid for msg context menu
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<string>("");
  const lastMsgTsRef = useRef<number>(0);

  // Check connection status
  useEffect(() => {
    fetch("/api/whatsapp?action=status")
      .then(r => r.json())
      .then(d => {
        const inst = d.instance ?? d;
        setConnectionStatus(inst?.status === "connected" ? "connected" : "disconnected");
      })
      .catch(() => setConnectionStatus("disconnected"));
  }, []);

  // Fetch chats
  const fetchChats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const type = tab === "groups" ? "&type=groups" : "";
      const archiveParam = tab === "archived" ? "&archived=true" : "";
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const unreadParam = chatFilter === "unread" ? "&unread=true" : "";
      const res = await fetch(`/api/whatsapp?action=chats&limit=200${type}${archiveParam}${searchParam}${unreadParam}`);
      const data = await res.json();
      setChats(data.chats ?? []);
    } catch {
      if (!silent) setChats([]);
    }
    if (!silent) setLoading(false);
  }, [tab, search, chatFilter]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // Auto-refresh chat list
  useEffect(() => {
    const interval = setInterval(() => fetchChats(true), CHAT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Fetch messages
  const fetchMessages = useCallback(async (chatId: string, offset = 0, append = false) => {
    if (!append) setLoadingMsgs(true);
    else setLoadingMore(true);

    try {
      const searchParam = msgSearch ? `&search=${encodeURIComponent(msgSearch)}` : "";
      const res = await fetch(`/api/whatsapp?action=messages&chatid=${encodeURIComponent(chatId)}&limit=${MSG_PAGE_SIZE}&offset=${offset}${searchParam}`);
      const data = await res.json();
      const msgs = (data.messages ?? []).map((m: Record<string, unknown>) => ({
        ...m,
        text: (m.text as string) || (m.caption as string) || "",
      }));
      msgs.sort((a: Message, b: Message) => a.messageTimestamp - b.messageTimestamp);

      if (append) {
        setMessages((prev) => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        // Track last message timestamp for polling
        if (msgs.length > 0) {
          lastMsgTsRef.current = msgs[msgs.length - 1].messageTimestamp;
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
      setMsgTotal(data.total ?? msgs.length);
      setMsgOffset(offset + msgs.length);
    } catch { /* ignore */ }

    setLoadingMsgs(false);
    setLoadingMore(false);
  }, [msgSearch]);

  // Poll for new messages in selected chat
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(async () => {
      if (!lastMsgTsRef.current) return;
      try {
        const res = await fetch(`/api/whatsapp?action=messages&chatid=${encodeURIComponent(selectedChat.wa_chatid)}&limit=50&afterTs=${lastMsgTsRef.current}`);
        const data = await res.json();
        const newMsgs = (data.messages ?? []).map((m: Record<string, unknown>) => ({
          ...m,
          text: (m.text as string) || (m.caption as string) || "",
        }));
        if (newMsgs.length > 0) {
          newMsgs.sort((a: Message, b: Message) => a.messageTimestamp - b.messageTimestamp);
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.messageid || m.id));
            const truly = newMsgs.filter((m: Message) => !existingIds.has(m.messageid) && !existingIds.has(m.id));
            if (truly.length === 0) return prev;
            lastMsgTsRef.current = truly[truly.length - 1].messageTimestamp;

            // Check if scrolled to bottom
            const container = messagesContainerRef.current;
            const isAtBottom = container && (container.scrollHeight - container.scrollTop - container.clientHeight < 100);

            if (isAtBottom) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            } else {
              setUnreadBelowCount(c => c + truly.length);
              setShowScrollDown(true);
            }

            return [...prev, ...truly];
          });
          setMsgTotal(t => t + newMsgs.length);
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;
    setMsgOffset(0);
    setUnreadBelowCount(0);
    setShowScrollDown(false);
    lastMsgTsRef.current = 0;
    fetchMessages(selectedChat.wa_chatid);
    // Mark as read
    apiPost("mark-read", { chatid: selectedChat.wa_chatid }).catch(() => {});
  }, [selectedChat, fetchMessages]);

  // Infinite scroll: load more when scrolling to top
  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Show/hide scroll-to-bottom button
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      setShowScrollDown(false);
      setUnreadBelowCount(0);
    } else if (messages.length > 20) {
      setShowScrollDown(true);
    }

    // Auto-load more when near top
    if (container.scrollTop < 100 && !loadingMore && msgOffset < msgTotal && selectedChat) {
      const prevHeight = container.scrollHeight;
      fetchMessages(selectedChat.wa_chatid, msgOffset, true).then(() => {
        // Maintain scroll position after prepending
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        });
      });
    }
  }, [loadingMore, msgOffset, msgTotal, selectedChat, fetchMessages, messages.length]);

  // Load more (manual button fallback)
  const loadMore = () => {
    if (!selectedChat || loadingMore || msgOffset >= msgTotal) return;
    fetchMessages(selectedChat.wa_chatid, msgOffset, true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollDown(false);
    setUnreadBelowCount(0);
  };

  // Pinned chats at top
  const { pinnedChats, regularChats } = useMemo(() => {
    const pinned = chats.filter(c => c.wa_pinned);
    const regular = chats.filter(c => !c.wa_pinned);
    return { pinnedChats: pinned, regularChats: regular };
  }, [chats]);

  // Send message
  async function handleSend() {
    if (!newMsg.trim() || !selectedChat || sending) return;
    const text = newMsg.trim();
    setNewMsg("");
    setReplyTo(null);
    setSending(true);

    // Show typing indicator
    apiPost("typing", { chatid: selectedChat.wa_chatid, typing: true }).catch(() => {});

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      messageid: "",
      text,
      fromMe: true,
      messageTimestamp: Date.now(),
      messageType: "Conversation",
      sender: "",
      ack: 0,
      quotedMsg: replyTo ? { text: replyTo.text, sender: replyTo.sender } : undefined,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const phone = selectedChat.wa_chatid.split("@")[0];
      const payload: Record<string, unknown> = { number: phone, text };
      if (replyTo?.messageid) payload.quotedMsgId = replyTo.messageid;

      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* ignore */ }

    // Stop typing
    apiPost("typing", { chatid: selectedChat.wa_chatid, typing: false }).catch(() => {});
    setSending(false);
  }

  // Edit message
  async function handleEdit() {
    if (!editingMsg || !editText.trim() || !selectedChat) return;
    try {
      await apiPost("edit-msg", {
        chatid: selectedChat.wa_chatid,
        messageid: editingMsg.messageid,
        text: editText.trim(),
      });
      setMessages(prev => prev.map(m =>
        m.messageid === editingMsg.messageid ? { ...m, text: editText.trim(), isEdited: true } : m
      ));
      toast.success("Mensagem editada");
    } catch {
      toast.error("Erro ao editar");
    }
    setEditingMsg(null);
    setEditText("");
  }

  // Delete message
  async function handleDeleteMsg(msg: Message, forEveryone: boolean) {
    if (!selectedChat) return;
    try {
      await apiPost("delete-msg", {
        chatid: selectedChat.wa_chatid,
        messageid: msg.messageid,
        forEveryone,
      });
      setMessages(prev => prev.filter(m => m.messageid !== msg.messageid));
      toast.success("Mensagem apagada");
    } catch {
      toast.error("Erro ao apagar");
    }
    setShowMsgMenu(null);
  }

  // Forward message
  async function handleForward(chat: Chat) {
    if (!forwardingMsg || !selectedChat) return;
    try {
      await apiPost("forward-msg", {
        chatid: selectedChat.wa_chatid,
        messageid: forwardingMsg.messageid,
        toNumber: chat.wa_chatid.split("@")[0],
      });
      toast.success(`Encaminhada para ${chat.wa_contactName || chat.phone}`);
    } catch {
      toast.error("Erro ao encaminhar");
    }
    setForwardingMsg(null);
    setForwardSearch("");
  }

  // Copy message
  function handleCopyMsg(msg: Message) {
    navigator.clipboard.writeText(msg.text || "");
    toast.success("Copiado!");
    setShowMsgMenu(null);
  }

  // Chat actions
  async function handlePinChat(chat: Chat) {
    await apiPost("pin-chat", { chatid: chat.wa_chatid, pin: !chat.wa_pinned });
    toast.success(chat.wa_pinned ? "Desafixado" : "Fixado");
    fetchChats(true);
    setShowChatMenu(null);
  }

  async function handleArchiveChat(chat: Chat) {
    await apiPost("archive-chat", { chatid: chat.wa_chatid, archive: !chat.wa_archived });
    toast.success(chat.wa_archived ? "Desarquivado" : "Arquivado");
    fetchChats(true);
    setShowChatMenu(null);
  }

  async function handleMuteChat(chat: Chat) {
    await apiPost("mute-chat", { chatid: chat.wa_chatid, mute: !chat.wa_muted });
    toast.success(chat.wa_muted ? "Notificacoes ativadas" : "Silenciado");
    fetchChats(true);
    setShowChatMenu(null);
  }

  // Send file
  async function handleFileSend(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadData.url) throw new Error("Upload failed");

      const phone = selectedChat.wa_chatid.split("@")[0];
      let type = fileType || "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (file.type.startsWith("audio/")) type = "audio";

      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: phone,
          type,
          file: uploadData.url,
          fileName: file.name,
        }),
      });

      toast.success("Arquivo enviado");
      setTimeout(() => fetchMessages(selectedChat.wa_chatid), 1000);
    } catch {
      toast.error("Erro ao enviar arquivo");
    }
    setSending(false);
    setShowAttachMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const showMobileSidebar = !selectedChat;

  // Filtered chats for forward modal
  const forwardChats = useMemo(() => {
    if (!forwardingMsg) return [];
    return chats.filter(c => {
      if (!forwardSearch) return true;
      const name = c.wa_contactName || c.wa_groupSubject || c.phone || "";
      return name.toLowerCase().includes(forwardSearch.toLowerCase());
    });
  }, [chats, forwardingMsg, forwardSearch]);

  // New conversation state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState("");

  const handleStartNewChat = () => {
    const cleaned = newChatNumber.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Numero invalido. Use DDD + numero (ex: 11999998888)");
      return;
    }
    const number = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    const fakeChat: Chat = {
      id: `new-${number}`,
      wa_chatid: `${number}@s.whatsapp.net`,
      wa_contactName: "",
      wa_isGroup: false,
      wa_lastMsgTimestamp: Date.now(),
      wa_unreadCount: 0,
      wa_lastMessageTextVote: "",
      wa_lastMessageSender: "",
      wa_lastMessageType: "",
      phone: number,
      image: "",
      imagePreview: "",
    };
    setSelectedChat(fakeChat);
    setShowNewChat(false);
    setNewChatNumber("");
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] -mx-4 md:-mx-6 overflow-hidden rounded-xl border border-slate-200">
      {/* ─── Sidebar ─── */}
      <div className={`${showMobileSidebar ? "flex" : "hidden"} md:flex w-full md:w-[340px] flex-shrink-0 border-r border-slate-200 bg-white flex-col overflow-hidden`}>
        <div className="px-4 py-3 border-b border-slate-100 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Conversas</h2>
              <span className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-emerald-500" : connectionStatus === "disconnected" ? "bg-red-500" : "bg-amber-500"}`} title={connectionStatus === "connected" ? "Conectado" : "Desconectado"} />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className={`p-1.5 rounded-lg transition-colors ${showNewChat ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                title="Nova conversa"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setChatFilter(f => f === "all" ? "unread" : "all")}
                className={`p-1.5 rounded-lg transition-colors ${chatFilter === "unread" ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                title={chatFilter === "unread" ? "Mostrando nao lidas" : "Filtrar nao lidas"}
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
              <Button variant="ghost" size="sm" onClick={() => fetchChats()} disabled={loading} className="h-8 w-8 p-0">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* New Chat Input */}
          {showNewChat && (
            <div className="flex gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
              <input
                type="text"
                value={newChatNumber}
                onChange={(e) => setNewChatNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartNewChat()}
                placeholder="DDD + numero (ex: 11999998888)"
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={handleStartNewChat}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Iniciar
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setTab("personal")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "personal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <User className="h-3.5 w-3.5" /> Contatos
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "groups" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Grupos
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "archived" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Archive className="h-3.5 w-3.5" /> Arquivo
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
              <p className="text-sm text-slate-400">
                {tab === "archived" ? "Nenhuma conversa arquivada" : "Nenhuma conversa encontrada"}
              </p>
            </div>
          )}

          {/* Pinned section */}
          {pinnedChats.length > 0 && tab !== "archived" && (
            <>
              <div className="px-4 py-1.5 bg-slate-50 flex items-center gap-1">
                <Pin className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400 uppercase">Fixadas</span>
              </div>
              {pinnedChats.map((chat) => (
                <ChatItem
                  key={chat.id || chat.wa_chatid}
                  chat={chat}
                  isSelected={selectedChat?.wa_chatid === chat.wa_chatid}
                  onSelect={setSelectedChat}
                  onMenuToggle={setShowChatMenu}
                  showMenu={showChatMenu === chat.wa_chatid}
                  onPin={handlePinChat}
                  onArchive={handleArchiveChat}
                  onMute={handleMuteChat}
                />
              ))}
              {regularChats.length > 0 && (
                <div className="px-4 py-1.5 bg-slate-50">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Todas</span>
                </div>
              )}
            </>
          )}

          {/* Regular chats */}
          {regularChats.map((chat) => (
            <ChatItem
              key={chat.id || chat.wa_chatid}
              chat={chat}
              isSelected={selectedChat?.wa_chatid === chat.wa_chatid}
              onSelect={setSelectedChat}
              onMenuToggle={setShowChatMenu}
              showMenu={showChatMenu === chat.wa_chatid}
              onPin={handlePinChat}
              onArchive={handleArchiveChat}
              onMute={handleMuteChat}
            />
          ))}
        </div>
      </div>

      {/* ─── Chat area ─── */}
      <div className={`${showMobileSidebar ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden min-w-0`}>
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
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
                  {selectedChat.wa_contactName || selectedChat.wa_groupSubject || selectedChat.phone}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  {selectedChat.wa_chatid?.split("@")[0]}
                  {selectedChat.wa_isGroup && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-[9px]">Grupo</span>
                  )}
                  {msgTotal > 0 && (
                    <span className="ml-1 text-slate-300">{msgTotal} msgs</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                <AIStatusBadge aiEnabled={true} />
                <button
                  onClick={() => setShowMsgSearch(!showMsgSearch)}
                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                  title="Buscar mensagens"
                >
                  <Search className="h-4 w-4" />
                </button>
                <a
                  href={`tel:${selectedChat.wa_chatid?.split("@")[0]}`}
                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                  title="Ligar"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setShowPanel(!showPanel)}
                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors hidden lg:block"
                  title="Painel lateral"
                >
                  {showPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Message search bar */}
            {showMsgSearch && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && selectedChat && fetchMessages(selectedChat.wa_chatid)}
                  placeholder="Buscar nesta conversa..."
                  className="flex-1 text-sm outline-none"
                  autoFocus
                />
                <button onClick={() => { setShowMsgSearch(false); setMsgSearch(""); if (selectedChat) fetchMessages(selectedChat.wa_chatid); }} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative"
              style={{
                backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0iI2UyZThmMCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjFmNWY5Ii8+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJ1cmwoI3ApIi8+PC9zdmc+')",
                backgroundSize: "60px 60px",
              }}
            >
              {/* Load more button */}
              <div ref={messagesTopRef} />
              {msgOffset < msgTotal && !loadingMsgs && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-4 py-1.5 bg-white rounded-full text-xs text-slate-500 hover:bg-slate-50 shadow-sm border border-slate-200"
                  >
                    {loadingMore ? "Carregando..." : `Carregar anteriores (${msgTotal - msgOffset} restantes)`}
                  </button>
                </div>
              )}

              {loadingMsgs && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-slate-400 bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                    Nenhuma mensagem encontrada
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={msg.id || msg.messageid}>
                  {/* Date separator */}
                  {shouldShowDateSeparator(messages, idx) && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 bg-white/90 rounded-lg shadow-sm text-[11px] font-medium text-slate-500">
                        {formatDateSeparator(msg.messageTimestamp)}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`flex ${msg.fromMe ? "justify-end" : "justify-start"} group/msg`}>
                    <div className={`relative max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm ${
                      msg.isDeleted
                        ? "bg-slate-100 text-slate-400 italic"
                        : msg.fromMe
                          ? "bg-emerald-100 text-slate-900 rounded-tr-none"
                          : "bg-white text-slate-900 rounded-tl-none"
                    }`}>
                      {/* Group sender name */}
                      {selectedChat.wa_isGroup && !msg.fromMe && msg.senderName && (
                        <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">{msg.senderName}</p>
                      )}

                      {/* Quoted message */}
                      {msg.quotedMsg && (
                        <div className="mb-1 px-2 py-1 border-l-2 border-emerald-400 bg-emerald-50/50 rounded text-xs text-slate-500">
                          <p className="font-medium text-emerald-700 text-[10px]">{msg.quotedMsg.sender?.split("@")[0] || "Mensagem"}</p>
                          <p className="truncate">{msg.quotedMsg.text || `[${msg.quotedMsg.messageType}]`}</p>
                        </div>
                      )}

                      {/* Deleted message */}
                      {msg.isDeleted ? (
                        <p className="text-xs flex items-center gap-1"><Trash2 className="h-3 w-3" /> Mensagem apagada</p>
                      ) : (
                        <>
                          {/* Media */}
                          <MediaPreview msg={msg} />

                          {/* Text */}
                          {msg.text && !msg.mediaUrl && (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                          )}
                          {msg.text && msg.mediaUrl && msg.messageType !== "image" && msg.messageType !== "video" && (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                          )}

                          {/* No content fallback */}
                          {!msg.text && !msg.mediaUrl && msg.messageType !== "Conversation" && (
                            <p className="text-xs text-slate-400 italic">
                              {msg.messageType === "image" ? "Foto" : msg.messageType === "video" ? "Video" : msg.messageType === "audio" || msg.messageType === "ptt" ? "Audio" : msg.messageType === "document" ? "Documento" : msg.messageType === "sticker" ? "Figurinha" : msg.messageType === "location" ? "Localizacao" : msg.messageType === "poll_creation" ? "Enquete" : msg.messageType}
                            </p>
                          )}
                        </>
                      )}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="text-xs bg-white/60 rounded-full px-1.5 py-0.5 shadow-sm">{r.emoji}</span>
                          ))}
                        </div>
                      )}

                      {/* Footer: time + ack + edited */}
                      <div className={`flex items-center gap-1 mt-0.5 ${msg.fromMe ? "justify-end" : ""}`}>
                        {msg.isEdited && <span className="text-[9px] text-slate-400">editada</span>}
                        {msg.isStarred && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                        <span className={`text-[10px] ${msg.fromMe ? "text-emerald-600" : "text-slate-400"}`}>
                          {formatMsgTime(msg.messageTimestamp)}
                        </span>
                        {msg.fromMe && <AckIcon ack={msg.ack} />}
                      </div>

                      {/* Hover actions */}
                      {!msg.isDeleted && (
                        <div className="absolute -top-3 right-0 hidden group-hover/msg:flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 shadow-sm px-1 py-0.5 z-10">
                          <button onClick={() => setReplyTo(msg)} className="p-0.5 text-slate-400 hover:text-slate-600 rounded" title="Responder">
                            <Reply className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === msg.messageid ? null : msg.messageid)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                            title="Reagir"
                          >
                            <Smile className="h-3 w-3" />
                          </button>
                          <button onClick={() => { setForwardingMsg(msg); setShowMsgMenu(null); }} className="p-0.5 text-slate-400 hover:text-slate-600 rounded" title="Encaminhar">
                            <Forward className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleCopyMsg(msg)} className="p-0.5 text-slate-400 hover:text-slate-600 rounded" title="Copiar">
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setShowMsgMenu(showMsgMenu === msg.messageid ? null : msg.messageid)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                            title="Mais"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Emoji reaction picker */}
                      {showEmojiPicker === msg.messageid && (
                        <div className="absolute -top-10 right-0 flex items-center gap-0.5 bg-white rounded-xl border border-slate-200 shadow-xl px-2 py-1 z-20">
                          {EMOJI_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                apiPost("reaction", { chatid: selectedChat.wa_chatid, messageid: msg.messageid, emoji });
                                setShowEmojiPicker(null);
                              }}
                              className="text-lg hover:scale-125 transition-transform p-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Message context menu */}
                      {showMsgMenu === msg.messageid && (
                        <div className="absolute -top-2 right-8 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-20 min-w-[140px]">
                          <button
                            onClick={() => {
                              apiPost("star-msg", { chatid: selectedChat.wa_chatid, messageid: msg.messageid, star: !msg.isStarred });
                              setMessages(prev => prev.map(m => m.messageid === msg.messageid ? { ...m, isStarred: !m.isStarred } : m));
                              setShowMsgMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            <Star className="h-3 w-3" /> {msg.isStarred ? "Desfavoritar" : "Favoritar"}
                          </button>
                          {msg.fromMe && msg.messageType === "Conversation" && (
                            <button
                              onClick={() => { setEditingMsg(msg); setEditText(msg.text); setShowMsgMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              <Edit3 className="h-3 w-3" /> Editar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMsg(msg, false)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            <Trash2 className="h-3 w-3" /> Apagar para mim
                          </button>
                          {msg.fromMe && (
                            <button
                              onClick={() => handleDeleteMsg(msg, true)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" /> Apagar para todos
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollDown && (
              <div className="absolute bottom-32 right-8 z-20">
                <button
                  onClick={scrollToBottom}
                  className="w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors relative"
                >
                  <ArrowDown className="h-5 w-5 text-slate-600" />
                  {unreadBelowCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadBelowCount > 99 ? "99+" : unreadBelowCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Edit message bar */}
            {editingMsg && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-t border-blue-100">
                <Edit3 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                  className="flex-1 text-sm outline-none bg-transparent"
                  autoFocus
                />
                <button onClick={() => setEditingMsg(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={handleEdit} className="p-1 text-blue-500 hover:text-blue-700">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Suggested Replies */}
            <SuggestedReplies
              lastMessages={messages.slice(-5).map((m) => ({ role: m.fromMe ? "assistant" : "user", content: m.text }))}
              leadName={selectedChat.wa_contactName || selectedChat.phone || ""}
              onSelect={(text) => setNewMsg(text)}
              visible={messages.length > 0 && !newMsg && !editingMsg}
            />

            {/* Reply preview */}
            {replyTo && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex-shrink-0">
                <Reply className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 border-l-2 border-emerald-400 pl-2">
                  <p className="text-[10px] font-medium text-emerald-700">
                    {replyTo.fromMe ? "Voce" : (selectedChat.wa_contactName || "Contato")}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{replyTo.text || `[${replyTo.messageType}]`}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                {/* Attach button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-44 z-20">
                      {[
                        { label: "Foto", icon: Image, type: "image", accept: "image/*" },
                        { label: "Video", icon: Video, type: "video", accept: "video/*" },
                        { label: "Documento", icon: FileText, type: "document", accept: "*/*" },
                        { label: "Audio", icon: Mic, type: "audio", accept: "audio/*" },
                        { label: "Localizacao", icon: MapPin, type: "location", accept: "" },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            if (item.type === "location") {
                              // Location sharing - get current position
                              navigator.geolocation?.getCurrentPosition(
                                async (pos) => {
                                  const phone = selectedChat.wa_chatid.split("@")[0];
                                  await fetch("/api/whatsapp/send", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      number: phone,
                                      type: "location",
                                      lat: pos.coords.latitude,
                                      lng: pos.coords.longitude,
                                    }),
                                  });
                                  toast.success("Localizacao enviada");
                                  setShowAttachMenu(false);
                                  setTimeout(() => fetchMessages(selectedChat.wa_chatid), 1000);
                                },
                                () => toast.error("Nao foi possivel acessar localizacao")
                              );
                              return;
                            }
                            setFileType(item.type);
                            fileInputRef.current?.setAttribute("accept", item.accept);
                            fileInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                          <item.icon className="h-4 w-4 text-slate-400" /> {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSend}
                  />
                </div>

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
              <p className="text-sm text-slate-400 mt-1">Selecione uma conversa para comecar</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-xs text-slate-400">
                  {connectionStatus === "connected" ? "WhatsApp conectado" : connectionStatus === "disconnected" ? "WhatsApp desconectado" : "Verificando..."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lead Context Panel */}
      {selectedChat && showPanel && (
        <LeadContextPanel
          leadPhone={selectedChat.wa_chatid?.split("@")[0] || selectedChat.phone || ""}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* ─── Forward Modal ─── */}
      {forwardingMsg && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setForwardingMsg(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">Encaminhar para</h3>
                <button onClick={() => setForwardingMsg(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar contato..."
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {forwardChats.slice(0, 30).map(chat => {
                const name = chat.wa_contactName || chat.wa_groupSubject || chat.phone || "Sem nome";
                return (
                  <button
                    key={chat.id || chat.wa_chatid}
                    onClick={() => handleForward(chat)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-500">{getInitials(name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                      <p className="text-[10px] text-slate-400">{chat.wa_chatid?.split("@")[0]}</p>
                    </div>
                    <Forward className="h-4 w-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Click outside handlers */}
      {(showChatMenu || showMsgMenu || showEmojiPicker) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => { setShowChatMenu(null); setShowMsgMenu(null); setShowEmojiPicker(null); }}
        />
      )}
    </div>
  );
}

// ─── Chat Item Component ───

function ChatItem({
  chat,
  isSelected,
  onSelect,
  onMenuToggle,
  showMenu,
  onPin,
  onArchive,
  onMute,
}: {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chat: Chat) => void;
  onMenuToggle: (chatId: string | null) => void;
  showMenu: boolean;
  onPin: (chat: Chat) => void;
  onArchive: (chat: Chat) => void;
  onMute: (chat: Chat) => void;
}) {
  const name = chat.wa_contactName || chat.wa_groupSubject || chat.phone || "Sem nome";
  const lastMsg = chat.wa_lastMessageTextVote || "";
  const time = formatTime(chat.wa_lastMsgTimestamp);
  const pic = chat.imagePreview || chat.image;
  const lastType = chat.wa_lastMessageType;

  return (
    <div className="relative group/chat">
      <div
        onClick={() => onSelect(chat)}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 transition-colors ${
          isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
        }`}
      >
        <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-slate-200 flex items-center justify-center">
          {pic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pic} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-slate-500">{getInitials(name)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              {chat.wa_pinned && <Pin className="h-3 w-3 text-slate-400 flex-shrink-0" />}
              {chat.wa_muted && <VolumeX className="h-3 w-3 text-slate-300 flex-shrink-0" />}
              <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            </div>
            <span className={`text-[10px] flex-shrink-0 ml-2 ${chat.wa_unreadCount > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
              {time}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-slate-500 truncate flex items-center gap-1 flex-1 min-w-0">
              {lastType === "image" && <Image className="h-3 w-3 shrink-0" />}
              {lastType === "video" && <Video className="h-3 w-3 shrink-0" />}
              {(lastType === "audio" || lastType === "ptt") && <Mic className="h-3 w-3 shrink-0" />}
              {lastType === "document" && <FileText className="h-3 w-3 shrink-0" />}
              {lastMsg || (lastType === "image" ? "Foto" : lastType === "video" ? "Video" : lastType === "audio" || lastType === "ptt" ? "Audio" : lastType === "document" ? "Documento" : lastType === "sticker" ? "Figurinha" : "")}
            </p>
            {chat.wa_unreadCount > 0 && (
              <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ml-1">
                {chat.wa_unreadCount > 99 ? "99+" : chat.wa_unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Context menu trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(showMenu ? null : chat.wa_chatid); }}
          className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover/chat:opacity-100 transition-opacity flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="absolute right-3 top-12 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-30 min-w-[160px]">
          <button onClick={() => onPin(chat)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
            <Pin className="h-3.5 w-3.5" /> {chat.wa_pinned ? "Desafixar" : "Fixar"}
          </button>
          <button onClick={() => onArchive(chat)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
            <Archive className="h-3.5 w-3.5" /> {chat.wa_archived ? "Desarquivar" : "Arquivar"}
          </button>
          <button onClick={() => onMute(chat)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
            {chat.wa_muted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {chat.wa_muted ? "Ativar notificacoes" : "Silenciar"}
          </button>
          <button
            onClick={() => {
              apiPost("mark-unread", { chatid: chat.wa_chatid });
              toast.success("Marcada como nao lida");
              onMenuToggle(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> Marcar como nao lida
          </button>
        </div>
      )}
    </div>
  );
}
