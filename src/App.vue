<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useAccountStore } from "@/store/accountStore";
import type { BeadPatternResult } from "@/common/utils/beadPattern";

const accountStore = useAccountStore();
const app = getApp() as { globalData?: { latestBeadPattern?: BeadPatternResult | null } };

if (!app.globalData) {
  app.globalData = {};
}

const syncCurrentUser = async () => {
  await accountStore.refreshUserInfoOnAppOpen();
};

onLaunch(() => {
  console.log("Framework app launch");
  void syncCurrentUser();
});

onShow(() => {
  console.log("Framework app show");
  void syncCurrentUser();
});

onHide(() => {
  console.log("Framework app hide");
});
</script>

<style>
</style>
