export function createCountdownTimer(counterRef) {
  let timer = null

  function clear() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function start(duration = 60) {
    counterRef.value = duration
    clear()
    timer = setInterval(() => {
      if (counterRef.value <= 1) {
        counterRef.value = 0
        clear()
        return
      }

      counterRef.value -= 1
    }, 1000)
  }

  return {
    clear,
    start,
  }
}

function findIdentity(identities, provider) {
  return identities.find((item) => item.provider === provider)
}

export function buildIdentityCards(identities) {
  const emailIdentity = findIdentity(identities, 'email_password')
  const phoneIdentity = findIdentity(identities, 'phone_sms')
  const miniIdentity = findIdentity(identities, 'wechat_mini_program')
  const appWechatIdentity = findIdentity(identities, 'wechat_app')
  const googleAppIdentity = findIdentity(identities, 'google_app')
  const boundIdentityCount = identities.length

  return [
    {
      key: 'email',
      provider: emailIdentity ? emailIdentity.provider : 'email_password',
      providerUserId: emailIdentity ? emailIdentity.providerUserId : '',
      providerAppId: emailIdentity ? emailIdentity.providerAppId : '',
      icon: 'mail',
      color: '#3b82f6',
      label: '邮箱账号',
      bound: !!emailIdentity,
      actionDisabled: !!emailIdentity && boundIdentityCount <= 1,
      desc: emailIdentity ? emailIdentity.providerUserId : '未绑定邮箱',
    },
    {
      key: 'phone',
      provider: phoneIdentity ? phoneIdentity.provider : 'phone_sms',
      providerUserId: phoneIdentity ? phoneIdentity.providerUserId : '',
      providerAppId: phoneIdentity ? phoneIdentity.providerAppId : '',
      icon: 'phone',
      color: '#10b981',
      label: '手机号',
      bound: !!phoneIdentity,
      actionDisabled: !!phoneIdentity && boundIdentityCount <= 1,
      desc: phoneIdentity ? phoneIdentity.providerUserId : '未绑定手机号',
    },
    {
      key: 'wechatApp',
      provider: appWechatIdentity ? appWechatIdentity.provider : 'wechat_app',
      providerUserId: appWechatIdentity ? appWechatIdentity.providerUserId : '',
      providerAppId: appWechatIdentity ? appWechatIdentity.providerAppId : '',
      icon: 'message',
      color: '#07C160',
      label: '微信 App',
      bound: !!appWechatIdentity,
      actionDisabled: !!appWechatIdentity && boundIdentityCount <= 1,
      desc: appWechatIdentity ? '已绑定微信 App 身份' : '未绑定微信 App 身份',
    },
    {
      key: 'googleApp',
      provider: googleAppIdentity ? googleAppIdentity.provider : 'google_app',
      providerUserId: googleAppIdentity ? googleAppIdentity.providerUserId : '',
      providerAppId: googleAppIdentity ? googleAppIdentity.providerAppId : '',
      icon: 'globe',
      color: '#3b82f6',
      label: 'Google',
      bound: !!googleAppIdentity,
      actionDisabled: !!googleAppIdentity && boundIdentityCount <= 1,
      desc: googleAppIdentity ? '已绑定 Google 身份' : '未绑定 Google 身份',
    },
    {
      key: 'wechat',
      provider: miniIdentity ? miniIdentity.provider : 'wechat_mini_program',
      providerUserId: miniIdentity ? miniIdentity.providerUserId : '',
      providerAppId: miniIdentity ? miniIdentity.providerAppId : '',
      icon: 'message',
      color: '#07C160',
      label: '微信小程序',
      bound: !!miniIdentity,
      actionDisabled: !!miniIdentity && boundIdentityCount <= 1,
      desc: miniIdentity ? '已绑定微信小程序身份' : '未绑定微信小程序身份',
    },
  ]
}

export function buildVerifyMethods(identities, unbindTarget) {
  if (!unbindTarget) {
    return []
  }

  const remaining = identities.filter((item) => {
    return !(
      item.provider === unbindTarget.provider &&
      item.providerUserId === unbindTarget.providerUserId &&
      item.providerAppId === unbindTarget.providerAppId
    )
  })

  const methods = []

  if (remaining.some((item) => item.provider === 'email_password')) {
    methods.push({ key: 'password', label: '密码校验' })
  }
  if (remaining.some((item) => item.provider === 'phone_sms')) {
    methods.push({ key: 'phone_code', label: '短信验证码' })
  }
  if (remaining.some((item) => item.provider === 'wechat_mini_program')) {
    methods.push({ key: 'wechat_mini_program', label: '微信小程序校验' })
  }
  if (remaining.some((item) => item.provider === 'wechat_app')) {
    methods.push({ key: 'wechat_app', label: '微信 App 校验' })
  }
  if (remaining.some((item) => item.provider === 'google_app')) {
    methods.push({ key: 'google_app', label: 'Google 校验' })
  }

  return methods
}

export function formatCountdownText(countdown) {
  if (countdown > 0) {
    return `${countdown}s 后重发`
  }

  return '发送验证码'
}
