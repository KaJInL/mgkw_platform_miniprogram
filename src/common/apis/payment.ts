import type {IBaseResponse} from "@/common/apis/base/res";
import {http} from "@/plugin/request";

enum paymentApi {
    CREATE_WECHAT_PAYMENT = '/payment/wechat/create',
}

export interface CreateWechatPaymentRes {
    prepayId: string,
    timeStamp: string,
    nonceStr: string,
    package: string,
    signType: string,
    paySign: string,
}

const createWehcatPayment = async (orderId: string): Promise<IBaseResponse<CreateWechatPaymentRes>> => {
    return await http.get<CreateWechatPaymentRes>(paymentApi.CREATE_WECHAT_PAYMENT, {orderId})
}

export default {
    createWehcatPayment
}