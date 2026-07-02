export const fireLevels = [20, 40, 60, 80, 100]

export const cookingModes = [
  {
    title: '爆炒模式',
    desc: '大火快炒，适合锁住食材鲜香',
    icon: 'flame',
    color: '#f97316',
    bg: '#fff7ed',
    level: 100,
  },
  {
    title: '文火慢炖',
    desc: '恒温细煮，适合长时间炖煮',
    icon: 'thermometer',
    color: '#3b82f6',
    bg: '#eff6ff',
    level: 20,
  },
  {
    title: '蒸煮模式',
    desc: '中高火稳定输出，适合蒸煮类烹饪',
    icon: 'droplet',
    color: '#06b6d4',
    bg: '#ecfeff',
    level: 60,
  },
  {
    title: '一键煎炒',
    desc: '精准控温，减少焦糊风险',
    icon: 'activity',
    color: '#f59e0b',
    bg: '#fffbeb',
    level: 80,
  },
]

export function resolveFlameColor(isOn, fireLevel) {
  if (!isOn) {
    return '#334155'
  }

  if (fireLevel <= 30) {
    return '#60a5fa'
  }

  if (fireLevel <= 60) {
    return '#fb923c'
  }

  return '#f43f5e'
}

export function resolveGlowColor(fireLevel) {
  if (fireLevel <= 30) {
    return '#3b82f6'
  }

  if (fireLevel <= 60) {
    return '#f97316'
  }

  return '#f43f5e'
}

export function buildFlameTransform(isOn, fireLevel) {
  const scale = isOn ? 0.8 + (fireLevel / 100) * 0.7 : 0.8
  return `scale(${scale})`
}

export function buildProgressRingSvg(isOn, fireLevel, strokeColor) {
  const percent = isOn ? fireLevel : 0
  const offset = 691 - (691 * percent) / 100
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    '<g transform="rotate(-90 128 128)">',
    '<circle cx="128" cy="128" r="110" stroke="rgba(255,255,255,0.05)" stroke-width="4" fill="transparent"/>',
    `<circle cx="128" cy="128" r="110" stroke="${strokeColor}" stroke-width="4" fill="transparent" stroke-dasharray="691" stroke-dashoffset="${offset}"/>`,
    '</g>',
    '</svg>',
  ].join('')

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
