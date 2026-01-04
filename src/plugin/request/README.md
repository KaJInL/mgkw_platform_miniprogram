# 请求适配层说明

## 概述

由于微信小程序环境不支持标准的 axios（不支持 xhr、http 和 fetch adapter），本项目使用基于 `uni.request` 的自定义实现，但保持了与 axios 相似的 API 接口，确保调用方式简单一致。

## 主要特性

### 1. 统一的请求接口
- `get<T>(url, params)` - GET 请求
- `post<T>(url, data, params)` - POST 请求  
- `upload<T>(url, filePath, name, formData)` - 文件上传

### 2. 自动请求拦截
- 自动添加 Authorization token（从 localStorage 读取）
- 支持自定义请求头

### 3. 统一的响应处理
- HTTP 状态码错误处理（401、403、500 等）
- 业务错误码统一处理（通过 errorCodeHandler）
- 自动弹窗提示错误信息

### 4. 兼容性
支持两种参数传递方式：
```typescript
// 方式1: 直接传参数对象
http.get('/api/user', { id: 1 })

// 方式2: 传配置对象
http.get('/api/user', { params: { id: 1 } })
```

## 使用示例

```typescript
import { http } from '@/plugin/request'

// GET 请求
const userInfo = await http.get<UserInfo>('/api/user/info')

// POST 请求
const result = await http.post<LoginRes>('/api/login', {
  username: 'admin',
  password: '123456'
})

// 文件上传
const uploadResult = await http.upload<UploadRes>(
  '/api/upload',
  tempFilePath,  // uni.chooseImage 返回的临时文件路径
  'file',        // 文件字段名
  { type: 'avatar' }  // 额外的表单数据
)
```

## 实现细节

### uni.request 适配
- 将 axios 的配置转换为 uni.request 的参数格式
- `params` → URL query string
- `data` → request body
- `headers` → `header`（注意 uni.request 使用单数形式）

### 文件上传适配
使用 `uni.uploadFile` 实现文件上传功能，而不是 axios 的 FormData 方式。

### 错误处理
- 网络错误：自动弹窗提示
- HTTP 错误：根据状态码统一处理
- 业务错误：通过 errorCodeHandler 处理业务错误码

## 迁移说明

从原 axios 迁移到本实现无需修改调用代码，API 完全兼容。唯一的区别是：
- `upload` 方法参数从 `FormData` 改为微信小程序的文件路径
- 响应数据直接返回 `data`，无需再访问 `response.data`

## 注意事项

1. **uni.request 限制**
   - 请求头字段名不区分大小写
   - content-type 默认为 `application/json`
   - 并发请求数有限制（默认最多 10 个）

2. **文件上传**
   - 必须使用微信小程序的临时文件路径
   - 不支持 Blob 或 File 对象
   - 单次只能上传一个文件

3. **超时设置**
   - 默认超时时间为 60 秒
   - 可在初始化时自定义：`new Axios({ timeout: 30000 })`

