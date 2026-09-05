import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./style.css"

const rootEl = document.getElementById("app")
if (!rootEl) throw new Error("找不到 #app 挂载点")
createRoot(rootEl).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
