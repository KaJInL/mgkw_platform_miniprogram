import {defineStore} from "pinia";
import {ref} from "vue";
import categoryApi from "@/common/apis/categoryApi";
import localStorageHelper from "@/common/helper/localStorageHelper";
import type {
    CategoryInfo,
    CategoryTreeNode,
    SeriesInfo,
    SeriesTreeNode,
    QueryCategoryListReq,
    GetCategoryTreeReq,
    QuerySeriesListReq,
    GetSeriesTreeReq
} from "@/common/apis/categoryApi";

/**
 * 分类和系列状态管理 Store
 * 用于管理分类和系列数据的加载与缓存
 */
export const useCategoryStore = defineStore("category", () => {
    
    // ==================== 状态 ====================
    
    /** 分类列表数据 */
    const categoryList = ref<CategoryInfo[]>([]);
    
    /** 分类树数据 */
    const categoryTree = ref<CategoryTreeNode[]>([]);
    
    /** 系列列表数据 */
    const seriesList = ref<SeriesInfo[]>([]);
    
    /** 系列树数据 */
    const seriesTree = ref<SeriesTreeNode[]>([]);
    
    /** 是否正在加载分类列表 */
    const loadingCategoryList = ref(false);
    
    /** 是否正在加载分类树 */
    const loadingCategoryTree = ref(false);
    
    /** 是否正在加载系列列表 */
    const loadingSeriesList = ref(false);
    
    /** 是否正在加载系列树 */
    const loadingSeriesTree = ref(false);
    
    /** 分类列表加载错误 */
    const categoryListError = ref<string | null>(null);
    
    /** 分类树加载错误 */
    const categoryTreeError = ref<string | null>(null);
    
    /** 系列列表加载错误 */
    const seriesListError = ref<string | null>(null);
    
    /** 系列树加载错误 */
    const seriesTreeError = ref<string | null>(null);
    
    
    // ==================== 分类相关方法 ====================
    
    /**
     * 获取分类列表
     * @param req 查询参数（关键词、父级ID）
     * @param forceRefresh 是否强制刷新（忽略缓存）
     * @returns 分类列表
     */
    const getCategoryList = async (req?: QueryCategoryListReq, forceRefresh: boolean = false): Promise<CategoryInfo[] | null> => {
        loadingCategoryList.value = true;
        categoryListError.value = null;
        
        try {
            // 如果不强制刷新且没有查询条件，先尝试从缓存加载
            if (!forceRefresh && !req?.keyword && !req?.parentId) {
                const cached = localStorageHelper.getCategoryList();
                if (cached && cached.length > 0) {
                    categoryList.value = cached;
                    loadingCategoryList.value = false;
                    return cached;
                }
            }
            
            const response = await categoryApi.getCategoryList(req);
            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                categoryListError.value = response.message || '获取分类列表失败';
                return null;
            }
            
            // 处理成功情况
            categoryList.value = response.data.list;
            // 如果没有查询条件，保存到缓存
            if (!req?.keyword && !req?.parentId) {
                localStorageHelper.setCategoryList(response.data.list);
            }
            
            return response.data.list;
        } catch (error: any) {
            categoryListError.value = error.message || '获取分类列表失败';
            console.error('获取分类列表失败:', error);
            return null;
        } finally {
            loadingCategoryList.value = false;
        }
    };
    
    /**
     * 获取分类树
     * @param req 查询参数（父级ID、最大深度）
     * @param forceRefresh 是否强制刷新（忽略缓存）
     * @returns 分类树列表
     */
    const getCategoryTree = async (req?: GetCategoryTreeReq, forceRefresh: boolean = false): Promise<CategoryTreeNode[] | null> => {
        loadingCategoryTree.value = true;
        categoryTreeError.value = null;
        
        try {
            // 如果不强制刷新且没有查询条件，先尝试从缓存加载
            if (!forceRefresh && !req?.parentId && !req?.maxDepth) {
                const cached = localStorageHelper.getCategoryTree();
                if (cached && cached.length > 0) {
                    categoryTree.value = cached;
                    loadingCategoryTree.value = false;
                    return cached;
                }
            }
            
            const response = await categoryApi.getCategoryTree(req);
            
            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                categoryTreeError.value = response.message || '获取分类树失败';
                return null;
            }
            
            // 处理成功情况
            categoryTree.value = response.data;
            
            // 如果没有查询条件，保存到缓存
            if (!req?.parentId && !req?.maxDepth) {
                localStorageHelper.setCategoryTree(response.data);
            }
            
            return response.data;
        } catch (error: any) {
            categoryTreeError.value = error.message || '获取分类树失败';
            console.error('获取分类树失败:', error);
            return null;
        } finally {
            loadingCategoryTree.value = false;
        }
    };
    
    /**
     * 清除分类列表数据
     */
    const clearCategoryList = () => {
        categoryList.value = [];
        categoryListError.value = null;
    };
    
    /**
     * 清除分类树数据
     */
    const clearCategoryTree = () => {
        categoryTree.value = [];
        categoryTreeError.value = null;
    };
    
    
    // ==================== 系列相关方法 ====================
    
    /**
     * 获取系列列表
     * @param req 查询参数（关键词、父级ID）
     * @param forceRefresh 是否强制刷新（忽略缓存）
     * @returns 系列列表
     */
    const getSeriesList = async (req?: QuerySeriesListReq, forceRefresh: boolean = false): Promise<SeriesInfo[] | null> => {
        loadingSeriesList.value = true;
        seriesListError.value = null;
        
        try {
            // 如果不强制刷新且没有查询条件，先尝试从缓存加载
            if (!forceRefresh && !req?.keyword && !req?.parentId) {
                const cached = localStorageHelper.getSeriesList();
                if (cached && cached.length > 0) {
                    seriesList.value = cached;
                    loadingSeriesList.value = false;
                    return cached;
                }
            }
            
            const response = await categoryApi.getSeriesList(req);
            
            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                seriesListError.value = response.message || '获取系列列表失败';
                return null;
            }
            
            // 处理成功情况
            seriesList.value = response.data.list;
            
            // 如果没有查询条件，保存到缓存
            if (!req?.keyword && !req?.parentId) {
                localStorageHelper.setSeriesList(response.data.list);
            }
            
            return response.data.list;
        } catch (error: any) {
            seriesListError.value = error.message || '获取系列列表失败';
            console.error('获取系列列表失败:', error);
            return null;
        } finally {
            loadingSeriesList.value = false;
        }
    };
    
    /**
     * 获取系列树
     * @param req 查询参数（父级ID、最大深度）
     * @param forceRefresh 是否强制刷新（忽略缓存）
     * @returns 系列树列表
     */
    const getSeriesTree = async (req?: GetSeriesTreeReq, forceRefresh: boolean = false): Promise<SeriesTreeNode[] | null> => {
        loadingSeriesTree.value = true;
        seriesTreeError.value = null;
        
        try {
            // 如果不强制刷新且没有查询条件，先尝试从缓存加载
            if (!forceRefresh && !req?.parentId && !req?.maxDepth) {
                const cached = localStorageHelper.getSeriesTree();
                if (cached && cached.length > 0) {
                    seriesTree.value = cached;
                    loadingSeriesTree.value = false;
                    return cached;
                }
            }
            
            const response = await categoryApi.getSeriesTree(req);
            
            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                seriesTreeError.value = response.message || '获取系列树失败';
                return null;
            }
            
            // 处理成功情况
            seriesTree.value = response.data;
            
            // 如果没有查询条件，保存到缓存
            if (!req?.parentId && !req?.maxDepth) {
                localStorageHelper.setSeriesTree(response.data);
            }
            
            return response.data;
        } catch (error: any) {
            seriesTreeError.value = error.message || '获取系列树失败';
            console.error('获取系列树失败:', error);
            return null;
        } finally {
            loadingSeriesTree.value = false;
        }
    };
    
    /**
     * 清除系列列表数据
     */
    const clearSeriesList = () => {
        seriesList.value = [];
        seriesListError.value = null;
    };
    
    /**
     * 清除系列树数据
     */
    const clearSeriesTree = () => {
        seriesTree.value = [];
        seriesTreeError.value = null;
    };
    
    /**
     * 清除所有数据
     */
    const clearAll = () => {
        clearCategoryList();
        clearCategoryTree();
        clearSeriesList();
        clearSeriesTree();
    };
    
    /**
     * 初始化数据
     * 小程序启动时调用，优先从缓存加载，然后在后台刷新数据
     */
    const initData = async () => {
        // 先从缓存加载数据到 store
        const cachedCategoryList = localStorageHelper.getCategoryList();
        const cachedCategoryTree = localStorageHelper.getCategoryTree();
        const cachedSeriesList = localStorageHelper.getSeriesList();
        const cachedSeriesTree = localStorageHelper.getSeriesTree();
        
        if (cachedCategoryList) {
            categoryList.value = cachedCategoryList;
        }
        if (cachedCategoryTree) {
            categoryTree.value = cachedCategoryTree;
        }
        if (cachedSeriesList) {
            seriesList.value = cachedSeriesList;
        }
        if (cachedSeriesTree) {
            seriesTree.value = cachedSeriesTree;
        }
        
        // 后台静默刷新所有数据（不显示 loading）
        Promise.all([
            getCategoryList(undefined, true),
            getCategoryTree(undefined, true),
            getSeriesList(undefined, true),
            getSeriesTree(undefined, true)
        ]).catch(error => {
            console.error('后台刷新分类数据失败:', error);
        });
    };
    
    
    return {
        // 分类状态
        categoryList,
        categoryTree,
        loadingCategoryList,
        loadingCategoryTree,
        categoryListError,
        categoryTreeError,
        
        // 系列状态
        seriesList,
        seriesTree,
        loadingSeriesList,
        loadingSeriesTree,
        seriesListError,
        seriesTreeError,
        
        // 分类方法
        getCategoryList,
        getCategoryTree,
        clearCategoryList,
        clearCategoryTree,
        
        // 系列方法
        getSeriesList,
        getSeriesTree,
        clearSeriesList,
        clearSeriesTree,
        
        // 通用方法
        clearAll,
        initData,
    };
});

