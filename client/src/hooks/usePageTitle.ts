import { useEffect } from "react"

/** 页面标题管理（等价于 Vue 版的 router meta.title + afterEach） */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} - 优选商城` : "优选商城 - 精选好物，品质生活"
  }, [title])
}