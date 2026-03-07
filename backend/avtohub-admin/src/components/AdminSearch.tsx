import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { searchAdmin } from "../api/admin";

export function AdminSearch() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim();
    if (!id) return;
    const num = parseInt(id, 10);
    if (Number.isNaN(num) || num <= 0) {
      setError("Введите корректный ID");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await searchAdmin(num);
      if (result.type === "user") {
        navigate(`/users/${result.data.id}`);
      } else if (result.type === "sto") {
        navigate(`/stos/${result.data.id}`);
      } else {
        setError("User or STO not found");
      }
    } catch {
      setError("User or STO not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder="Search by ID..."
        className="w-40 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
        Find
      </button>
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </form>
  );
}
