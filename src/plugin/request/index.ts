import Axios from "./Axios"
import EnvHelper from "@/common/helper/EnvHelper";

const baseUrl = EnvHelper.env.VITE_API_BASE_URL || ''
const http = new Axios({
    baseURL: baseUrl,
    timeout: 100000,
    headers: {},
})

export {
    http
}
