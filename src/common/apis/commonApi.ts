import type {IBaseResponse} from "@/common/apis/base/res";
import {http} from "@/plugin/request";

enum CommonApiEnum {
    /** 获取分类列表 */
    GET_CONF_VALUE = "/category/list",
    /** 批量获取配置值 */
    GET_CONF_VALUES = "/conf/values",
    /** 获取小程序配置 */
    GET_MINIPROGRAM_CONF = "/conf/miniprogram",
    /** 文件上传 */
    UPLOAD_FILE = "/common/file/upload",
}

export interface GetConfValueRes {
    value: string
}

export interface GetConfValuesItem {
    key: string
    value: string
}

const getConfValue = async (key: string) :Promise<IBaseResponse<GetConfValueRes>> => {
    return await http.get<GetConfValueRes>(CommonApiEnum.GET_CONF_VALUE, {key})
}

const getConfValues = async (keys: string[]): Promise<IBaseResponse<GetConfValuesItem[]>> => {
    return await http.get<GetConfValuesItem[]>(CommonApiEnum.GET_CONF_VALUES, {keys})
}


const getMiniprogramConf = async (): Promise<IBaseResponse<object>> => {
    return await http.get<object>(CommonApiEnum.GET_MINIPROGRAM_CONF)
}

export interface IUploadRes {
    url: string
}

/**
 * 上传文件
 * @param filePath 文件路径（uni.chooseImage 返回的临时文件路径）
 * @returns 返回上传后的文件URL
 */
const uploadFile = async (filePath: string): Promise<IBaseResponse<IUploadRes>> => {
    return await http.upload<IUploadRes>(CommonApiEnum.UPLOAD_FILE, filePath, 'file')
}

export default {
    getConfValue,
    getConfValues,
    getMiniprogramConf,
    uploadFile
}
