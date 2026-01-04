/**
 * 商品相关 API 模块
 * 
 * 提供商品管理相关的接口，包括：
 * - VIP套餐商品列表查询
 */
import {http} from "@/plugin/request";
import type {IBaseResponse, IListRes} from "@/common/apis/base/res";

/**
 * 商品 API 路径枚举
 */
enum ProductApiEnum {
    /** 查询VIP套餐商品列表 */
    QUERY_VIP_PRODUCT_LIST = "/product/vip/list",
}

/**
 * VIP 计划信息
 */
export interface VipPlanInfo {
    /** VIP计划ID */
    id: number
    /** VIP计划名称 */
    name: string
    /** 有效期天数 */
    days: number
    /** 价格（字符串格式，如 "199.00"） */
    price: string
    /** 套餐权益（富文本） */
    privileges?: string
    /** 背景图片URL */
    bgImageUrl?: string
}

/**
 * VIP 套餐商品信息
 */
export interface VipProductInfo {
    /** 商品ID */
    id: number
    /** 商品ID（与id相同，方便使用） */
    productId: number
    /** 商品名称 */
    name: string
    /** 商品副标题 */
    subtitle?: string
    /** 商品描述 */
    description?: string
    /** VIP计划ID */
    vipPlanId?: number
    /** VIP计划信息 */
    vipPlan?: VipPlanInfo
    /** SKU ID（VIP商品只有一个SKU） */
    skuId?: number
    /** SKU 名称 */
    skuName?: string
    /** 价格（字符串格式，如 "199.00"） */
    price?: string
    /** 原价（字符串格式，如 "299.00"） */
    originalPrice?: string
    /** 是否已发布 */
    isPublished: boolean
    /** 排序值 */
    sort: number
    /** 创建时间 */
    createdAt?: string
    /** 更新时间 */
    updatedAt?: string
}

/**
 * 查询VIP套餐商品列表
 * 
 * 不接受查询参数，直接返回全部已审核通过且已上架的VIP商品
 * 
 * @returns 返回VIP套餐商品列表
 */
const queryVipProductList = async (): Promise<IBaseResponse<IListRes<VipProductInfo>>> => {
    return await http.get<IListRes<VipProductInfo>>(ProductApiEnum.QUERY_VIP_PRODUCT_LIST)
}

/**
 * 商品 API 接口集合
 */
export default {
    /** 查询VIP套餐商品列表 */
    queryVipProductList
}

