<template>
  <view class="p-6 bg-gray-50 min-h-screen">
    <view class="mb-8 mt-4 text-center">
      <view class="text-2xl font-serif text-gray-900 tracking-widest uppercase" style="font-family: 'Times New Roman', serif;">Heritage Palette</view>
      <view class="text-xs text-gray-400 mt-2 tracking-[0.3em] uppercase">Luxury Traditional Selection</view>
    </view>

    <!-- 3列布局 -->
    <view class="grid grid-cols-3 gap-4">
      <view 
        v-for="(color, index) in colors" 
        :key="index"
        class="flex flex-col items-center bg-white shadow-lg overflow-hidden transition-all duration-300 transform hover:scale-105"
        style="border-radius: 0;" 
      >
        <!-- 颜色预览块 -->
        <view 
          class="w-full relative"
          :style="{ backgroundColor: color.hex, height: '220rpx', width: '100%' }"
        >
           <!-- 光泽感遮罩 -->
           <view class="absolute inset-0 bg-gradient-to-tr from-black/5 to-white/10"></view>
        </view>
        
        <!-- 颜色信息 -->
        <view class="p-3 w-full text-center bg-white">
          <view class="font-medium text-sm text-gray-900 tracking-widest mb-1">{{ color.name }}</view>
          <view class="text-[10px] text-gray-400 font-mono uppercase tracking-wider scale-90">{{ color.hex }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ColorItem {
  name: string
  hex: string
  desc: string
  category: string
}

// 传统文化奢侈品级配色方案 - 亮色点缀 + 高级底蕴
const colors = ref<ColorItem[]>([
  // 核心主色 - 皇室/尊贵感
  { name: '赤金', hex: '#F2BE45', desc: '鎏金岁月', category: 'gold' },
  { name: '朱红', hex: '#C8161D', desc: '故宫红墙', category: 'red' },
  { name: '玄黑', hex: '#0F0F0F', desc: '深邃高奢', category: 'black' },
  
  // 亮色点缀 - 时尚/活力/高级
  { name: '爱马仕橙', hex: '#FF6F3C', desc: '时尚焦点', category: 'orange' }, // 替换为更亮眼的橙
  { name: '孔雀蓝', hex: '#006C84', desc: '东方奢华', category: 'blue' },
  { name: '宝石绿', hex: '#008E59', desc: '翡翠质感', category: 'green' },

  // 高级灰/背景色 - 莫兰迪/低饱和
  { name: '月光白', hex: '#F5F5F7', desc: '极简底色', category: 'neutral' }, // Apple式高级白
  { name: '岩灰', hex: '#4A4A4A', desc: '现代雅致', category: 'neutral' },
  { name: '云母', hex: '#EBE1D6', desc: '温润珠光', category: 'neutral' },

  // 辅助亮色 - 提亮画面
  { name: '天青冻', hex: '#5AC3BD', desc: '通透灵动', category: 'cyan' }, // 亮青色
  { name: '胭脂粉', hex: '#F08696', desc: '柔美新国潮', category: 'pink' },
  { name: '紫棠', hex: '#574266', desc: '紫气东来', category: 'purple' }, // 深紫显贵

  // 经典搭配
  { name: '景泰蓝', hex: '#1C3E8A', desc: '国宝重器', category: 'blue' },
  { name: '明黄', hex: '#FFD700', desc: '御用尊贵', category: 'yellow' },
  { name: '丹青', hex: '#2E8B57', desc: '青山绿水', category: 'green' }
])
</script>

<style>
/* 基础样式回退，防止Tailwind未生效 */
.grid {
  display: grid;
}
.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.gap-3 {
  gap: 20rpx;
}
</style>

