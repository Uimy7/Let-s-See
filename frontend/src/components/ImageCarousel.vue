<template>
  <div 
    class="image-carousel"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseEnd"
    @mouseleave="handleMouseEnd"
  >
    <div 
      class="carousel-track"
      :style="{
        transform: `translateX(calc(-${currentImageIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }"
    >
      <div 
        v-for="(image, index) in images" 
        :key="index"
        class="carousel-slide"
      >
        <div class="carousel-image-wrapper">
          <img 
            :src="image.url || image" 
            :alt="image.alt || `Image ${index + 1}`" 
            class="carousel-image" 
          />
        </div>
      </div>
    </div>
    
    <!-- 图片指示器 -->
    <div v-if="images.length > 1 && showIndicators" class="carousel-indicators">
      <span 
        v-for="(_, index) in images" 
        :key="index"
        class="indicator-dot"
        :class="{ active: index === currentImageIndex }"
        @click="goToImage(index)"
      ></span>
    </div>

    <!-- PC端箭头 -->
    <button 
      v-if="images.length > 1 && showArrows && currentImageIndex > 0"
      class="carousel-arrow carousel-arrow-left"
      @click="prevImage"
    >
      ‹
    </button>
    <button 
      v-if="images.length > 1 && showArrows && currentImageIndex < images.length - 1"
      class="carousel-arrow carousel-arrow-right"
      @click="nextImage"
    >
      ›
    </button>

    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface ImageItem {
  url: string
  alt?: string
  [key: string]: any
}

interface Props {
  images: (string | ImageItem)[]
  showIndicators?: boolean
  showArrows?: boolean
  initialIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  showIndicators: true,
  showArrows: true,
  initialIndex: 0
})

const emit = defineEmits<{
  change: [index: number]
}>()

// 图片轮播状态
const currentImageIndex = ref(props.initialIndex)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragOffset = ref(0)
const dragStartTime = ref(0)

// 监听初始索引变化
watch(() => props.initialIndex, (newIndex) => {
  currentImageIndex.value = newIndex
})

// 监听当前索引变化，触发事件
watch(currentImageIndex, (newIndex) => {
  emit('change', newIndex)
})

// 图片切换函数
const goToImage = (index: number) => {
  if (index >= 0 && index < props.images.length) {
    currentImageIndex.value = index
  }
}

const nextImage = () => {
  if (currentImageIndex.value < props.images.length - 1) {
    currentImageIndex.value++
  }
}

const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

// 触摸事件处理
const handleTouchStart = (e: TouchEvent) => {
  isDragging.value = true
  dragStartX.value = e.touches[0].clientX
  dragStartTime.value = Date.now()
  dragOffset.value = 0
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  
  const currentX = e.touches[0].clientX
  dragOffset.value = currentX - dragStartX.value
}

const handleTouchEnd = () => {
  if (!isDragging.value) return
  
  const swipeThreshold = 50 // 最小滑动距离
  const swipeTimeThreshold = 300 // 最大滑动时间（毫秒）
  const swipeDuration = Date.now() - dragStartTime.value
  
  // 快速滑动或滑动距离足够
  if (Math.abs(dragOffset.value) > swipeThreshold || 
      (Math.abs(dragOffset.value) > 30 && swipeDuration < swipeTimeThreshold)) {
    if (dragOffset.value > 0) {
      // 向右滑动 - 上一张
      prevImage()
    } else {
      // 向左滑动 - 下一张
      nextImage()
    }
  }
  
  isDragging.value = false
  dragOffset.value = 0
}

// 鼠标事件处理（PC端）
const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartTime.value = Date.now()
  dragOffset.value = 0
  e.preventDefault()
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const currentX = e.clientX
  dragOffset.value = currentX - dragStartX.value
}

const handleMouseEnd = () => {
  if (!isDragging.value) return
  
  const swipeThreshold = 50
  const swipeTimeThreshold = 300
  const swipeDuration = Date.now() - dragStartTime.value
  
  if (Math.abs(dragOffset.value) > swipeThreshold || 
      (Math.abs(dragOffset.value) > 30 && swipeDuration < swipeTimeThreshold)) {
    if (dragOffset.value > 0) {
      prevImage()
    } else {
      nextImage()
    }
  }
  
  isDragging.value = false
  dragOffset.value = 0
}

// 暴露方法给父组件
defineExpose({
  goToImage,
  nextImage,
  prevImage,
  getCurrentIndex: () => currentImageIndex.value,
  reset: () => { currentImageIndex.value = 0 }
})
</script>

<style scoped>
.image-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.image-carousel:active {
  cursor: grabbing;
}

.carousel-track {
  display: flex;
  height: 100%;
  will-change: transform;
}

.carousel-slide {
  flex-shrink: 0;
  width: 100%;
  height: 100%;
}

.carousel-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.carousel-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background: var(--bg-secondary);
  pointer-events: none;
}

/* 图片指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator-dot.active {
  background: white;
  width: 24px;
  border-radius: 4px;
}

.indicator-dot:hover {
  background: rgba(255, 255, 255, 0.8);
}

/* PC端箭头按钮 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
}

.carousel-arrow:hover {
  background: rgba(0, 0, 0, 0.7);
}

.carousel-arrow-left {
  left: 16px;
}

.carousel-arrow-right {
  right: 16px;
}

/* PC端显示箭头 */
@media (min-width: 769px) {
  .image-carousel:hover .carousel-arrow {
    display: flex;
  }
}
</style>

