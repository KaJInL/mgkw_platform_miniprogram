<template>
  <view class="model-3d-viewer" :style="containerStyle">
    <!-- Canvas 容器 -->
    <canvas 
      type="webgl" 
      :id="canvasId" 
      class="webgl-canvas"
      :class="{ 'canvas-hidden': loading }"
      @touchstart.prevent="onTouchStart" 
      @touchmove.prevent="onTouchMove" 
      @touchend="onTouchEnd"
    ></canvas>

    <!-- 操作提示 - 使用 cover-view -->
    <cover-view v-if="!loading && !error && isReady && showHint" class="gesture-hint">
      <cover-view class="hint-text">单指旋转 · 双指缩放</cover-view>
    </cover-view>

    <!-- 渲染质量指示 - 使用 cover-view -->
    <cover-view v-if="!loading && !error && isReady && showQualityBadge" class="quality-badge">
      <cover-view class="quality-text">高清</cover-view>
    </cover-view>

    <!-- 加载状态 - 始终渲染，通过样式控制显隐 -->
    <cover-view class="loading-overlay" :class="{ 'visible': loading }">
      <cover-view class="loader-content">
        <cover-view class="simple-spinner"></cover-view>
        <cover-view class="loading-text">模型资源加载中...</cover-view>
      </cover-view>
    </cover-view>

    <!-- 错误提示 -->
    <cover-view v-if="error" class="error-overlay">
      <cover-view class="error-icon">⚠️</cover-view>
      <cover-view class="error-title">加载失败</cover-view>
      <cover-view class="error-message">{{ error }}</cover-view>
    </cover-view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue'
// @ts-ignore
import { createScopedThreejs } from 'threejs-miniprogram'
// @ts-ignore
import { GLBLoader } from '@/utils/GLBLoader.js'

// Props
interface Props {
  width?: string
  height?: string
  modelUrl?: string
  autoRotate?: boolean
  showHint?: boolean
  showQualityBadge?: boolean
  backgroundColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '400rpx',
  modelUrl: '',
  autoRotate: false,
  showHint: true,
  showQualityBadge: true,
  backgroundColor: '#2a2a2a'
})

// Emits
const emit = defineEmits<{
  ready: []
  loaded: [model: any]
  error: [error: string]
}>()

// 生成唯一的 canvas ID
const canvasId = ref(`webgl-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

// 容器样式对象（不使用 computed，直接使用响应式对象）
const containerStyle = ref({
  width: props.width,
  height: props.height,
  backgroundColor: props.backgroundColor
})

// 监听 props 变化更新样式
watch(() => [props.width, props.height, props.backgroundColor], () => {
  containerStyle.value = {
    width: props.width,
    height: props.height,
    backgroundColor: props.backgroundColor
  }
})

// 状态
const loading = ref(false)
const error = ref('')
const isReady = ref(false)

// Three.js 核心对象
let THREE: any = null
let canvas: any = null
let renderer: any = null
let scene: any = null
let camera: any = null
let currentModel: any = null
let animationId: any = null

// 页面状态
let isComponentActive = true
let isAnimating = false

// 自动旋转相关
let autoRotateEnabled = false
let userHasInteracted = false // 用户是否已经交互过

// 相机控制变量
let isDragging = false
let isZooming = false
let isPanning = false
let previousTouch = { x: 0, y: 0 }
let previousDistance = 0
let previousCenter = { x: 0, y: 0 }
let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 4 }
let cameraDistance = 5
let cameraTarget = { x: 0, y: 0, z: 0 } // 相机观察的目标点
const minDistance = 1
const maxDistance = 50
const autoRotateSpeed = 0.003 // 自动旋转速度
let resetTimer: any = null // 重置视角的计时器

// 初始化
onMounted(() => {
  initScene()
})

// 页面卸载
onUnmounted(() => {
  isComponentActive = false
  cleanup()
})

// 监听 modelUrl 变化
watch(() => props.modelUrl, (newUrl) => {
  if (newUrl && isReady.value) {
    loadModel(newUrl)
  }
})

// 监听 autoRotate 变化
watch(() => props.autoRotate, (newVal) => {
  if (!userHasInteracted) {
    autoRotateEnabled = newVal
  }
})

// 初始化场景
async function initScene() {
  try {
    
    // 设置自动旋转
    autoRotateEnabled = props.autoRotate
    
    // 创建 Three.js 实例
    await createThreeInstance()
    
    // 创建渲染器
    setupRenderer()
    
    // 创建场景
    setupScene()
    
    // 创建相机
    setupCamera()
    
    // 添加光源
    setupLights()
    
    // 创建默认模型
    // createDefaultModel()
    
    // 开始动画循环
    startAnimation()
    
    isReady.value = true
    
    emit('ready')
    
    // 如果有 modelUrl，自动加载
    if (props.modelUrl) {
      loadModel(props.modelUrl)
    }
  } catch (err: any) {
    error.value = err.message || '初始化失败'
    emit('error', error.value)
  }
}

// 创建 Three.js 实例
function createThreeInstance() {
  return new Promise<void>((resolve, reject) => {
    uni.createSelectorQuery()
      .in(getCurrentInstance())
      .select(`#${canvasId.value}`)
      // @ts-ignore
      .node()
      .exec((res: any) => {
        if (res && res[0] && res[0].node) {
          canvas = res[0].node
          THREE = createScopedThreejs(canvas)
          resolve()
        } else {
          reject(new Error('无法获取 Canvas 节点'))
        }
      })
  })
}

// 设置渲染器
function setupRenderer() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    precision: 'highp',
    depth: true,
    stencil: false
  })
  
  const pixelRatio = uni.getSystemInfoSync().pixelRatio || 2
  renderer.setPixelRatio(Math.min(pixelRatio, 2))
  
  renderer.setSize(canvas.width, canvas.height)
  renderer.setClearColor(props.backgroundColor, 1)
  
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  
  renderer.outputEncoding = THREE.sRGBEncoding
  
}

// 设置场景
function setupScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(props.backgroundColor)
}

// 设置相机
function setupCamera() {
  const aspect = canvas.width / canvas.height
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
  updateCameraPosition()
}

// 更新相机位置
function updateCameraPosition() {
  if (!camera) return
  
  const x = cameraDistance * Math.sin(cameraRotation.theta) * Math.cos(cameraRotation.phi) + cameraTarget.x
  const y = cameraDistance * Math.sin(cameraRotation.phi) + cameraTarget.y
  const z = cameraDistance * Math.cos(cameraRotation.theta) * Math.cos(cameraRotation.phi) + cameraTarget.z
  
  camera.position.set(x, y, z)
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z)
}

// 设置光源
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
  mainLight.position.set(10, 15, 10)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.width = 2048
  mainLight.shadow.mapSize.height = 2048
  mainLight.shadow.camera.near = 0.5
  mainLight.shadow.camera.far = 500
  scene.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0xf5f5f5, 0.8)
  fillLight.position.set(-10, 10, -10)
  scene.add(fillLight)

  const topLight = new THREE.DirectionalLight(0xffffff, 0.6)
  topLight.position.set(0, 20, 0)
  scene.add(topLight)

  const bottomLight = new THREE.DirectionalLight(0xe8e8e8, 0.3)
  bottomLight.position.set(0, -10, 0)
  scene.add(bottomLight)

  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5)
  scene.add(hemisphereLight)

}

// 创建默认模型（立方体）
// function createDefaultModel() {
//   const geometry = new THREE.BoxGeometry(1, 1, 1)
//   const material = new THREE.MeshStandardMaterial({
//     color: 0x667eea,
//     metalness: 0.3,
//     roughness: 0.4
//   })
//   
//   const cube = new THREE.Mesh(geometry, material)
//   cube.castShadow = true
//   cube.receiveShadow = true
//   
//   scene.add(cube)
//   currentModel = cube
//   
// }

// 加载 3D 模型
async function loadModel(url: string) {
  if (!isReady.value) {
    return
  }

  loading.value = true
  error.value = ''
  
  // 强制等待 UI 更新，让 loading 动画有机会渲染出来
  // 增加到 200ms 以确保在慢速设备上也能生效
  await new Promise(resolve => setTimeout(resolve, 200))

  try {
    
    const loader = new GLBLoader(THREE, canvas)
    const modelGroup = await loader.load(url)
    
    
    // 移除旧模型
    if (currentModel) {
      scene.remove(currentModel)
    }
    
    // 添加新模型
    scene.add(modelGroup)
    currentModel = modelGroup
    
    // 处理模型变换和材质
    processModelAfterLoad(modelGroup)
    
    // 计算模型边界并调整相机
    adjustCameraToModel(modelGroup)
    
    loading.value = false
    emit('loaded', modelGroup)
    
  } catch (err: any) {
    loading.value = false
    error.value = err.message || '加载失败'
    emit('error', error.value)
  }
}

// 处理模型加载后的优化
function processModelAfterLoad(model: any) {
  
  let meshCount = 0
  let materialCount = 0
  let textureCount = 0
  
  model.traverse((child: any) => {
    if (child.isMesh) {
      meshCount++
      
      if (child.geometry) {
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals()
        }
        
        if (!child.geometry.boundingBox) {
          child.geometry.computeBoundingBox()
        }
        
        if (child.geometry.attributes.normal && !child.geometry.attributes.tangent) {
          // THREE.BufferGeometry: .computeTangents() has been removed in newer versions
          // child.geometry.computeTangents()
        }
      }
      
      if (child.material) {
        materialCount++
        const mat = child.material
        
        const materials = Array.isArray(mat) ? mat : [mat]
        
        materials.forEach((material: any) => {
          if (material && material.isMeshStandardMaterial) {
            material.needsUpdate = true
            
            const textureMaps = [
              'map', 'normalMap', 'metalnessMap', 
              'roughnessMap', 'aoMap', 'emissiveMap'
            ]
            
            textureMaps.forEach((mapName) => {
              if (material[mapName]) {
                const texture = material[mapName]
                texture.encoding = THREE.sRGBEncoding
                texture.flipY = false
                texture.needsUpdate = true
                textureCount++
              }
            })
            
            if (material.envMapIntensity === 0 || material.envMapIntensity === undefined) {
              material.envMapIntensity = 1.0
            }
            
            if (material.map && material.color.r === 0 && material.color.g === 0 && material.color.b === 0) {
              material.color.setRGB(1, 1, 1)
            }
            
            if (!material.side || material.side === THREE.FrontSide) {
              material.side = THREE.DoubleSide
            }
          }
        })
      }
      
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  
}

// 调整相机以适应模型
function adjustCameraToModel(model: any) {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  
  // 重置目标点到模型中心
  // cameraTarget = { x: center.x, y: center.y, z: center.z }
  // 或者因为我们已经移动模型到原点了，所以目标点重置为 0
  cameraTarget = { x: 0, y: 0, z: 0 }
  
  model.position.sub(center)
  
  const maxDim = Math.max(size.x, size.y, size.z)
  // 系数越小，相机越近，模型看起来越大 (原 2.5 -> 1.5 -> 1.0)
  cameraDistance = maxDim * 1.0
  
  updateCameraPosition()
  
}

// 重置相机
function resetCamera() {
  cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 4 }
  
  if (currentModel) {
    adjustCameraToModel(currentModel)
  } else {
    cameraDistance = 5
    cameraTarget = { x: 0, y: 0, z: 0 }
    updateCameraPosition()
  }
}

// 动画循环
function animate() {
  if (!isComponentActive) {
    isAnimating = false
    return
  }
  
  if (!canvas || !renderer || !scene || !camera) {
    isAnimating = false
    return
  }
  
  try {
    // 如果开启了自动旋转且用户未交互，则自动旋转
    if (autoRotateEnabled && !userHasInteracted && !isDragging && !isZooming) {
      cameraRotation.theta += autoRotateSpeed
      updateCameraPosition()
    }
    
    // 渲染场景
    renderer.render(scene, camera)
    
    // 继续下一帧
    if (isComponentActive && isAnimating) {
      animationId = canvas.requestAnimationFrame(animate)
    }
  } catch (error) {
    isAnimating = false
  }
}

// 开始动画
function startAnimation() {
  if (isAnimating) return
  
  isAnimating = true
  animate()
}

// 停止动画
function stopAnimation() {
  isAnimating = false
  
  if (animationId && canvas) {
    try {
      canvas.cancelAnimationFrame(animationId)
      animationId = null
    } catch (error) {
    }
  }
  
}

// 计算两点之间的距离
function getTouchDistance(touch1: any, touch2: any): number {
  const dx = touch2.x - touch1.x
  const dy = touch2.y - touch1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// 计算两个触摸点的中心
function getTouchCenter(touch1: any, touch2: any) {
  return {
    x: (touch1.x + touch2.x) / 2,
    y: (touch1.y + touch2.y) / 2
  }
}

// 触摸开始
function onTouchStart(e: any) {
  if (!e.touches) return
  
  // 停止自动重置计时器
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
  
  // 用户开始交互，永久关闭自动旋转
  if (!userHasInteracted) {
    userHasInteracted = true
    autoRotateEnabled = false
  }
  
  if (e.touches.length === 1) {
    isDragging = true
    isZooming = false
    isPanning = false
    previousTouch = {
      x: e.touches[0].x,
      y: e.touches[0].y
    }
  } else if (e.touches.length === 2) {
    isDragging = false
    // 同时开启缩放和平移
    isZooming = true
    isPanning = true
    previousDistance = getTouchDistance(e.touches[0], e.touches[1])
    previousCenter = getTouchCenter(e.touches[0], e.touches[1])
  }
}

// 触摸移动
function onTouchMove(e: any) {
  if (!e.touches) return
  
  // 停止自动重置计时器（以防万一）
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
  
  if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0]
    const deltaX = touch.x - previousTouch.x
    const deltaY = touch.y - previousTouch.y
    
    cameraRotation.theta -= deltaX * 0.01
    cameraRotation.phi -= deltaY * 0.01
    
    cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.phi))
    
    updateCameraPosition()
    
    previousTouch = {
      x: touch.x,
      y: touch.y
    }
  } else if (e.touches.length === 2) {
    // 双指逻辑：缩放 + 平移
    
    // 1. 缩放处理
    if (isZooming) {
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1])
      const distanceDelta = currentDistance - previousDistance
      
      const oldDistance = cameraDistance
      const zoomSpeed = Math.max(0.005, cameraDistance * 0.01)
      cameraDistance -= distanceDelta * zoomSpeed
      
      cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance))
      
      previousDistance = currentDistance
    }
    
    // 2. 平移处理
    if (isPanning) {
      const currentCenter = getTouchCenter(e.touches[0], e.touches[1])
      const deltaX = currentCenter.x - previousCenter.x
      const deltaY = currentCenter.y - previousCenter.y
      
      // 平移速度，随距离变化
      const panSpeed = cameraDistance * 0.002
      
      // 根据相机角度计算平移向量（简化版：只在相机平面移动）
      // 这里我们需要计算相机坐标系的 Right 和 Up 向量
      // 简化计算：移动 cameraTarget
      
      // 获取相机的 right 向量 (大致)
      const theta = cameraRotation.theta
      const rightX = Math.cos(theta)
      const rightZ = -Math.sin(theta)
      
      // 获取相机的 up 向量 (大致)
      // 当 phi 接近 0 或 PI 时，up 向量会变化，这里做简化处理
      // 假设 Y 轴向上
      const upY = 1 
      
      // 实际上，应该移动 cameraTarget 逆向于手指移动
      // 左右移动 (deltaX) 沿着 Right 向量
      cameraTarget.x -= deltaX * panSpeed * rightX
      cameraTarget.z -= deltaX * panSpeed * rightZ
      
      // 上下移动 (deltaY) 沿着 Up 向量
      cameraTarget.y += deltaY * panSpeed
      
      previousCenter = currentCenter
    }
    
    updateCameraPosition()
  }
}

// 触摸结束
function onTouchEnd(e: any) {
  if (!e.touches || e.touches.length === 0) {
    isDragging = false
    isZooming = false
    isPanning = false
    
    // 触摸结束，开始 5 秒倒计时重置视角
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      resetCamera()
    }, 5000)
    
  } else if (e.touches.length === 1) {
    // 从双指变成单指
    isDragging = true
    isZooming = false
    isPanning = false
    previousTouch = {
      x: e.touches[0].x,
      y: e.touches[0].y
    }
  }
}

// 清理资源
function cleanup() {
  
  isComponentActive = false
  
  stopAnimation()
  
  if (currentModel && scene) {
    try {
      scene.remove(currentModel)
      currentModel = null
    } catch (error) {
    }
  }
  
  if (renderer) {
    try {
      renderer.dispose()
      renderer = null
    } catch (error) {
    }
  }
  
  scene = null
  camera = null
  canvas = null
  THREE = null
  
  isReady.value = false
  loading.value = false
  error.value = ''
  
}

// 暴露方法给父组件
defineExpose({
  loadModel,
  resetCamera,
  cleanup
})
</script>

<style scoped>
.model-3d-viewer {
  position: relative;
  overflow: hidden;
  /* 创建新的层叠上下文 */
  isolation: isolate;
}

.webgl-canvas {
  width: 100%;
  height: 100%;
  display: block;
  /* 使用 static 定位避免在 scroll-view 中的滚动问题 */
  position: static;
  transition: opacity 0.3s ease;
}

.canvas-hidden {
  opacity: 0;
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.loading-overlay.visible {
  z-index: 100;
  opacity: 1;
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.simple-spinner {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border-width: 6rpx;
  border-style: solid;
  border-color: #667eea rgba(102, 126, 234, 0.2) rgba(102, 126, 234, 0.2) rgba(102, 126, 234, 0.2);
  margin-bottom: 30rpx;
  animation: simple-spin 1s linear infinite;
}

@keyframes simple-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 26rpx;
  letter-spacing: 2rpx;
  text-shadow: 0 0 10rpx rgba(102, 126, 234, 0.5);
}

/* 错误状态 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(42, 42, 42, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  z-index: 100;
}

.error-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
}

.error-title {
  color: #ff6b6b;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.error-message {
  color: #ffa07a;
  font-size: 28rpx;
  text-align: center;
  line-height: 1.6;
}

/* 手势提示 */
.gesture-hint {
  position: absolute;
  top: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 16rpx 32rpx;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10rpx);
  border-radius: 40rpx;
  z-index: 5;
  animation: fadeIn 0.3s ease;
}

.hint-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  white-space: nowrap;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 渲染质量标识 */
.quality-badge {
  position: absolute;
  top: 100rpx;
  right: 40rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
  z-index: 5;
}

.quality-text {
  color: #fff;
  font-size: 20rpx;
  font-weight: bold;
  letter-spacing: 1rpx;
}
</style>
