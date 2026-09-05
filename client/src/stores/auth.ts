import { create } from "zustand"
import { api } from "../api"
import { getToken, getStoredUser, setToken, setStoredUser } from "../auth"
import type { User } from "../../../shared/types"

interface AuthState {
  token: string
  user: User | null
  isLoggedIn: () => boolean
  setAuth: (token: string, user: User | null) => void
  login: (username: string, password: string) => Promise<User>
  register: (payload: { username: string; password: string; nickname?: string }) => Promise<User>
  fetchMe: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
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