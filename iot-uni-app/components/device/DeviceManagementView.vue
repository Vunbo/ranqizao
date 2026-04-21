<template>
  <view class="device-mgmt">
    <view class="device-mgmt__header">
      <view class="device-mgmt__back" @tap="$emit('back')">
        <app-icon name="arrowLeft" :size="18" color="#475569" />
      </view>
      <text class="device-mgmt__title">设备管理</text>
    </view>

    <view class="device-mgmt__tools">
      <view class="device-mgmt__search">
        <view class="device-mgmt__search-icon">
          <app-icon name="search" :size="14" color="#94a3b8" />
        </view>
        <input
          v-model="searchQuery"
          class="device-mgmt__search-input"
          placeholder="搜索设备名称..."
          placeholder-style="color:#94a3b8"
        />
      </view>

      <view class="device-mgmt__filter">
        <view
          v-for="tab in filterTabs"
          :key="tab.id"
          class="device-mgmt__filter-item"
          :class="{ 'device-mgmt__filter-item--active': filterTab === tab.id }"
          @tap="filterTab = tab.id"
        >
          <text class="device-mgmt__filter-text">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <view v-if="!filteredDevices.length" class="device-mgmt__empty">
      <view class="device-mgmt__empty-icon">
        <app-icon name="search" :size="28" color="#cbd5e1" />
      </view>
      <text class="device-mgmt__empty-text">未找到相关设备</text>
    </view>

    <view v-else>
      <card-box
        v-for="device in filteredDevices"
        :key="device.id"
        custom-style="padding:16px; margin-bottom:12px;"
      >
        <view class="device-mgmt__row">
          <view class="device-mgmt__identity">
            <view class="device-mgmt__flame" :class="{ 'device-mgmt__flame--on': device.isOn }">
              <app-icon name="flame" :size="20" :color="device.isOn ? '#f97316' : '#94a3b8'" />
            </view>
            <view class="device-mgmt__copy">
              <template v-if="isRenaming === device.id">
                <view class="device-mgmt__rename-row">
                  <input
                    v-model="newName"
                    class="device-mgmt__rename-input"
                    placeholder="设备名称"
                    placeholder-style="color:#94a3b8"
                  />
                  <view class="device-mgmt__rename-action device-mgmt__rename-action--ok" @tap="handleRename(device)">
                    <app-icon name="check" :size="12" color="#10b981" />
                  </view>
                  <view class="device-mgmt__rename-action" @tap="cancelRename">
                    <app-icon name="close" :size="12" color="#94a3b8" />
                  </view>
                </view>
              </template>
              <template v-else>
                <text class="device-mgmt__name line-clamp-1">{{ device.name }}</text>
              </template>
              <view class="device-mgmt__status">
                <view class="device-mgmt__status-dot" :class="{ 'device-mgmt__status-dot--on': device.isOn }"></view>
                <text class="device-mgmt__status-text">
                  {{ device.isOn ? '运行中' : '待机中' }} · {{ isOwner(device) ? '我的设备' : '共享设备' }}
                </text>
              </view>
            </view>
          </view>

          <view class="device-mgmt__actions" v-if="isOwner(device) && isRenaming !== device.id">
            <view class="device-mgmt__action" @tap="startRename(device)">
              <app-icon name="edit" :size="16" color="#64748b" />
            </view>
            <view class="device-mgmt__action" @tap="handleDelete(device)">
              <app-icon name="trash" :size="16" color="#f43f5e" />
            </view>
          </view>
        </view>
      </card-box>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import { removeDevice, updateDevice } from '../../services/gateway'

const emit = defineEmits(['back', 'toast', 'refresh', 'request-confirm'])

const props = defineProps({
  devices: {
    type: Array,
    default: () => [],
  },
  user: {
    type: Object,
    default: null,
  },
})

const searchQuery = ref('')
const filterTab = ref('all')
const isRenaming = ref('')
const newName = ref('')

const filterTabs = [
  { id: 'all', label: '全部' },
  { id: 'mine', label: '我的' },
  { id: 'shared', label: '共享' },
]

const shortUid = computed(() => {
  return props.user && props.user.uid ? props.user.uid.slice(0, 8) : ''
})

const filteredDevices = computed(() => {
  return props.devices.filter((device) => {
    const matchesSearch = (device.name || '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const owner = device.ownerId === shortUid.value
    if (filterTab.value === 'mine') {
      return matchesSearch && owner
    }
    if (filterTab.value === 'shared') {
      return matchesSearch && !owner
    }
    return matchesSearch
  })
})

function isOwner(device) {
  return device.ownerId === shortUid.value
}

function startRename(device) {
  isRenaming.value = device.id
  newName.value = device.name
}

function cancelRename() {
  isRenaming.value = ''
  newName.value = ''
}

async function handleRename(device) {
  const normalizedName = String(newName.value || '').trim()
  if (!normalizedName) {
    return
  }

  const hasDuplicate = props.devices.some((item) => {
    return item.id !== device.id && (item.name || '').trim().toLowerCase() === normalizedName.toLowerCase()
  })

  if (hasDuplicate) {
    emit('toast', {
      message: '设备名称已存在，请更换一个名称',
      type: 'error',
    })
    return
  }

  try {
    await updateDevice(device.id, { name: normalizedName })
    emit('refresh')
    emit('toast', {
      message: '设备重命名成功',
      type: 'success',
    })
    cancelRename()
  } catch (error) {
    emit('toast', {
      message: error.message || '重命名失败',
      type: 'error',
    })
  }
}

function handleDelete(device) {
  emit('request-confirm', {
    title: '删除设备',
    message: `确定要删除设备“${device.name}”吗？此操作不可撤销。`,
    confirmText: '确认删除',
    onConfirm: async () => {
      try {
        await removeDevice(device.id)
        emit('refresh')
        emit('toast', {
          message: '设备已删除',
          type: 'success',
        })
      } catch (error) {
        emit('toast', {
          message: error.message || '删除失败',
          type: 'error',
        })
      }
    },
  })
}
</script>

<style scoped>
.device-mgmt__header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.device-mgmt__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.device-mgmt__title {
  margin-left: 12px;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: #0f172a;
}

.device-mgmt__tools {
  margin-bottom: 16px;
}

.device-mgmt__search {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 48px;
  padding-left: 38px;
  background: #f1f5f9;
  border-radius: 18px;
}

.device-mgmt__search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
}

.device-mgmt__search-input {
  width: 100%;
  font-size: 14px;
  color: #0f172a;
}

.device-mgmt__filter {
  display: flex;
  margin-top: 12px;
  padding: 4px;
  background: #e2e8f0;
  border-radius: 16px;
}

.device-mgmt__filter-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: 12px;
}

.device-mgmt__filter-item--active {
  background: #ffffff;
}

.device-mgmt__filter-text {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.device-mgmt__filter-item--active .device-mgmt__filter-text {
  color: #f97316;
}

.device-mgmt__empty {
  padding: 48px 0;
  text-align: center;
}

.device-mgmt__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  background: #f8fafc;
  border-radius: 32px;
}

.device-mgmt__empty-text {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.device-mgmt__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-mgmt__identity {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.device-mgmt__flame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-right: 12px;
  background: #f8fafc;
  border-radius: 18px;
}

.device-mgmt__flame--on {
  background: #fff7ed;
}

.device-mgmt__copy {
  min-width: 0;
  flex: 1;
}

.device-mgmt__name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.device-mgmt__status {
  display: flex;
  align-items: center;
  margin-top: 6px;
}

.device-mgmt__status-dot {
  width: 6px;
  height: 6px;
  background: #cbd5e1;
  border-radius: 50%;
}

.device-mgmt__status-dot--on {
  background: #10b981;
}

.device-mgmt__status-text {
  margin-left: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.device-mgmt__actions {
  display: flex;
  align-items: center;
}

.device-mgmt__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
}

.device-mgmt__rename-row {
  display: flex;
  align-items: center;
}

.device-mgmt__rename-input {
  width: 120px;
  height: 34px;
  padding: 0 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
}

.device-mgmt__rename-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: 4px;
  border-radius: 10px;
}

.device-mgmt__rename-action--ok {
  background: #ecfdf5;
}
</style>
