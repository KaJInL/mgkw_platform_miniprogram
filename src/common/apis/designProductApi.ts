/**
 * 设计作品商品相关 API 模块
 *
 * 提供设计作品商品管理相关的接口，包括：
 * - 设计作品商品列表查询
 * - 设计作品商品详情查看
 * - 用户已购买的设计作品商品列表查询
 */
import {http} from "@/plugin/request";
import type {IBaseResponse, IPageRes} from "@/common/apis/base/res";

/**
 * 设计作品商品 API 路径枚举
 */
enum DesignProductApiEnum {
    /** 前端查询设计作品商品列表 */
    QUERY_DESIGN_PRODUCT_LIST = "/product/design/list",
    /** 前端查看设计作品商品详情 */
    GET_DESIGN_PRODUCT_DETAIL = "/product/design/detail",
    /** 查询用户已购买的设计作品商品列表 */
    GET_PURCHASED_DESIGN_PRODUCTS = "/product/design/purchased",
}

/**
 * 设计作品状态枚举
 */
export enum DesignState {
    /** 草稿 */
    DRAFT = "DRAFT",
    /** 待审核 */
    PENDING = "PENDING",
    /** 审核通过 */
    APPROVED = "APPROVED",
    /** 拒绝 */
    REJECTED = "REJECTED",
    /** 买断 */
    BOUGHT_OUT = "BOUGHT_OUT"
}

/**
 * SKU 信息
 */
export interface SkuInfo {
    /** SKU ID */
    id: number
    /** 所属商品ID */
    productId: number
    /** SKU名称 */
    name: string
    /** 售价 */
    price: number
    /** 原价 */
    originalPrice?: number
    /** 库存数量 */
    stock: number
    /** 商品编码 */
    code?: string
    /** SKU属性 */
    attributes: Record<string, any>
    /** 是否启用 */
    isEnabled: boolean
    /** 重量 */
    weight?: number
    /** 创建时间 */
    createdAt?: string
    /** 更新时间 */
    updatedAt?: string
}

/**
 * 产品信息（包含 SKU 列表）
 */
export interface ProductWithSkusInfo {
    /** 商品ID */
    id: number
    /** 商品名称 */
    name: string
    /** 商品副标题 */
    subtitle?: string
    /** 商品封面图URL */
    coverImage: string
    /** 商品图片列表 */
    imageUrls: string[]
    /** 商品视频URL */
    videoUrl?: string
    /** 商品简介 */
    description?: string
    /** 商品详情富文本 */
    detailHtml?: string
    /** 分类ID */
    categoryId: number
    /** 系列ID */
    seriesId: number
    /** 是否上架 */
    isPublished: boolean
    /** 商品创建者用户ID */
    creatorUserId: number
    /** 设计作品ID */
    designId?: number
    /** 审核状态 */
    checkState: string
    /** 审核拒绝原因 */
    checkReason?: string
    /** 审核管理员ID */
    checkerUserId?: number
    /** 审核时间 */
    checkedAt?: string
    /** 排序值 */
    sort: number
    /** 商品标签列表 */
    tags: string[]
    /** 商品类型 */
    productType: string
    /** 创建时间 */
    createdAt?: string
    /** 更新时间 */
    updatedAt?: string
    /** SKU列表 */
    skus: SkuInfo[]
}

/**
 * 设计作品商品信息
 */
export interface DesignProductInfo {
    /** 设计作品ID */
    id: number
    /** 作品标题 */
    title: string
    /** 作品描述 */
    description?: string
    /** 作品详情（富文本） */
    detail?: string
    /** 所属类目ID */
    categoryId?: number
    /** 所属系列ID */
    seriesId?: number
    /** 所属产品ID */
    productId?: number
    /** 作品标签列表 */
    tags: any[]
    /** 作品高清展示图片数组 */
    images: string[]
    /** 作品状态 */
    state: DesignState
    /** 是否为公司自营设计 */
    isOfficial: boolean
    /** 是否删除 */
    isDeleted: string
}

/**
 * 设计作品详细信息
 */
export interface DesignInfo {
    /** 设计作品ID */
    id: number
    /** 创建时间 */
    createdAt: string
    /** 更新时间 */
    updatedAt: string
    /** 用户ID */
    userId: number
    /** 作品标题 */
    title: string
    /** 作品描述 */
    description: string
    /** 作品详情（富文本） */
    detail?: string
    /** 所属类目ID */
    categoryId: number
    /** 所属系列ID */
    seriesId: number
    /** 所属产品ID */
    productId: number
    /** 作品标签列表 */
    tags: string[]
    /** 作品高清展示图片数组 */
    images: string[]
    /** 是否为公司自营设计 (0:否, 1:是) */
    isOfficial: string
    /** 3D模型URL */
    model3DUrl: string
    /** 资源URL */
    resourceUrl?: string
    /** 作品状态 */
    state: DesignState | string
    /** 是否删除 (0:否, 1:是) */
    isDeleted: string
    /** 是否原本有资源URL（用于判断是否显示组件） */
    hasResourceUrl?: boolean
    /** 是否原本有详情（用于判断是否显示组件） */
    hasDetail?: boolean
}

/**
 * 查询设计作品商品列表 - 请求
 */
export interface QueryDesignProductListReq {
    /** 页码 */
    page?: number
    /** 每页数量 */
    size?: number
    /** 搜索关键词 */
    keyword?: string
    /** 状态 */
    state?: DesignState
}

/**
 * 查看设计作品商品详情 - 请求
 */
export interface GetDesignProductDetailReq {
    /** 设计作品ID */
    designId: number
}

/**
 * 查看设计作品商品详情 - 响应
 */
export interface GetDesignProductDetailRes {
    /**
     * 是否有查看权限
     */
    hasPermission : boolean,
    /** 设计作品信息 */
    design?: DesignInfo
    /** 产品信息（包含SKU） */
    product?: ProductWithSkusInfo
}

/**
 * 用户已购买的设计作品商品项
 */
export interface PurchasedDesignProductItem {
    /** 商品封面图片URL */
    imgUrl?: string
    /** 商品名称 */
    name: string
    /** 商品ID */
    productId?: number
    /** 设计作品ID */
    designId?: number
}

/**
 * 查询用户已购买的设计作品商品列表 - 请求
 */
export interface GetPurchasedDesignProductsReq {
    /** 页码，从 1 开始 */
    page?: number
    /** 每页数量 */
    pageSize?: number
}

/**
 * 前端查询设计作品商品列表
 *
 * 支持分页、关键词搜索、状态筛选
 *
 * @param req - 查询请求参数（分页、关键词、状态）
 * @returns 返回设计作品商品列表（分页数据）
 */
const queryDesignProductList = async (req?: QueryDesignProductListReq): Promise<IBaseResponse<IPageRes<DesignProductInfo>>> => {
    return await http.get<IPageRes<DesignProductInfo>>(DesignProductApiEnum.QUERY_DESIGN_PRODUCT_LIST, {params: req})
}

/**
 * 前端查看设计作品商品详情
 *
 * 根据设计作品ID获取完整的设计作品和商品信息
 *
 * @param req - 详情请求参数（设计作品ID）
 * @returns 返回设计作品商品详情（包含设计作品和产品信息）
 */
const getDesignProductDetail = async (req: GetDesignProductDetailReq): Promise<IBaseResponse<GetDesignProductDetailRes>> => {
    return await http.get<GetDesignProductDetailRes>(DesignProductApiEnum.GET_DESIGN_PRODUCT_DETAIL, {...req})
}

/**
 * 查询用户已购买的设计作品商品列表
 *
 * 获取当前用户已购买的所有设计作品商品列表（分页查询）
 *
 * @param req - 查询请求参数（分页参数：page, pageSize）
 * @returns 返回用户已购买的设计作品商品列表（分页数据）
 */
const getPurchasedDesignProducts = async (req?: GetPurchasedDesignProductsReq): Promise<IBaseResponse<IPageRes<PurchasedDesignProductItem>>> => {
    return await http.get<IPageRes<PurchasedDesignProductItem>>(DesignProductApiEnum.GET_PURCHASED_DESIGN_PRODUCTS, {params: req})
}

/**
 * 设计作品商品 API 接口集合
 */
export default {
    /** 前端查询设计作品商品列表 */
    queryDesignProductList,
    /** 前端查看设计作品商品详情 */
    getDesignProductDetail,
    /** 查询用户已购买的设计作品商品列表 */
    getPurchasedDesignProducts
}

