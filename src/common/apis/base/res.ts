export interface IBaseResponse<T> {
    code: number | string,
    message: string,
    isSuccess?: boolean,
    is_success?: boolean,
    data: T
}

export const isResponseSuccess = <T>(res?: IBaseResponse<T> | null): boolean => {
    if (!res) {
        return false
    }
    return Boolean(res.isSuccess ?? res.is_success)
}

/**
 * 列表数据响应类型
 */
export interface IListRes<T> {
    list: T[]
}

/**
 * 分页响应类型
 */
export interface IPageRes<T> {
    total: number,
    hasNext: boolean,
    list: T[]
}
