import {reactive} from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

export interface ShareOptions {
    title: string
    path: string
    imageUrl: string
}

const defaultShareOptions: ShareOptions = {
    title: '默认分享标题',
    path: '/pages/index/index',
    imageUrl: '/static/share.png',
}

export function useShare() {
    // 1. 存分享資料
    const state = reactive<ShareOptions>({ ...defaultShareOptions })

    function setUp(options: Partial<ShareOptions>) {
        Object.assign(state, options)
    }

    onShareAppMessage(() => {
        return { ...state }
    })

    onShareTimeline(() => {
        return {
            title: state.title,
            imageUrl: state.imageUrl,
        }
    })

    return {
        setUp,
    }
}
