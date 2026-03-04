import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Paperclip, Mic, ZoomIn, ZoomOut, X } from "lucide-react";
import { getMyBookings } from "../../api/booking";
import {
  getChat,
  sendMessage,
  markChatRead,
  uploadChatImage,
  uploadChatVoice,
  type ChatMessage,
} from "../../api/chat";
import type { Booking } from "../../api/booking";
import { useToast } from "../../context/ToastContext";
import { getStoImageUrl } from "../../utils/media";

const POLL_INTERVAL_MS = 2000;

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  accepted: "Подтверждено",
  rescheduled: "Перенесено",
  cancelled: "Отменено",
  completed: "Выполнено",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(datetimeStr: string | null) {
  if (!datetimeStr) return "";
  const d = new Date(datetimeStr);
  return d.toLocaleTimeString("ru-KZ", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ m, onImageClick }: { m: ChatMessage; onImageClick?: (url: string) => void }) {
  const type = m.message_type || "text";
  const imgUrl = type === "image" ? getStoImageUrl(m.message) : "";
  return (
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
        m.is_mine ? "bg-emerald-500/30 text-white" : "bg-white/10 text-white"
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
        <audio controls src={getStoImageUrl(m.message)} className="max-w-full" />
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
    </motion.div>
  );
}

export function DashboardChat() {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await getMyBookings();
      const active = (data ?? []).filter(
        (b) => b.status === "pending" || b.status === "accepted" || b.status === "rescheduled"
      );
      setBookings(active);
      setSelectedId((prev) => {
        const hasPrev = active.some((b) => b.id === prev);
        if (prev && !hasPrev) return active.length > 0 ? active[0].id : null;
        return prev ?? (active.length > 0 ? active[0].id : null);
      });
    } catch (err: unknown) {
      console.error("Ошибка загрузки чата", err);
      if ((err as { response?: { status?: number } })?.response?.status !== 401) {
        addToast("Не удалось загрузить записи", "error");
      }
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadingRef = useRef(false);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    markChatRead(selectedId).catch(() => {});

    const loadMessages = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const data = await getChat(selectedId);
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
      const msg = await sendMessage(selectedId, text);
      setMessages((prev) => [...prev, msg]);
      setInput("");
    } catch {
      addToast("Не удалось отправить сообщение", "error");
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      addToast("Разрешены только jpg, png, webp", "error");
      return;
    }
    setUploading(true);
    try {
      const msg = await uploadChatImage(selectedId, file);
      setMessages((prev) => [...prev, msg]);
    } catch {
      addToast("Не удалось загрузить фото", "error");
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
        } catch {
          addToast("Не удалось отправить голосовое", "error");
        } finally {
          setUploading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      addToast("Нет доступа к микрофону", "error");
    }
  };

  const handleVoiceStop = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const selectedBooking = bookings.find((b) => b.id === selectedId);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-12rem)] flex-col gap-4"
    >
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Чат</h1>

      {bookings.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-xl">
          <div className="max-w-md px-6 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-white/30" />
            <p className="mt-4 text-white/70">
              У вас пока нет активных записей. После записи в СТО здесь появится чат с автосервисом.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-xl">
          <div className="w-64 shrink-0 flex-col border-r border-white/5 p-2">
            {bookings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={`relative mb-1 w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  selectedId === b.id
                    ? "bg-emerald-500/20 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="font-medium">{b.sto_name ?? `СТО #${b.sto_id}`}</div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-white/50">
                    {formatDate(b.date)} · {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                  {(b.unread_count ?? 0) > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {b.unread_count! > 9 ? "9+" : b.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            {selectedBooking && (
              <>
                <div className="border-b border-white/5 px-4 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-white">
                      {selectedBooking.sto_name ?? `СТО #${selectedBooking.sto_id}`}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        selectedBooking.status === "accepted" || selectedBooking.status === "rescheduled"
                          ? "border-blue-500/30 bg-blue-500/20 text-blue-300"
                          : selectedBooking.status === "pending"
                            ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                            : "border-white/20 bg-white/10 text-white/70"
                      }`}
                    >
                      {STATUS_LABELS[selectedBooking.status] ?? selectedBooking.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    {formatDate(selectedBooking.date)} · {selectedBooking.time?.slice(0, 5)}
                  </p>
                  <Link
                    to={`/sto/${selectedBooking.sto_id}`}
                    className="mt-1 block text-xs text-emerald-400 hover:underline"
                  >
                    Перейти к СТО
                  </Link>
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
                <AnimatePresence>
                  {lightboxImage && (
                    <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
                  )}
                </AnimatePresence>
                <div className="flex gap-2 border-t border-white/5 p-4">
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
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
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
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Голосовое сообщение"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Сообщение..."
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="rounded-xl bg-emerald-500/30 px-4 py-2 text-white hover:bg-emerald-500/50 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
