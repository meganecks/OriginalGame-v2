import { createNoise2D } from 'simplex-noise'
import {
  CELL_SIZE,
  EDGE_FALLOFF_START,
  EDGE_FALLOFF_STRENGTH,
  GRID_SIZE,
  TERRAIN_SPEED_MULTIPLIER,
  TERRAIN_THRESHOLDS,
  WORLD_SIZE,
  type TerrainKind,
} from '../config'

// シード付き疑似乱数(mulberry32)。同じシードなら同じ乱数列を再現できる。
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class HeightMap {
  readonly seed: number
  private readonly heights: Float32Array
  private readonly kinds: Uint8Array
  private readonly rng: () => number

  constructor(seed: number = Date.now()) {
    this.seed = seed
    this.rng = mulberry32(seed)
    this.heights = new Float32Array(GRID_SIZE * GRID_SIZE)
    this.kinds = new Uint8Array(GRID_SIZE * GRID_SIZE)
    this.generate()
  }

  private generate() {
    const noise2D = createNoise2D(this.rng)
    const center = GRID_SIZE / 2

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const nx = gx / GRID_SIZE
        const ny = gy / GRID_SIZE

        // 複数オクターブのノイズを合成
        let h =
          0.6 * (noise2D(nx * 3, ny * 3) * 0.5 + 0.5) +
          0.3 * (noise2D(nx * 7, ny * 7) * 0.5 + 0.5) +
          0.1 * (noise2D(nx * 15, ny * 15) * 0.5 + 0.5)

        // 中心からの距離(0=中心, 1=最外周)に応じた境界フォールオフ
        const dx = (gx - center) / center
        const dy = (gy - center) / center
        const radius = Math.min(1, Math.sqrt(dx * dx + dy * dy))
        if (radius > EDGE_FALLOFF_START) {
          const t = (radius - EDGE_FALLOFF_START) / (1 - EDGE_FALLOFF_START)
          h += t * t * EDGE_FALLOFF_STRENGTH
        }

        const idx = gy * GRID_SIZE + gx
        this.heights[idx] = h
        this.kinds[idx] = TERRAIN_THRESHOLDS.findIndex((t) => h >= t.min)
      }
    }
  }

  /** シード付き乱数を1つ消費して返す(敵配置数など、地形生成に紐づけたい乱数用) */
  next(): number {
    return this.rng()
  }

  private clampCell(gx: number, gy: number): [number, number] {
    return [Math.max(0, Math.min(GRID_SIZE - 1, gx)), Math.max(0, Math.min(GRID_SIZE - 1, gy))]
  }

  heightAtCell(gx: number, gy: number): number {
    const [cx, cy] = this.clampCell(gx, gy)
    return this.heights[cy * GRID_SIZE + cx]
  }

  kindAtCell(gx: number, gy: number): TerrainKind {
    const [cx, cy] = this.clampCell(gx, gy)
    return TERRAIN_THRESHOLDS[this.kinds[cy * GRID_SIZE + cx]].kind
  }

  kindAtWorld(worldX: number, worldY: number): TerrainKind {
    return this.kindAtCell(Math.floor(worldX / CELL_SIZE), Math.floor(worldY / CELL_SIZE))
  }

  speedMultiplierAtWorld(worldX: number, worldY: number): number {
    return TERRAIN_SPEED_MULTIPLIER[this.kindAtWorld(worldX, worldY)]
  }

  /** 通行可能(impassableでない)なワールド座標をランダムに1つ探す。同じHeightMapのシード付き乱数を消費する。 */
  findPassableWorldPoint(avoid?: { x: number; y: number; minDist: number }): { x: number; y: number } {
    for (let attempt = 0; attempt < 500; attempt++) {
      const gx = Math.floor(this.rng() * GRID_SIZE)
      const gy = Math.floor(this.rng() * GRID_SIZE)
      const kind = this.kindAtCell(gx, gy)
      if (kind === 'impassable' || kind === 'mountain') continue

      const x = gx * CELL_SIZE + CELL_SIZE / 2
      const y = gy * CELL_SIZE + CELL_SIZE / 2

      if (avoid) {
        const d = Math.hypot(x - avoid.x, y - avoid.y)
        if (d < avoid.minDist) continue
      }
      return { x, y }
    }
    // フォールバック: ワールド中心
    return { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 }
  }
}
