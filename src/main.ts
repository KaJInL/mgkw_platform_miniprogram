import { createSSRApp } from "vue";
import App from "./App.vue";
import plugin from "./plugin";

const SHARE_TITLE = "拼豆生成器";
const SHARE_PATH = "/pages/home/index";
const SHARE_IMAGE = "/static/logo.png";

export function createApp() {
  const app = createSSRApp(App);
  app.mixin({
    onShareAppMessage() {
      return {
        title: SHARE_TITLE,
        path: SHARE_PATH,
        imageUrl: SHARE_IMAGE,
      };
    },
    onShareTimeline() {
      return {
        title: SHARE_TITLE,
        query: "",
        imageUrl: SHARE_IMAGE,
      };
    },
  });
  // 注册插件（pinia等）
  plugin(app);
  return {
    app,
  };
}
