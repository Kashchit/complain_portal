const typeMap = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-brand-dark"
};

export default function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeMap[toast.type] || typeMap.error} text-white rounded-lg px-4 py-3 shadow-md min-w-[260px]`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">{toast.message}</p>
            <button type="button" onClick={() => onClose(toast.id)} className="text-xs opacity-80">
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
