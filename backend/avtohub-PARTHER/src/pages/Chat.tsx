import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, User, Mail, Phone, Calendar, Paperclip, Mic, ZoomIn, ZoomOut, X } from "lucide-react";
import {
  getPartnerChats,
  markPartnerChatRead,
  getChatMessages,
  sendChatMessage,
  uploadChatImage,
  uploadChatVoice,
  getMediaUrl,
  type PartnerChatDialog,
  type ChatMessage,
} from "../api/partner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  accepted: "Подтверждено",
  rescheduled: "Перенесено",
  cancelled: "Отменено",
  completed: "Выполнено",
};

const POLL_INTERVAL_MS = 2000;

function formatTime(datetimeStr: string | null) {
  if (!datetimeStr) return "";
  const d = new Date(datetimeStr);
  return d.toLocaleTimeString("ru-KZ", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "short",
  });
}

function formatLastMessage(msg: string): string {
  if (!msg) return "";
  if (msg.includes("/chat/") || msg.includes("/voice/")) {
    return msg.includes("/voice/") ? "[Голосовое сообщение]" : "[Фото]";
  }
  return msg;
}

function MessageBubble({ m, onImageClick }: { m: ChatMessage; onImageClick?: (url: string) => void }) {
  const type = m.message_type || "text";
  const imgUrl = type === "image" ? getMediaUrl(m.message) : "";
  return (
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
        m.is_mine ? "bg-emerald-500/30 text-white" : "bg-slate-800 text-slate-200"
      }`}
    >
      {type === "image" ? (
        <button
          type="button"
          onClick={() => onImageClick?.(imgUrl)}
          className="block cursor-zoom-in text-left"
        >
          <img
            src={imgUrl}
            alt=""
            className="max-h-48 rounded-lg object-cover transition hover:opacity-90"
          />
        </button>
      ) : type === "voice" ? (
        <audio controls src={getMediaUrl(m.message)} className="max-w-full" />
      ) : (
        <p className="text-sm">{m.message}</p>
      )}
      <p className="mt-1 text-xs opacity-70">{formatTime(m.created_at)}</p>
    </div>
  );
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.max(0.5, Math.min(4, s + (e.deltaY > 0 ? -0.2 : 0.2))));
    };
    containerRef.current?.addEventListener("wheel", handleWheel, { passive: false });
    return () => containerRef.current?.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
      ref={containerRef}
    >
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(4, s + 0.5)); }}
          className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          title="Увеличить"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(0.5, s - 0.5)); }}
          className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          title="Уменьшить"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          title="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain transition-transform"
        style={{ transform: `scale(${scale})` }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}

export function Chat() {
  const [dialogs, setDialogs] = useState<PartnerChatDialog[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const selectedDialog = dialogs.find((d) => d.booking_id === selectedId);

  const fetchDialogs = useCallback(async () => {
    try {
      const data = await getPartnerChats();
      setDialogs(data);
      setSelectedId((prev) => {
        const hasPrev = data.some((d) => d.booking_id === prev);
        if (prev && !hasPrev) return data.length > 0 ? data[0].booking_id : null;
        return prev ?? (data.length > 0 ? data[0].booking_id : null);
      });
    } catch {
      setDialogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadingRef = useRef(false);

  useEffect(() => {
    fetchDialogs();
  }, [fetchDialogs]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    markPartnerChatRead(selectedId).catch(() => {});

    const loadMessages = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const data = await getChatMessages(selectedId);
        setMessages((prev) => {
          const lastId = prev.length > 0 ? prev[prev.length - 1]?.id : 0;
          const newLastId = data?.length ? data[data.length - 1]?.id : 0;
          if (newLastId > lastId || (data?.length ?? 0) !== prev.length) {
            return data ?? [];
          }
          return prev;
        });
      } catch (err) {
        console.error("Chat load error", err);
      } finally {
        loadingRef.current = false;
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedId) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(selectedId, text);
      setMessages((prev) => [...prev, msg]);
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) return;
    setUploading(true);
    try {
      const msg = await uploadChatImage(selectedId, file);
      setMessages((prev) => [...prev, msg]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleVoiceStart = async () => {
    if (!selectedId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        setUploading(true);
        try {
          const msg = await uploadChatVoice(selectedId, file);
          setMessages((prev) => [...prev, msg]);
        } finally {
          setUploading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // No mic access
    }
  };

  const handleVoiceStop = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Чат</h1>

      {dialogs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-12">
          <div className="text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-500" />
            <p className="mt-4 text-slate-400">
              Нет активных диалогов. После записи клиента здесь появится чат.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex w-72 shrink-0 flex-col border-r border-slate-800 overflow-y-auto">
            {dialogs.map((d) => (
              <button
                key={d.booking_id}
                type="button"
                onClick={() => setSelectedId(d.booking_id)}
                className={`flex w-full flex-col gap-1 border-b border-slate-800/50 px-4 py-3 text-left transition ${
                  selectedId === d.booking_id
                    ? "bg-emerald-500/20 text-white"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{d.client_name || d.client_email || "Клиент"}</span>
                  {d.unread_count > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {d.unread_count > 9 ? "9+" : d.unread_count}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {d.service_name} · {formatDate(d.booking_date)}
                </div>
                {d.last_message && (
                  <div className="truncate text-xs text-slate-400">
                    {formatLastMessage(d.last_message)}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {selectedDialog && (
              <>
                <div className="shrink-0 border-b border-slate-800 bg-slate-900/80 p-4">
                  <h3 className="font-medium text-white">
                    {selectedDialog.client_name || selectedDialog.client_email || "Клиент"}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="h-4 w-4" />
                      {selectedDialog.client_email || "—"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="h-4 w-4" />
                      {selectedDialog.client_phone || "—"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="h-4 w-4" />
                      {selectedDialog.service_name}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="h-4 w-4" />
                      {selectedDialog.booking_date} {selectedDialog.booking_time}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">
                      {STATUS_LABELS[selectedDialog.status] ?? selectedDialog.status}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.is_mine ? "justify-end" : "justify-start"}`}
                    >
                      <MessageBubble m={m} onImageClick={setLightboxImage} />
                    </div>
                  ))}
                </div>
                {lightboxImage && (
                  <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
                )}

                <div className="flex gap-2 border-t border-slate-800 p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-xl border border-slate-600 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                    title="Прикрепить фото"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={handleVoiceStart}
                    onMouseUp={handleVoiceStop}
                    onMouseLeave={handleVoiceStop}
                    onTouchStart={handleVoiceStart}
                    onTouchEnd={handleVoiceStop}
                    disabled={uploading}
                    className={`rounded-xl border p-2 disabled:opacity-50 ${
                      recording
                        ? "border-red-500/50 bg-red-500/20 text-red-400"
                        : "border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                    title="Голосовое сообщение"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder="Сообщение..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
