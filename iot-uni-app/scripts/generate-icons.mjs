import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'static', 'icons')
const iconNodesModule = await import(pathToFileURL(path.join(rootDir, 'components', 'ui', 'iconNodes.js')).href)
const iconNodes = iconNodesModule.default

const sourceFiles = []

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }

    if (/\.(vue|js)$/.test(entry.name)) {
      sourceFiles.push(fullPath)
    }
  }
}

walk(path.join(rootDir, 'components'))
walk(path.join(rootDir, 'pages'))
sourceFiles.push(path.join(rootDir, 'App.vue'))

function serializeAttrs(attrs) {
  return Object.keys(attrs)
    .filter((key) => key !== 'key')
    .map((key) => `${key}="${attrs[key]}"`)
    .join(' ')
}

function renderSvg(nodes, color, filled, strokeWidth) {
  const body = (nodes || [])
    .map(([tag, attrs]) => `<${tag} ${serializeAttrs(attrs)} />`)
    .join('')

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"',
    ` fill="${filled ? color : 'none'}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
    body,
    '</svg>',
  ].join('')
}

function sanitizeColor(color) {
  return color.replace('#', '').toLowerCase()
}

function extractQuotedStrings(value) {
  return Array.from(value.matchAll(/'([^']+)'|"([^"]+)"/g)).map((match) => match[1] || match[2])
}

function extractHexColors(value) {
  return Array.from(value.matchAll(/#[0-9A-Fa-f]{6}/g)).map((match) => match[0])
}

function extractStrokeWidths(value) {
  return Array.from(value.matchAll(/\b\d+(?:\.\d+)?\b/g)).map((match) => Number(match[0]))
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function parseScriptSection(content) {
  const match = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)
  return match ? match[1] : ''
}

function parseTagAttributes(tag) {
  const attrs = {}
  const attrRegex = /([:@A-Za-z-]+)="([^"]*)"/g
  let match = attrRegex.exec(tag)
  while (match) {
    attrs[match[1]] = match[2]
    match = attrRegex.exec(tag)
  }
  return attrs
}

function collectVariantRequests() {
  const variants = new Set()

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8')
    const script = parseScriptSection(content)
    const scriptIcons = unique(Array.from(script.matchAll(/icon:\s*'([^']+)'/g)).map((match) => match[1]))
    const scriptColors = unique([
      ...Array.from(script.matchAll(/color:\s*'((?:#[0-9A-Fa-f]{6}))'/g)).map((match) => match[1]),
      ...extractHexColors(script),
    ])
    const tags = content.match(/<app-icon\b[\s\S]*?\/>/g) || []

    for (const tag of tags) {
      const attrs = parseTagAttributes(tag)
      let names = []
      let colors = []
      let fills = [0]
      let strokeWidths = [2]

      if (attrs.name) {
        names = [attrs.name]
      } else if (attrs[':name']) {
        names = unique(extractQuotedStrings(attrs[':name']))
        if (!names.length && /\.icon\b/.test(attrs[':name'])) {
          names = scriptIcons
        }
      }

      if (!names.length) {
        names = ['info']
      }

      if (attrs.color) {
        colors = [attrs.color]
      } else if (attrs[':color']) {
        const dynamicExpr = attrs[':color']
        const literalColors = extractHexColors(dynamicExpr)
        const containsDynamicColorRef = /(?:^|[^A-Za-z])(flameColor|glowColor|\w+Color|\w+\.color)\b/.test(dynamicExpr)
        colors = unique([
          ...literalColors,
          ...(containsDynamicColorRef ? scriptColors : []),
        ])
        if (!colors.length && /\.color\b/.test(attrs[':color'])) {
          colors = scriptColors
        }
      }

      if (!colors.length) {
        colors = ['#0f172a']
      }

      if (attrs.filled !== undefined || attrs[':filled'] === 'true') {
        fills = [1]
      } else if (attrs[':filled']) {
        fills = extractQuotedStrings(attrs[':filled']).includes('true') ? [1] : [0]
      }

      if (attrs[':stroke-width']) {
        const parsedStrokeWidths = unique(extractStrokeWidths(attrs[':stroke-width']))
        if (parsedStrokeWidths.length) {
          strokeWidths = parsedStrokeWidths
        }
      } else if (attrs['stroke-width']) {
        strokeWidths = [Number(attrs['stroke-width'])]
      }

      for (const name of names) {
        for (const color of colors) {
          for (const filled of fills) {
            for (const strokeWidth of strokeWidths) {
              variants.add(`${name}|${color}|${filled}|${strokeWidth}`)
            }
          }
        }
      }
    }
  }

  variants.add('info|#0f172a|0|2')
  return variants
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const variants = collectVariantRequests()

let generatedCount = 0

for (const variant of variants) {
  const [name, color, filled, strokeWidth] = variant.split('|')
  const nodes = iconNodes[name] || iconNodes.info
  const strokeKey = String(strokeWidth).replace('.', '_')
  const fileName = `${name}-${sanitizeColor(color)}-f${filled}-s${strokeKey}.svg`
  const filePath = path.join(outDir, fileName)

  fs.writeFileSync(filePath, renderSvg(nodes, color, Number(filled) === 1, Number(strokeWidth)), 'utf8')
  generatedCount += 1
}

console.log(`Generated ${generatedCount} icon variants into ${outDir}`)
