/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // 适配 uni-app 的 rpx 单位
      spacing: {
        // 将 Tailwind 的默认单位转换为 rpx
        // 例如: w-4 = 32rpx, w-8 = 64rpx
      },
    },
  },
  plugins: [],
  corePlugins: {
    // uni-app 中建议禁用 preflight，避免与 uni-app 默认样式冲突
    preflight: false,
  },
  // 重要：uni-app 中需要配置 important，确保样式优先级
  important: true,
}
