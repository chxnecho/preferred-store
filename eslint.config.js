import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "legacy/**", "server/data/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      "no-console": "off", // 服务端脚本允许 console
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      ...reactHooks.configs.recommended.rules,
      // 数据在 effect 中加载（无 react-query 数据层的刻意选择），关闭该过于严格的新规则
      "react-hooks/set-state-in-effect": "off",
      // zustand store 文件同时导出 store 与组件外使用的 action 函数
      "react-refresh/only-export-components": "off"
    }
  }
]
