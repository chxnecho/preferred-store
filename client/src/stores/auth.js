import { create } from "zustand"
import { api } from "../api"
import { getToken, getStoredUser, setToken, setStoredUser } from "../auth"

export const useAuthStore = create((set, get) => ({
  token: getToken(),
  user: getStoredUser(),

  isLoggedIn: () => Boolean(get().token),

  setAuth: (token, user) => {
    setToken(token)
    setStoredUser(user)
    set({ token, user })
  },

  login: async (username, password) => {
    const data = await api.login({ username, password })
    get().setAuth(data.token, data.user)
    return data.user
  },

  register: async (payload) => {
    const data = await api.register(payload)
    get().setAuth(data.token, data.user)
    return data.user
  },

  fetchMe: async () => {
    if (!get().token) return
    try {
      const data = await api.me()
      set({ user: data.user })
      setStoredUser(data.user)
    } catch {
      /* token 失效已在 api 层清除 */
    }
  },

  logout: () => get().setAuth("", null)
}))
