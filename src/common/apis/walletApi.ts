import { http } from "@/plugin/request";

export interface IUserWallet {
  id: number;
  user_id: number;
  available_amount: string;
  frozen_amount: string;
  total_income_amount: string;
  total_withdraw_amount: string;
  status: "ACTIVE" | "FROZEN";
  created_at: string;
  updated_at: string;
}

export interface IWalletListRes<T> {
  page: number;
  page_size: number;
  total: number;
  items: T[];
}

export interface IIncomeRecord {
  id: number;
  order_no: string;
  income_type: string;
  source_type: string;
  source_name?: string | null;
  shop_name?: string | null;
  gross_amount: string;
  profit_sharing_rate: string;
  platform_amount: string;
  income_amount: string;
  settle_status: string;
  paid_at: string;
  settled_at?: string | null;
  remark?: string | null;
}

export interface IWalletLedger {
  id: number;
  change_type: string;
  direction: "IN" | "OUT" | "FREEZE" | "UNFREEZE";
  amount: string;
  available_before: string;
  available_after: string;
  frozen_before: string;
  frozen_after: string;
  remark?: string | null;
  created_at: string;
}

export interface IWithdrawRequest {
  id: number;
  withdraw_no: string;
  amount: string;
  status: "PENDING" | "PAID" | "REJECTED" | "CANCELLED";
  account_type?: string | null;
  account_name?: string | null;
  account_no?: string | null;
  receipt_qrcode_url?: string | null;
  receipt_qrcode_full_url?: string | null;
  bank_name?: string | null;
  applied_at: string;
  audited_at?: string | null;
  paid_at?: string | null;
  apply_remark?: string | null;
  audit_remark?: string | null;
  payment_voucher_url?: string | null;
  payment_voucher_full_url?: string | null;
  paid_amount?: string | null;
}

export interface ICreateWithdrawRequestReq {
  amount?: string;
  receipt_qrcode_url?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  bank_name?: string;
  apply_remark?: string;
}

export interface IUploadedImageRes {
  image_id: string;
  file_hash: string;
  image_url: string;
  image_full_url: string;
}

const walletApi = {
  getMyWallet() {
    return http.get<IUserWallet>("/wallet/me");
  },
  getIncomeRecords(params: { settle_status?: string; page: number; page_size: number }) {
    return http.get<IWalletListRes<IIncomeRecord>>("/wallet/income-records", params);
  },
  getLedgers(params: { change_type?: string; page: number; page_size: number }) {
    return http.get<IWalletListRes<IWalletLedger>>("/wallet/ledgers", params);
  },
  getWithdrawRequests(params: { status?: string; page: number; page_size: number }) {
    return http.get<IWalletListRes<IWithdrawRequest>>("/wallet/withdraw-requests", params);
  },
  createWithdrawRequest(data: ICreateWithdrawRequestReq) {
    return http.post<IWithdrawRequest>("/wallet/withdraw-requests", data);
  },
  uploadImage(filePath: string) {
    return http.upload<IUploadedImageRes>("/media/upload-image", filePath, "file");
  },
};

export default walletApi;
