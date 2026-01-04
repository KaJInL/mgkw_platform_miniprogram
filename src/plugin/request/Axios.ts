import localStorageHelper from "@/common/helper/localStorageHelper";
import errorCodeHandler from "@/plugin/request/errorCodeHandler";
import type {IBaseResponse} from "@/common/apis/base/res";

/**
 * 请求配置接口
 */
interface RequestConfig {
    baseURL?: string
    timeout?: number
    headers?: Record<string, any>
}

/**
 * 请求选项接口
 */
interface RequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'get' | 'post' | 'put' | 'delete'
    data?: any
    params?: any
    headers?: Record<string, any>
    autoHandleAuth?: boolean  // 是否自动处理认证错误，默认为 true
}

export default class Axios {
    private baseURL: string
    private timeout: number
    private defaultHeaders: Record<string, any>

    constructor(config: RequestConfig) {
        this.baseURL = config.baseURL || ''
        this.timeout = config.timeout || 60000
        this.defaultHeaders = config.headers || {}
    }

    /**
     * 处理 URL 参数
     */
    private buildUrl(url: string, params?: any): string {
        let fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`
        
        if (params && Object.keys(params).length > 0) {
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&')
            fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
        }
        
        return fullUrl
    }

    /**
     * 核心请求方法
     */
    public async request<T, D = IBaseResponse<T>>(config: RequestOptions): Promise<D> {
        return new Promise(async (resolve, reject) => {
            try {
                // 获取是否自动处理认证错误的配置，默认为 true
                const autoHandleAuth = config.autoHandleAuth !== undefined ? config.autoHandleAuth : true
                
                // 添加认证token
                const token = localStorageHelper.getToken()
                const headers = {
                    ...this.defaultHeaders,
                    ...config.headers
                }
                
                if (token) {
                    headers.Authorization = token
                }

                // 构建完整URL
                const url = this.buildUrl(config.url, config.params)
                
                // 发起请求
                uni.request({
                    url,
                    method: (config.method?.toUpperCase() || 'GET') as any,
                    data: config.data,
                    header: headers,
                    timeout: this.timeout,
                    success: (res: any) => {
                        const statusCode = res.statusCode
                        
                        // 处理 HTTP 错误
                        if (statusCode === 401) {
                            errorCodeHandler.handlerCodeError({
                                code: 40100,
                                message: '用户未登录',
                                isSuccess: false,
                                data: null
                            }, autoHandleAuth)
                            reject(new Error('Unauthorized'))
                            return
                        } else if (statusCode === 403) {
                            errorCodeHandler.handlerCodeError({
                                code: 40300,
                                message: '没有权限访问',
                                isSuccess: false,
                                data: null
                            }, autoHandleAuth)
                            reject(new Error('Forbidden'))
                            return
                        } else if (statusCode >= 500) {
                            errorCodeHandler.handlerCodeError({
                                code: 40000,
                                message: '服务器错误，请稍后重试',
                                isSuccess: false,
                                data: null
                            }, autoHandleAuth)
                            reject(new Error('Server Error'))
                            return
                        } else if (statusCode >= 400) {
                            errorCodeHandler.handlerCodeError({
                                code: 40000,
                                message: res.data?.message || '请求失败',
                                isSuccess: false,
                                data: null
                            }, autoHandleAuth)
                            reject(new Error(res.data?.message || 'Request Error'))
                            return
                        }
                        
                        // 处理业务错误
                        if (res.data && !res.data.isSuccess) {
                            errorCodeHandler.handlerCodeError(res.data, autoHandleAuth)
                        }
                        
                        resolve(res.data as D)
                    },
                    fail: (err: any) => {
                        console.error('Request failed:', err)
                        
                        // 处理网络错误
                        let errorMessage = '网络请求失败'
                        if (err.errMsg) {
                            if (err.errMsg.includes('timeout')) {
                                errorMessage = '请求超时'
                            } else if (err.errMsg.includes('fail')) {
                                errorMessage = '网络连接失败'
                            }
                        }
                        
                        errorCodeHandler.handlerCodeError({
                            code: 40000,
                            message: errorMessage,
                            isSuccess: false,
                            data: null
                        }, true)  // 网络错误默认自动处理
                        
                        reject(err)
                    }
                })
            } catch (error) {
                console.error('Request error:', error)
                reject(error)
            }
        })
    }

    public async get<T>(url: string, data: any = {}, autoHandleAuth: boolean = true) {
        // 兼容两种调用方式：
        // 1. http.get(url, {params: {...}}) - 传入配置对象
        // 2. http.get(url, {...}) - 直接传入参数
        const params = data?.params !== undefined ? data.params : data
        
        return this.request<T>({
            url: url,
            params: params,
            method: 'get',
            autoHandleAuth: autoHandleAuth
        })
    }

    public async post<T>(url: string, data: any = {}, params: any = {}, autoHandleAuth: boolean = true) {
        return this.request<T>({
            url: url,
            data,
            params,
            method: 'post',
            autoHandleAuth: autoHandleAuth
        })
    }

    public async upload<T>(url: string, filePath: string, name: string = 'file', formData?: any, autoHandleAuth: boolean = true) {
        return new Promise<IBaseResponse<T>>(async (resolve, reject) => {
            try {
                // 添加认证token
                const token = localStorageHelper.getToken()
                const headers: Record<string, any> = {
                    ...this.defaultHeaders
                }
                
                if (token) {
                    headers.Authorization = token
                }

                // 构建完整URL
                const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`
                
                // 使用 uni.uploadFile
                uni.uploadFile({
                    url: fullUrl,
                    filePath,
                    name,
                    formData,
                    header: headers,
                    success: (res: any) => {
                        const statusCode = res.statusCode
                        
                        if (statusCode >= 200 && statusCode < 300) {
                            let data
                            try {
                                data = JSON.parse(res.data)
                            } catch (e) {
                                data = res.data
                            }
                            
                            if (data && !data.isSuccess) {
                                errorCodeHandler.handlerCodeError(data, autoHandleAuth)
                            }
                            
                            resolve(data)
                        } else {
                            errorCodeHandler.handlerCodeError({
                                code: 40000,
                                message: '上传失败',
                                isSuccess: false,
                                data: null
                            }, autoHandleAuth)
                            reject(new Error('Upload failed'))
                        }
                    },
                    fail: (err: any) => {
                        console.error('Upload failed:', err)
                        errorCodeHandler.handlerCodeError({
                            code: 40000,
                            message: '上传失败',
                            isSuccess: false,
                            data: null
                        }, autoHandleAuth)
                        reject(err)
                    }
                })
            } catch (error) {
                console.error('Upload error:', error)
                reject(error)
            }
        }) as Promise<IBaseResponse<T>>
    }
}
