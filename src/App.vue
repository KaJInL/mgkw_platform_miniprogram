<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useCategoryStore } from "@/store/categoryStore";
import {useSysConfStore} from "@/store/sysConfStore";

const categoryStore = useCategoryStore();
const confStore = useSysConfStore();
onLaunch(async () => {
  console.log("App Launch");
  
  // 初始化分类和系列数据
  // 优先从本地缓存加载，然后在后台静默刷新
  await categoryStore.initData();

  // 加载小程序配置
  await confStore.load()
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
</style>
