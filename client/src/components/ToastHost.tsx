import { useToastStore } from "../toast"
import "../styles/ToastHost.css"

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item ${t.type}`}>
          {t.type === "error" ? "⚠️ " : "✅ "}
          {t.message}
        </div>
      ))}
    </div>
  )
}
