import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";
import { getToken, getStoredUser, setToken, setStoredUser } from "../auth";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(getToken());
  const user = ref(getStoredUser());

  function isLoggedIn() {
    return !!token.value;
  }

  function setAuth(t, u) {
    token.value = t;
    user.value = u;
    setToken(t);
    setStoredUser(u);
  }

  async function login(username, password) {
    const data = await api.login({ username, password });
    setAuth(data.token, data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api.register(payload);
    setAuth(data.token, data.user);
    return data.user;
  }

  async function fetchMe() {
    if (!token.value) return;
    try {
      const data = await api.me();
      user.value = data.user;
      setStoredUser(data.user);
    } catch {
      /* token 失效已在 api 层清除 */
    }
  }

  function logout() {
    setAuth("", null);
  }

  return { token, user, isLoggedIn, setAuth, login, register, fetchMe, logout };
});
