import type { IBaseResponse } from "@/common/apis/base/res";
import { http } from "@/plugin/request";

export interface IVipPlan {
  id: number;
  plan_code: string;
  card_type: string;
  plan_name: string;
  price_amount: string;
  original_price_amount?: string | null;
  duration_days: number;
  badge_text: string;
  highlight_text?: string | null;
  benefit_text?: string | null;
  is_active: boolean;
}

export interface IVipStatus {
  is_active: boolean;
  plan_code?: string | null;
  plan_name?: string | null;
  badge_text?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  single_generate_quota_remaining?: number;
}

export interface IPaymentOverview {
  can_generate: boolean;
  access_mode: string;
  reason: string;
  single_generate_price_amount: string;
  has_single_quota: boolean;
  single_generate_quota_remaining: number;
  vip_status: IVipStatus;
  vip_plans: IVipPlan[];
}

export interface ICreatePaymentOrderReq {
  order_type: "single_generate" | "month_card";
  plan_code?: string;
  shop_code?: string;
}

export interface IPaymentOrder {
  order_no: string;
  order_type: string;
  status: string;
  title: string;
  amount_amount: string;
  payable_amount: string;
  pay_params?: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  } | null;
}

export interface IUserPaymentOrderItem {
  order_no: string;
  order_type: string;
  status: string;
  title: string;
  amount_amount: string;
  payable_amount: string;
  plan_code?: string | null;
  plan_name?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface IUserPaymentOrderListRes {
  page: number;
  page_size: number;
  total: number;
  items: IUserPaymentOrderItem[];
}

export interface IUserPaymentOrderDetail extends IUserPaymentOrderItem {
  shop_id?: number | null;
  shop_code?: string | null;
  shop_owner_user_id?: number | null;
  promoter_salesperson_user_id?: number | null;
  snapshot: Record<string, unknown>;
}

const paymentApi = {
  getOverview() {
    return http.get<IPaymentOverview>("/payment/overview");
  },
  getVipPlans() {
    return http.get<IVipPlan[]>("/payment/vip-plans");
  },
  createOrder(data: ICreatePaymentOrderReq) {
    return http.post<IPaymentOrder>("/payment/orders", data);
  },
  getOrderList(params?: { page?: number; page_size?: number }) {
    return http.get<IUserPaymentOrderListRes>("/payment/orders", params || {});
  },
  getOrderDetail(orderNo: string) {
    return http.get<IUserPaymentOrderDetail>(`/payment/orders/${encodeURIComponent(orderNo)}`);
  },
};

export default paymentApi;
