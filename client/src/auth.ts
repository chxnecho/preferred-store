import type { User } from "../../shared/types"

const TOKEN_KEY = "youcai_token"
const USER_KEY = "youcai_user"

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ""
}

export function setToken(token: string): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null") as User | null
  } catch {
    return null
  }
}

export function setStoredUser(user: User | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}