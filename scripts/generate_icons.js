import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const iconsDir = path.resolve(rootDir, 'public/icons')

const masterPath = path.resolve(iconsDir, 'icon-512.png')
if (!fs.existsSync(masterPath)) {
    console.error(`Master icon not found at ${masterPath}`)
    process.exit(1)
}

const srcData = fs.readFileSync(masterPath)
const pngAny = PNG.sync.read(srcData)
const pngMaskable = PNG.sync.read(srcData)

const width = pngAny.width
const height = pngAny.height

const B_R = 56
const B_G = 86
const B_B = 158

// Flood fill from all 4 corners to find outer canvas pixels
const inCorner = new Uint8Array(width * height)
const queue = [0, 0, width - 1, 0, 0, height - 1, width - 1, height - 1]
for (let i = 0; i < queue.length; i += 2) {
    inCorner[queue[i + 1] * width + queue[i]] = 1
}

const cornerLimitX = Math.round(width * 0.25)
const cornerLimitY = Math.round(height * 0.25)

let head = 0
while (head < queue.length) {
    const cx = queue[head++]
    const cy = queue[head++]

    const inQuad = (cx < cornerLimitX || cx > width - cornerLimitX) &&
        (cy < cornerLimitY || cy > height - cornerLimitY)
    if (!inQuad) continue

    const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = ny * width + nx
            if (!inCorner[idx]) {
                const inNQuad = (nx < cornerLimitX || nx > width - cornerLimitX) &&
                    (ny < cornerLimitY || ny > height - cornerLimitY)
                if (inNQuad) {
                    const pIdx = idx * 4
                    const r = pngAny.data[pIdx]
                    const g = pngAny.data[pIdx + 1]
                    const b = pngAny.data[pIdx + 2]

                    // Pixel is lighter than the blue background (antialiasing or white canvas)
                    if (r > 60 || g > 90 || b > 162) {
                        inCorner[idx] = 1
                        queue.push(nx, ny)
                    }
                }
            }
        }
    }
}

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (inCorner[idx]) {
            const pIdx = idx * 4
            const r = pngAny.data[pIdx]
            const g = pngAny.data[pIdx + 1]
            const b = pngAny.data[pIdx + 2]
            const alpha = (765 - (r + g + b)) / 465

            // "any": transparent corners with anti-aliasing
            if (alpha <= 0.05) {
                pngAny.data[pIdx] = 0
                pngAny.data[pIdx + 1] = 0
                pngAny.data[pIdx + 2] = 0
                pngAny.data[pIdx + 3] = 0
            } else if (alpha >= 0.95) {
                pngAny.data[pIdx] = B_R
                pngAny.data[pIdx + 1] = B_G
                pngAny.data[pIdx + 2] = B_B
                pngAny.data[pIdx + 3] = 255
            } else {
                pngAny.data[pIdx] = B_R
                pngAny.data[pIdx + 1] = B_G
                pngAny.data[pIdx + 2] = B_B
                pngAny.data[pIdx + 3] = Math.round(alpha * 255)
            }

            // "maskable": full-bleed solid blue to edges
            pngMaskable.data[pIdx] = B_R
            pngMaskable.data[pIdx + 1] = B_G
            pngMaskable.data[pIdx + 2] = B_B
            pngMaskable.data[pIdx + 3] = 255
        }
    }
}

const tmpAny = path.resolve(iconsDir, '.tmp-master-any.png')
const tmpMaskable = path.resolve(iconsDir, '.tmp-master-maskable.png')

fs.writeFileSync(tmpAny, PNG.sync.write(pngAny))
fs.writeFileSync(tmpMaskable, PNG.sync.write(pngMaskable))

try {
    execSync(`sips -z 192 192 "${tmpAny}" --out "${path.resolve(iconsDir, 'icon-192.png')}"`)
    execSync(`sips -z 512 512 "${tmpAny}" --out "${path.resolve(iconsDir, 'icon-512.png')}"`)
    execSync(`sips -z 192 192 "${tmpMaskable}" --out "${path.resolve(iconsDir, 'icon-maskable-192.png')}"`)
    execSync(`sips -z 512 512 "${tmpMaskable}" --out "${path.resolve(iconsDir, 'icon-maskable-512.png')}"`)
    console.log('Successfully generated public/icons: icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png')
} finally {
    if (fs.existsSync(tmpAny)) fs.unlinkSync(tmpAny)
    if (fs.existsSync(tmpMaskable)) fs.unlinkSync(tmpMaskable)
}
