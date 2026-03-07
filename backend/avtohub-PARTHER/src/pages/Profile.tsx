import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProfile,
  updateProfile,
  uploadStoPhoto,
  deleteStoPhoto,
  getMediaUrl,
} from "../api/partnerApi";
import type { PartnerProfile, PartnerProfileUpdate } from "../api/partnerApi";
import { Loading } from "../components/Loading";
import { Trash2, Plus } from "lucide-react";

const MAX_PHOTOS = 10;

export function Profile() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [stoName, setStoName] = useState("");
  const [stoPhone, setStoPhone] = useState("");
  const [stoAddress, setStoAddress] = useState("");
  const [stoDescription, setStoDescription] = useState("");
  const [stoRegion, setStoRegion] = useState("");
  const [stoCity, setStoCity] = useState("");
  const [stoOwnerInitials, setStoOwnerInitials] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProfile();
      setProfile(data);
      setStoName(data.sto_name ?? "");
      setStoPhone(data.sto_phone ?? "");
      setStoAddress(data.sto_address ?? "");
      setStoDescription(data.sto_description ?? "");
      setStoRegion(data.sto_region ?? "");
      setStoCity(data.sto_city ?? "");
      setStoOwnerInitials(data.sto_owner_initials ?? "");
    } catch {
      setError("Не удалось загрузить профиль");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaveConfirm(false);
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const body: PartnerProfileUpdate = {};
      if (profile?.sto_id != null) {
        body.sto_name = stoName || undefined;
        body.sto_phone = stoPhone || undefined;
        body.sto_address = stoAddress || undefined;
        body.sto_description = stoDescription || undefined;
        body.sto_region = stoRegion || undefined;
        body.sto_city = stoCity || undefined;
        body.sto_owner_initials = stoOwnerInitials || undefined;
      }
      const updated = await updateProfile(body);
      setProfile(updated);
      setSuccessMessage("Изменения сохранены.");
    } catch {
      setError("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Файл: jpg, png или webp, не более 5 МБ");
      return;
    }
    const currentCount = profile?.sto_images?.length ?? 0;
    if (currentCount >= MAX_PHOTOS) {
      setError(`Максимум ${MAX_PHOTOS} фотографий`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { image_url, id } = await uploadStoPhoto(file);
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sto_images: [...(prev.sto_images ?? []), { id, image_url }],
        };
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (imageId: number) => {
    try {
      await deleteStoPhoto(imageId);
      setProfile((prev) =>
        prev
          ? { ...prev, sto_images: (prev.sto_images ?? []).filter((i) => i.id !== imageId) }
          : null
      );
    } catch {
      setError("Не удалось удалить фото");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl font-semibold text-white sm:text-2xl">Профиль</h1>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          {successMessage}
        </div>
      )}
      {profile && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaveConfirm(true);
          }}
          className="max-w-xl space-y-6"
        >
          <div>
            <label className="mb-1 block text-sm text-slate-400">Email</label>
            <p className="text-white">{profile.email}</p>
          </div>
          {profile.sto_id != null && (
            <>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Фото СТО (до {MAX_PHOTOS})</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(profile.sto_images ?? []).map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-800"
                    >
                      <img
                        src={getMediaUrl(img.image_url)}
                        alt="СТО"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(img.id)}
                        className="absolute right-2 top-2 rounded-lg bg-red-500/80 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(profile.sto_images?.length ?? 0) < MAX_PHOTOS && (
                    <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex flex-col items-center gap-1 rounded-lg p-4 text-slate-400 hover:bg-slate-700/50 hover:text-white disabled:opacity-50"
                      >
                        <Plus className="h-8 w-8" />
                        <span className="text-xs">Add photo</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">JPG, PNG или WebP, макс. 5 МБ</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Название СТО</label>
                <input
                  type="text"
                  value={stoName}
                  onChange={(e) => setStoName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Регион</label>
                  <input
                    type="text"
                    value={stoRegion}
                    onChange={(e) => setStoRegion(e.target.value)}
                    placeholder="Region"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Город</label>
                  <input
                    type="text"
                    value={stoCity}
                    onChange={(e) => setStoCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Инициалы владельца</label>
                <input
                  type="text"
                  value={stoOwnerInitials}
                  onChange={(e) => setStoOwnerInitials(e.target.value)}
                  placeholder="Owner initials"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Телефон</label>
                <input
                  type="text"
                  value={stoPhone}
                  onChange={(e) => setStoPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Адрес</label>
                <input
                  type="text"
                  value={stoAddress}
                  onChange={(e) => setStoAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Описание</label>
                <textarea
                  value={stoDescription}
                  onChange={(e) => setStoDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      )}

      {saveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <p className="mb-4 text-slate-300">Сохранить изменения?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => setSaveConfirm(false)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
