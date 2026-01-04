import type {IBaseResponse, IPageRes} from "@/common/apis/base/res";
import {http} from "@/plugin/request";

enum OrderApiEnum {
    CREATE_ORDER = '/order/create',
    GET_ORDER_DETAIL = '/order/detail',
    CANCEL_ORDER = '/order/cancel',
    ORDER_LIST = '/order/list'
}

export interface CreateOrderReq {
    productId: number, // 商品ID
    skuId: number, // SKU ID
}


export interface CreateOrderRes {
    orderId: string // 订单ID
}

/**
 * 创建订单
 * @param req
 */
const createOrder = async (req: CreateOrderReq): Promise<IBaseResponse<CreateOrderRes>> => {
    console.log(req)
    return await http.post<CreateOrderRes>(OrderApiEnum.CREATE_ORDER, req)
}


/**
 * 订单项响应数据模型
 */
export interface OrderItemRes {
    /** 订单项ID */
    id: number;

    /** 订单ID */
    orderId: number;

    /** 订单项类型 */
    itemType: string;

    /** 商品ID */
    productId: number;

    /**
     * SKU ID
     * 当 itemType 为 SKU 时不为空
     */
    skuId?: number;

    /** 商品名称 */
    productName: string;

    /**
     * SKU 名称
     * 当 itemType 为 SKU 时不为空
     */
    skuName?: string;

    /** 数量 */
    quantity: number;

    /**
     * 单价（向后兼容字段）
     * ⚠️ 不推荐新逻辑使用
     */
    price: string;

    /** 单价 */
    unitPrice: string;

    /** 总价（单价 × 数量） */
    totalPrice: string;

    /** 创建时间（ISO 8601 时间字符串） */
    createdAt: string;

    /** 更新时间（ISO 8601 时间字符串） */
    updatedAt: string;
}


/**
 * 订单详情响应数据模型
 */
export interface OrderDetailRes {
    /** 订单ID */
    id: number;

    /** 用户ID */
    userId: number;

    /** 订单状态 */
    status: string;

    /** 订单总金额（字符串，通常用于避免精度问题） */
    totalAmount: string;

    /** 支付时间（ISO 8601 时间字符串） */
    payTime?: string;

    /** 订单过期时间（ISO 8601 时间字符串） */
    expireTime?: string;

    /** 支付类型 */
    paymentType?: string;

    /** 商家订单号 */
    merchantOrderNo?: string;

    /** 支付流水号 */
    serialNo?: string;

    /** 备注 */
    remark?: string;

    /** 创建时间（ISO 8601 时间字符串） */
    createdAt: string;

    /** 更新时间（ISO 8601 时间字符串） */
    updatedAt: string;

    /** 订单项列表 */
    items: OrderItemRes[];
}


/**
 * 获取订单详情
 */
const getOrderDetail = async (orderId: string): Promise<IBaseResponse<OrderDetailRes>> => {
    return await http.get<OrderDetailRes>(OrderApiEnum.GET_ORDER_DETAIL, {orderId})
}

/**
 * 取消订单
 */
const cancelOrder = async (orderId: string): Promise<IBaseResponse<void>> => {
    return await http.post<void>(OrderApiEnum.CANCEL_ORDER, {}, {orderId})
}

export interface OrderSimple {
    id: number,
    userId: number,
    name: string,
    status: string,
    totalAmount: string,
    payTime: string,
    expireTime: string,
    paymentType: string,
    merchantOrderNo: string,
    serialNo: string,
    remark: string,
    createdAt: string,
    updatedAt: string,
}

const getOrderList = async (pageNo: number, pageSize: number): Promise<IBaseResponse<IPageRes<OrderSimple>>> => {
    return await http.get<IPageRes<OrderSimple>>(OrderApiEnum.ORDER_LIST, {pageNo, pageSize})
}

export default {
    createOrder,
    getOrderDetail,
    cancelOrder,
    getOrderList
}