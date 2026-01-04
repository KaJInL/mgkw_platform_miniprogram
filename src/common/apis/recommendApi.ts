import type {IBaseResponse, IListRes} from "@/common/apis/base/res";
import {http} from "@/plugin/request";

enum RecommendApiEnum {
    GET_RECOMMEND_LIST = "/recommend/list",

}

export interface RecommendItem {
    /** 标题 */
    title: string;

    /** 副标题 */
    subTitle: string;

    /** 视频URL */
    videoUrl: string;

    /** 图片URL */
    designImageUrl: string;

    /** 类型 */
    type: string;

    /** 设计产品ID */
    designProductId: number;
}

const getRecommendList = async (): Promise<IBaseResponse<IListRes<RecommendItem>>> => {
    return await http.get<IListRes<RecommendItem>>(RecommendApiEnum.GET_RECOMMEND_LIST)
}

export { getRecommendList }