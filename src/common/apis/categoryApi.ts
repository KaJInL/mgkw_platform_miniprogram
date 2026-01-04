/**
 * 分类和系列相关 API 模块
 * 
 * 提供分类和系列管理相关的接口，包括：
 * - 分类列表查询
 * - 分类树获取
 * - 系列列表查询
 * - 系列树获取
 */
import {http} from "@/plugin/request";
import type {IBaseResponse, IListRes} from "@/common/apis/base/res";

/**
 * 分类系列 API 路径枚举
 */
enum CategoryApiEnum {
    /** 获取分类列表 */
    GET_CATEGORY_LIST = "/category/list",
    /** 获取分类树 */
    GET_CATEGORY_TREE = "/category/tree",
    /** 获取系列列表 */
    GET_SERIES_LIST = "/series/list",
    /** 获取系列树 */
    GET_SERIES_TREE = "/series/tree",
}

/**
 * 分类信息
 */
export interface CategoryInfo {
    /** 分类ID */
    id: number
    /** 分类名称 */
    name: string
    /** 父级分类ID */
    parentId?: number
    /** 顶级父分类ID */
    topParentId?: number
    /** 创建时间 */
    createdAt: string
    /** 更新时间 */
    updatedAt: string
}

/**
 * 分类树节点
 */
export interface CategoryTreeNode {
    /** 分类ID */
    id: number
    /** 分类名称 */
    name: string
    /** 父级分类ID */
    parentId?: number
    /** 顶级父分类ID */
    topParentId?: number
    /** 子分类列表 */
    children: CategoryTreeNode[]
    /** 创建时间 */
    createdAt: string
    /** 更新时间 */
    updatedAt: string
}

/**
 * 系列信息
 */
export interface SeriesInfo {
    /** 系列ID */
    id: number
    /** 系列名称 */
    name: string
    /** 父级系列ID */
    parentId?: number
    /** 顶级父系列ID */
    topParentId?: number
    /** 创建时间 */
    createdAt: string
    /** 更新时间 */
    updatedAt: string
}

/**
 * 系列树节点
 */
export interface SeriesTreeNode {
    /** 系列ID */
    id: number
    /** 系列名称 */
    name: string
    /** 父级系列ID */
    parentId?: number
    /** 顶级父系列ID */
    topParentId?: number
    /** 子系列列表 */
    children: SeriesTreeNode[]
    /** 创建时间 */
    createdAt: string
    /** 更新时间 */
    updatedAt: string
}

/**
 * 查询分类列表 - 请求
 */
export interface QueryCategoryListReq {
    /** 搜索关键词（分类名称） */
    keyword?: string
    /** 父级分类ID */
    parentId?: number
}

/**
 * 获取分类树 - 请求
 */
export interface GetCategoryTreeReq {
    /** 父级分类ID，不传则获取完整树 */
    parentId?: number
    /** 最大深度限制 */
    maxDepth?: number
}

/**
 * 查询系列列表 - 请求
 */
export interface QuerySeriesListReq {
    /** 搜索关键词（系列名称） */
    keyword?: string
    /** 父级系列ID */
    parentId?: number
}

/**
 * 获取系列树 - 请求
 */
export interface GetSeriesTreeReq {
    /** 父级系列ID，不传则获取完整树 */
    parentId?: number
    /** 最大深度限制 */
    maxDepth?: number
}

/**
 * 获取分类列表
 * 
 * 获取分类列表，支持关键词搜索（分类名称）和父级分类筛选
 * 
 * @param req - 查询请求参数（关键词、父级ID）
 * @returns 返回分类列表
 */
const getCategoryList = async (req?: QueryCategoryListReq): Promise<IBaseResponse<IListRes<CategoryInfo>>> => {
    return await http.get<IListRes<CategoryInfo>>(CategoryApiEnum.GET_CATEGORY_LIST, {params: req})
}

/**
 * 获取分类树
 * 
 * 获取树形结构的分类列表，支持指定父级和深度限制（带缓存）
 * 
 * @param req - 查询请求参数（父级ID、最大深度）
 * @returns 返回分类树列表
 */
const getCategoryTree = async (req?: GetCategoryTreeReq): Promise<IBaseResponse<CategoryTreeNode[]>> => {
    return await http.get<CategoryTreeNode[]>(CategoryApiEnum.GET_CATEGORY_TREE, {params: req})
}

/**
 * 获取系列列表
 * 
 * 获取系列列表，支持关键词搜索（系列名称）和父级系列筛选
 * 
 * @param req - 查询请求参数（关键词、父级ID）
 * @returns 返回系列列表
 */
const getSeriesList = async (req?: QuerySeriesListReq): Promise<IBaseResponse<IListRes<SeriesInfo>>> => {
    return await http.get<IListRes<SeriesInfo>>(CategoryApiEnum.GET_SERIES_LIST, {params: req})
}

/**
 * 获取系列树
 * 
 * 获取树形结构的系列列表，支持指定父级和深度限制（带缓存）
 * 
 * @param req - 查询请求参数（父级ID、最大深度）
 * @returns 返回系列树列表
 */
const getSeriesTree = async (req?: GetSeriesTreeReq): Promise<IBaseResponse<SeriesTreeNode[]>> => {
    return await http.get<SeriesTreeNode[]>(CategoryApiEnum.GET_SERIES_TREE, {params: req})
}

/**
 * 分类系列 API 接口集合
 */
export default {
    /** 获取分类列表 */
    getCategoryList,
    /** 获取分类树 */
    getCategoryTree,
    /** 获取系列列表 */
    getSeriesList,
    /** 获取系列树 */
    getSeriesTree
}

