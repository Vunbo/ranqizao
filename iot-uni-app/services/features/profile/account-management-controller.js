import { computed, ref } from 'vue'
import { changePassword } from '../../remote/auth'
import { createNotifier, formatErrorMessage } from '../common/controller-helpers'

export function useAccountManagementController(options) {
  const { props, notify } = options

  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const submitting = ref(false)
  const error = ref('')

  const uid = computed(() => {
    return props.user && props.user.uid ? props.user.uid : ''
  })

  const notifyUser = createNotifier(notify)

  function resetPasswordForm() {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    error.value = ''
  }

  async function submitChangePassword() {
    if (submitting.value) {
      return
    }

    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      error.value = '请完整填写密码信息。'
      return
    }

    if (newPassword.value !== confirmPassword.value) {
      error.value = '两次输入的新密码不一致。'
      return
    }

    submitting.value = true
    error.value = ''

    try {
      await changePassword({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      })

      resetPasswordForm()
      notifyUser({
        message: '密码修改成功',
        type: 'success',
      })
    } catch (errorResponse) {
      error.value = formatErrorMessage(errorResponse, '修改密码失败')
    } finally {
      submitting.value = false
    }
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    submitting,
    error,
    uid,
    submitChangePassword,
  }
}
