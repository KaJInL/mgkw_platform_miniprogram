// 错误码处理

import type { IBaseResponse } from "@/common/apis/base/res";
import localStorageHelper from "@/common/helper/localStorageHelper";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { ErrorCode } from "@/common/constants/ErrorCodeEnum";

/**
 * 标记是否正在处理认证错误（防止重复跳转）
 */
let isHandlingAuthError = false;

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
                miniPromptHelper.fail("登录失效，请重新登录");
                localStorageHelper.removeToken();
                setTimeout(() => {
                    // uni-app 跳转到登录页
                    uni.navigateTo({
                        url: "/pages/login/index",
                    }).finally(() => {
                        setTimeout(() => {
                            isHandlingAuthError = false;
                        }, 2000);
                    });
                }, 1000);
            }
            break;
            
        case ErrorCode.PARAM_EMPTY:
            miniPromptHelper.fail(res.message || "参数校验错误");
            break;
            
        case ErrorCode.SHOW_MESSAGE:
            miniPromptHelper.info(res.message || "提示信息");
            break;
            
        case ErrorCode.DATA_DUPLICATE:
            miniPromptHelper.fail(res.message || "数据重复");
            break;
            
        case ErrorCode.METHOD_NOT_ALLOWED:
            miniPromptHelper.fail(res.message || "请求方法不支持");
            break;
            
        case ErrorCode.FILE_TYPE_NOT_SUPPORTED:
            miniPromptHelper.fail(res.message || "文件类型不支持");
            break;
            
        case ErrorCode.FORBIDDEN:
            miniPromptHelper.fail(res.message || "没有权限执行该操作");
            break;
            
        case ErrorCode.ERROR:
        default:
            // 默认错误处理
            miniPromptHelper.fail(res.message || "操作失败");
            break;
    }
}

export default { handlerCodeError }
