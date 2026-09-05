import { useEffect, useState, type ChangeEvent } from "react"
import "../styles/AddressForm.css"
import type { Address, AddressInput } from "../../../shared/types"

interface AddressFormProps {
  /** 编辑时传入原地址对象，新增传 null 或不传 */
  initial?: Address | null
  /** 父组件填充的提交错误信息 */
  error: string
  /** 保存中状态 */
  submitting: boolean
  onSave: (data: AddressInput) => void
  onCancel: () => void
}

export default function AddressForm({
  initial = null,
  error = "",
  submitting = false,
  onSave,
  onCancel
}: AddressFormProps) {
  const [form, setForm] = useState<AddressInput>({
    receiver: "",
    phone: "",
    region: "",
    detail: "",
    isDefault: false
  })

  useEffect(() => {
    setForm({
      receiver: initial?.receiver || "",
      phone: initial?.phone || "",
      region: initial?.region || "",
      detail: initial?.detail || "",
      isDefault: initial ? Boolean(initial.isDefault) : false
    })
  }, [initial])

  const field =
    (key: keyof AddressInput) =>
    ({
      value: form[key] as string,
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value.trim() }))
    })

  return (
    <form
      className="addr-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...form })
      }}
    >
      <div className="form-grid">
        <div className="form-item">
          <label>收货人</label>
          <input {...field("receiver")} placeholder="姓名" />
        </div>
        <div className="form-item">
          <label>手机号</label>
          <input {...field("phone")} placeholder="11 位手机号" maxLength={11} />
        </div>
        <div className="form-item">
          <label>所在地区</label>
          <input {...field("region")} placeholder="省 市 区（如：上海市 上海市 浦东新区）" />
        </div>
        <div className="form-item">
          <label>详细地址</label>
          <input {...field("detail")} placeholder="街道、楼栋、门牌号" />
        </div>
      </div>
      <label className="default-check">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
        />{" "}
        设为默认地址
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="addr-form-actions">
        <button type="submit" className="btn-primary small" disabled={submitting}>
          {submitting ? "保存中..." : "保存"}
        </button>
        <button type="button" className="btn-outline" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
