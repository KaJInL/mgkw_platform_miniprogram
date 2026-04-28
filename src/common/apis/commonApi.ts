import { http } from "@/plugin/request";

export interface ISystemStatusRes {
  maintenance_mode_enabled: boolean;
  virtual_payment_review_mode_enabled: boolean;
}

const commonApi = {
  getSystemStatus() {
    return http.get<ISystemStatusRes>("/system/status");
  },
};

export default commonApi;
