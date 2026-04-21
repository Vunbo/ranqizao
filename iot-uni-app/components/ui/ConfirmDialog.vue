<template>
  <view class="modal-mask" @tap="$emit('cancel')">
    <view class="confirm-dialog" @tap.stop>
      <view class="confirm-dialog__head">
        <text class="confirm-dialog__title">{{ title }}</text>
        <text class="confirm-dialog__message">{{ message }}</text>
      </view>
      <view class="confirm-dialog__actions">
        <view class="confirm-dialog__action confirm-dialog__action--confirm" @tap="$emit('confirm')">
          <text class="confirm-dialog__confirm-text">{{ confirmText }}</text>
        </view>
        <view class="confirm-dialog__action confirm-dialog__action--cancel" @tap="$emit('cancel')">
          <text class="confirm-dialog__cancel-text">取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineEmits(['confirm', 'cancel'])

defineProps({
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  confirmText: {
    type: String,
    default: '确认',
  },
})
</script>

<style scoped>
.confirm-dialog {
  width: 100%;
  max-width: 320px;
  padding: 24px;
  background: #ffffff;
  border-radius: 32px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
}

.confirm-dialog__head {
  text-align: center;
}

.confirm-dialog__title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.confirm-dialog__message {
  display: block;
  margin-top: 12px;
  font-size: 14px;
  line-height: 22px;
  color: #64748b;
  white-space: pre-line;
}

.confirm-dialog__actions {
  margin-top: 24px;
}

.confirm-dialog__action {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 16px;
}

.confirm-dialog__action + .confirm-dialog__action {
  margin-top: 10px;
}

.confirm-dialog__action--confirm {
  background: #f97316;
}

.confirm-dialog__action--cancel {
  background: #f1f5f9;
}

.confirm-dialog__confirm-text {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.confirm-dialog__cancel-text {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
}
</style>
