import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStateStore = defineStore("appState", () => {
  const maintenanceModeEnabled = ref(false);

  const setMaintenanceModeEnabled = (value: boolean) => {
    maintenanceModeEnabled.value = Boolean(value);
  };

  return {
    maintenanceModeEnabled,
    setMaintenanceModeEnabled,
  };
});
