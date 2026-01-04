import { createSSRApp } from "vue";
import App from "./App.vue";
import plugin from "./plugin";

export function createApp() {
  const app = createSSRApp(App);
  // 注册插件（pinia等）
  plugin(app);
  return {
    app,
  };
}
