export default function PageLoading({
  label = "Cargando",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col items-center justify-center py-24 gap-4"
    >
      <span
        className="material-symbols-outlined animate-spin text-secondary-container"
        style={{ fontSize: "40px" }}
      >
        progress_activity
      </span>
      <p className="text-sm text-on-surface-variant">{label}</p>
    </div>
  );
}