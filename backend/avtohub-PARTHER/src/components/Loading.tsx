export function Loading() {
  return (
    <div className="flex justify-center py-20">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
        aria-label="Загрузка"
      />
    </div>
  );
}
