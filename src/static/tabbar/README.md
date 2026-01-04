# TabBar 图标说明

此目录用于存放底部导航栏（TabBar）的图标文件。

## 需要的图标文件

请准备以下图标文件（建议尺寸：81px × 81px）：

1. **home.png** / **home-active.png** - 首页图标（未选中/选中状态）
2. **category.png** / **category-active.png** - 分类图标（未选中/选中状态）
3. **design.png** / **design-active.png** - 设计图标（未选中/选中状态）
4. **user.png** / **user-active.png** - 我的图标（未选中/选中状态）

## 图标要求

- 格式：PNG
- 尺寸：建议 81px × 81px（小程序官方推荐）
- 背景：透明
- 颜色：未选中状态建议使用灰色，选中状态使用主题色

## 图标资源推荐

可以使用以下工具或网站获取图标：
- IconFont（阿里巴巴图标库）：https://www.iconfont.cn/
- Icons8：https://icons8.com/
- Flaticon：https://www.flaticon.com/

添加图标文件后，请在 `pages.json` 中取消注释 `tabBar` 配置。


