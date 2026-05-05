import type { IBaseResponse } from "@/common/apis/base/res";
import { http } from "@/plugin/request";

export interface IShopApplicant {
  id: number;
  username: string;
  nickname?: string | null;
  real_name?: string | null;
  display_name: string;
  phone?: string | null;
}

export interface IShopItem {
  id: number;
  shop_code: string;
  owner_user_id: number;
  promoter_salesperson_user_id?: number | null;
  source_type: "COMPANY" | "SALESPERSON";
  owner?: IShopApplicant | null;
  promoter_salesperson?: IShopApplicant | null;
  bind_qrcode_id?: number | null;
  bind_qrcode_code?: string | null;
  bind_qrcode_scene?: string | null;
  bind_qrcode_url?: string | null;
  bind_qrcode_full_url?: string | null;
  shop_name: string;
  display_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  address_detail?: string | null;
  mini_program_path: string;
  profit_sharing_rate: string;
  remark?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IShopBindQrcodeItem {
  id: number;
  qrcode_code: string;
  generated_by_salesperson_user_id?: number | null;
  source_type: "COMPANY" | "SALESPERSON";
  generated_by_salesperson?: IShopApplicant | null;
  bound_shop_id?: number | null;
  bound_owner_user_id?: number | null;
  bound_shop?: IShopItem | null;
  mini_program_path: string;
  mini_program_scene?: string | null;
  mini_program_qrcode_url?: string | null;
  mini_program_qrcode_full_url?: string | null;
  is_bound: boolean;
  bound_at?: string | null;
  remark?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IShopBindQrcodeListRes {
  page: number;
  page_size: number;
  total: number;
  items: IShopBindQrcodeItem[];
}

export interface IConsumeShopBindQrcodeRes {
  qrcode: IShopBindQrcodeItem;
  shop: IShopItem;
  owner_role_bound: boolean;
}

export interface IConsumeShopBindQrcodeReq {
  qrcode_code: string;
  shop_name: string;
  display_name?: string;
  contact_name: string;
  contact_phone: string;
  address_detail?: string;
  remark?: string;
}

export interface IUpdateMyShopReq {
  shop_name?: string;
  display_name?: string;
  contact_name?: string;
  contact_phone?: string;
  address_detail?: string;
  remark?: string;
}

export interface IShopIncomeStat {
  total_income: number;
  pattern_income: number;
  membership_income: number;
}

export interface IShopOwnerShopIncomeItem {
  shop: IShopItem;
  income: IShopIncomeStat;
}

export interface IShopOwnerIncomeDashboardRes {
  date_from: string;
  date_to: string;
  summary: IShopIncomeStat;
  shop_count: number;
  items: IShopOwnerShopIncomeItem[];
}

const shopApi = {
  getMyShops() {
    return http.get<IShopItem[]>("/shop-owner/shops/me");
  },
  getShopOwnerIncomeDashboard(params?: { date_from?: string; date_to?: string }) {
    return http.get<IShopOwnerIncomeDashboardRes>("/shop-owner/income-dashboard", params || {});
  },
  updateMyShop(shopId: number, data: IUpdateMyShopReq) {
    return http.request<IShopItem>({
      url: `/shop-owner/shops/${shopId}`,
      method: "put",
      data,
    });
  },
  getBindQrcodeContext(qrcodeCode: string) {
    return http.get<IShopBindQrcodeItem>("/shop/bind-qrcodes/context", { qrcode_code: qrcodeCode });
  },
  consumeBindQrcode(data: IConsumeShopBindQrcodeReq) {
    return http.post<IConsumeShopBindQrcodeRes>("/shop/bind-qrcodes/consume", data);
  },
  getSalespersonBindQrcodes(params: { is_bound?: boolean; page: number; page_size: number }) {
    return http.get<IShopBindQrcodeListRes>("/salesperson/shop-bind-qrcodes", params);
  },
  generateSalespersonBindQrcode() {
    return http.post<IShopBindQrcodeItem>("/salesperson/shop-bind-qrcodes");
  },
  deleteSalespersonBindQrcode(qrcodeId: number) {
    return http.request<null>({
      url: `/salesperson/shop-bind-qrcodes/${qrcodeId}`,
      method: "delete",
    });
  },
};

export default shopApi;
