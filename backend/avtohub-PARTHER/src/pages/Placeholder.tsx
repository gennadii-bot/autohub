interface PlaceholderProps {
  title: string;
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">Раздел в разработке</p>
    </div>
  );
}
