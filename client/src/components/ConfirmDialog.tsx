import { useConfirmStore } from "../confirm"
import "../styles/ConfirmDialog.css"

export default function ConfirmDialog() {
  const { visible, title, message, danger, settle } = useConfirmStore()

  if (!visible) return null

  return (
    <div
      className="dialog-overlay"
      onClick={(e) => e.target === e.currentTarget && settle(false)}
      onKeyDown={(e) => e.key === "Escape" && settle(false)}
    >
      <div className="dialog-card" role="alertdialog" aria-label={title}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="btn-outline" onClick={() => settle(false)}>
            取消
          </button>
          <button className={`btn-primary${danger ? " danger" : ""}`} onClick={() => settle(true)}>
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
