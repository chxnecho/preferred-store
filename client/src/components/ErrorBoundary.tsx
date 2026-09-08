import { Component, type ErrorInfo, type ReactNode } from "react"
import "./ErrorBoundary.css"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** 渲染错误兜底：捕获子组件树中的异常，避免整页白屏 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] 页面渲染异常", error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="error-boundary" role="alert">
        <p className="error-boundary__emoji">😵</p>
        <h2>页面出错了</h2>
        <p className="error-boundary__message">{error.message || "发生了未知错误"}</p>
        <div className="error-boundary__actions">
          <button type="button" onClick={() => this.setState({ error: null })}>
            重试
          </button>
          <button type="button" onClick={() => window.location.assign("/")}>
            返回首页
          </button>
        </div>
      </div>
    )
  }
}
