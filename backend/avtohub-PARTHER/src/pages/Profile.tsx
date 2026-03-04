import { useCallback, useEffect, useRef, useState } from "react";
import { getProfile, updateProfile, uploadProfilePhoto } from "../api/partnerApi";
import type { PartnerProfile, PartnerProfileUpdate } from "../api/partnerApi";
import { Loading } from "../components/Loading";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
      setPhotoPreview(null);
    } catch {
      setError("Не удалось загрузить профиль");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const photoDisplayUrl = profile?.sto_image_url
    ? (profile.sto_image_url.startsWith("http") ? profile.sto_image_url : `${API_BASE}${profile.sto_image_url}`)
    : null;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Файл: jpg, png или webp, не более 5 МБ");
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadProfilePhoto(file);
      setProfile((prev) => (prev ? { ...prev, sto_image_url: url } : null));
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Профиль</h1>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
          {successMessage}
        </div>
      )}
      {profile && (
        <form onSubmit={(e) => { e.preventDefault(); setSaveConfirm(true); }} className="max-w-xl space-y-6">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Email</label>
            <p className="text-white">{profile.email}</p>
          </div>
          {profile.sto_id != null && (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Фото СТО</label>
                <div className="flex flex-wrap items-start gap-4">
                  {(photoPreview || photoDisplayUrl) && (
                    <div className="h-32 w-40 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                      <img
                        src={photoPreview ?? photoDisplayUrl ?? ""}
                        alt="СТО"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      disabled={uploading}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {uploading ? "Загрузка..." : "Загрузить фото"}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG или WebP, макс. 5 МБ</p>
                  </div>
                </div>
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
            className="rounded-xl bg-emerald-600 px-6 py-2 text-white disabled:opacity-50"
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
