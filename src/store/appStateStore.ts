import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStateStore = defineStore("appState", () => {
  const maintenanceModeEnabled = ref(false);
  const virtualPaymentReviewModeEnabled = ref(false);

  const setMaintenanceModeEnabled = (value: boolean) => {
    maintenanceModeEnabled.value = Boolean(value);
  };

  const setVirtualPaymentReviewModeEnabled = (value: boolean) => {
    virtualPaymentReviewModeEnabled.value = Boolean(value);
  };

  return {
    maintenanceModeEnabled,
    virtualPaymentReviewModeEnabled,
    setMaintenanceModeEnabled,
    setVirtualPaymentReviewModeEnabled,
  };
});
