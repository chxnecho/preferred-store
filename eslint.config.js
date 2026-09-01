import js from "@eslint/js"
import pluginVue from "eslint-plugin-vue"
import globals from "globals"

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "legacy/**", "server/data/**"]
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      "no-console": "off", // 服务端脚本允许 console
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // 单文件组件 App.vue 允许单词命名
      "vue/multi-word-component-names": "off",
      // 关闭与现有紧凑模板风格冲突的纯格式规则（保留结构类校验）
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off"
    }
  }
]
