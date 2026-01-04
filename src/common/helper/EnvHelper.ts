/**
 * 环境变量工具（适配 uni-app）
 * uni-app 中环境变量通过 import.meta.env 访问
 */
export default new class {
    public env = {} as ImportMetaEnv

    constructor() {
        try {
            this.env = this.getEnv()
        } catch (error) {
            console.error('EnvHelper 初始化失败:', error)
            this.env = {} as ImportMetaEnv
        }
    }

    private getEnv(): ImportMetaEnv {
        const envs: any = {}
        // uni-app 中通过 import.meta.env 访问环境变量
        try {
            const env = import.meta.env as Record<string, string>
            if (env) {
                Object.entries(env).forEach(([key, value]) => {
                    if (value == 'true' || value == 'false') {
                        envs[key] = value === 'true'
                    } else if (/^\d+$/.test(value)) {
                        envs[key] = parseInt(value)
                    } else if (value == 'null') {
                        envs[key] = null
                    } else if (value == 'undefined') {
                        envs[key] = undefined
                    } else {
                        envs[key] = value
                    }
                })
            }
        } catch (error) {
            console.warn('读取环境变量失败:', error)
        }
        return envs
    }
}
