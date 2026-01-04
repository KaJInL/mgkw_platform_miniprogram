// 错误码处理

import type { IBaseResponse } from "@/common/apis/base/res";
import localStorageHelper from "@/common/helper/localStorageHelper";
import { ErrorCode } from "@/common/constants/ErrorCodeEnum";

/**
 * 标记是否正在处理认证错误（防止重复跳转）
 */
let isHandlingAuthError = false;

/**
 * 显示提示信息（适配 uni-app）
 */
function showToast(message: string, type: 'success' | 'error' | 'none' = 'none') {
    uni.showToast({
        title: message,
        icon: type === 'success' ? 'success' : type === 'error' ? 'none' : 'none',
        duration: 2000
    })
}

/**
 * 处理错误码
 * @param res 响应数据
 * @param autoHandleAuth 是否自动处理认证错误（未登录/登录过期），默认为 true
 */
function handlerCodeError(res: IBaseResponse<any>, autoHandleAuth: boolean = true) {
    const code = String(res.code);
    
    switch (code) {
        case ErrorCode.SUCCESS:
            // 成功，不需要处理
            break;
            
        case ErrorCode.UNAUTHORIZED:
        case ErrorCode.TOKEN_EXPIRED:
        case ErrorCode.TOKEN_INVALID:
            // 如果需要自动处理认证错误
            if (autoHandleAuth) {
                // 如果正在处理认证错误，避免重复处理
                if (isHandlingAuthError) return;
                isHandlingAuthError = true;
                showToast('登录失效，请重新登录', 'error');
                localStorageHelper.removeToken();
                setTimeout(() => {
                    // uni-app 跳转到登录页
                    uni.navigateTo({
                        url: '/pages/login/index' // 根据实际登录页路径修改
                    }).finally(() => {
                        setTimeout(() => {
                            isHandlingAuthError = false;
                        }, 2000);
                    });
                }, 1000);
            }
            break;
            
        case ErrorCode.PARAM_EMPTY:
            showToast(res.message || '参数校验错误', 'error');
            break;
            
        case ErrorCode.SHOW_MESSAGE:
            showToast(res.message, 'none');
            break;
            
        case ErrorCode.DATA_DUPLICATE:
            showToast(res.message || '数据重复', 'error');
            break;
            
        case ErrorCode.METHOD_NOT_ALLOWED:
            showToast(res.message || '请求方法不支持', 'error');
            break;
            
        case ErrorCode.FILE_TYPE_NOT_SUPPORTED:
            showToast(res.message || '文件类型不支持', 'error');
            break;
            
        case ErrorCode.FORBIDDEN:
            showToast(res.message || '没有权限执行该操作', 'error');
            break;
            
        case ErrorCode.ERROR:
        default:
            // 默认错误处理
            showToast(res.message || '操作失败', 'error');
            break;
    }
}

export default { handlerCodeError }

