import Phaser from 'phaser'
import { CELL_SIZE, GRID_SIZE, TERRAIN_THRESHOLDS, type TerrainKind } from '../config'
import type { HeightMap } from './HeightMap'

// 戦術HUD風: 黒背景に低彩度のティント+等高線、というワイヤーフレーム的な見た目にする。
// 高さが上がるほど濃く・危険な色にする(水=蛍光ブルー→平地=無色→森=緑→山=濃緑)。
// impassable(進入不可の境界)だけは地形の色相グラデーションから外し、警告色(赤)のままにする。
const TERRAIN_TINT: Record<TerrainKind, { color: number; alpha: number }> = {
  river: { color: 0x00e5ff, alpha: 0.28 },
  plains: { color: 0x00e5ff, alpha: 0 },
  forest: { color: 0x2ecc71, alpha: 0.14 },
  mountain: { color: 0x146b3a, alpha: 0.45 },
  impassable: { color: 0xff5a5a, alpha: 0.16 },
}

// 地形種別の境界(主等高線): 明るくはっきり
const MAJOR_LINE_COLOR = 0xeaffff
const MAJOR_LINE_ALPHA = 0.55
// 種別境界とは別に、高さを細かく刻んだ副等高線: 薄く、地形図らしい密度を出す
const MINOR_LINE_COLOR = 0xeaffff
const MINOR_LINE_ALPHA = 0.12
const MINOR_CONTOUR_STEP = 0.08
const MINOR_CONTOUR_MIN = 0.1
const MINOR_CONTOUR_MAX = 1.15

// 地形種別境界の閾値(-Infinityのplains下限は除く)。塗りは高さの低い順に重ね塗りする
// (低い閾値の塗りの上に、高い閾値の塗りを重ねることで、しきい値をまたぐバンド状の塗り分けになる)。
const MAJOR_CONTOUR_LEVELS = TERRAIN_THRESHOLDS.map((t) => t.min).filter((min) => Number.isFinite(min))
const FILL_LEVELS_ASCENDING = [...MAJOR_CONTOUR_LEVELS].sort((x, y) => x - y)

// 主等高線に近すぎる副等高線は重なって煩雑になるため間引く
const MINOR_CONTOUR_LEVELS: number[] = []
for (let level = MINOR_CONTOUR_MIN; level <= MINOR_CONTOUR_MAX; level += MINOR_CONTOUR_STEP) {
  const tooCloseToMajor = MAJOR_CONTOUR_LEVELS.some((m) => Math.abs(m - level) < MINOR_CONTOUR_STEP / 2)
  if (!tooCloseToMajor) MINOR_CONTOUR_LEVELS.push(level)
}

function kindForHeight(h: number): TerrainKind {
  for (const t of TERRAIN_THRESHOLDS) {
    if (h >= t.min) return t.kind
  }
  return 'plains'
}

type Point = { x: number; y: number }

/** 1つの格子(gx,gy)-(gx+1,gy+1)の4隅の高さと、四隅・四辺の座標をまとめて返す */
function cellGeometry(heightMap: HeightMap, gx: number, gy: number) {
  const a = heightMap.heightAtCell(gx, gy) // top-left
  const b = heightMap.heightAtCell(gx + 1, gy) // top-right
  const c = heightMap.heightAtCell(gx + 1, gy + 1) // bottom-right
  const d = heightMap.heightAtCell(gx, gy + 1) // bottom-left

  const x0 = gx * CELL_SIZE
  const y0 = gy * CELL_SIZE
  const x1 = x0 + CELL_SIZE
  const y1 = y0 + CELL_SIZE

  const TL: Point = { x: x0, y: y0 }
  const TR: Point = { x: x1, y: y0 }
  const BR: Point = { x: x1, y: y1 }
  const BL: Point = { x: x0, y: y1 }

  const lerp = (v0: number, v1: number, threshold: number) => {
    const t = (threshold - v0) / (v1 - v0)
    return Math.max(0, Math.min(1, t))
  }

  return {
    a,
    b,
    c,
    d,
    TL,
    TR,
    BR,
    BL,
    edgePoint(which: 'top' | 'right' | 'bottom' | 'left', threshold: number): Point {
      switch (which) {
        case 'top':
          return { x: x0 + lerp(a, b, threshold) * CELL_SIZE, y: y0 }
        case 'right':
          return { x: x1, y: y0 + lerp(b, c, threshold) * CELL_SIZE }
        case 'bottom':
          return { x: x0 + lerp(d, c, threshold) * CELL_SIZE, y: y1 }
        case 'left':
          return { x: x0, y: y0 + lerp(a, d, threshold) * CELL_SIZE }
      }
    },
  }
}

/**
 * 1つの格子に対してマーチングスクエア法で threshold の等高線セグメントを求める。
 * 見つかったセグメントを [{from, to}] の配列で返す(鞍点ケースは2本になることがある)。
 */
function marchingSquaresSegments(
  heightMap: HeightMap,
  gx: number,
  gy: number,
  threshold: number,
): { from: Point; to: Point }[] {
  const cell = cellGeometry(heightMap, gx, gy)
  const A = cell.a >= threshold ? 1 : 0
  const B = cell.b >= threshold ? 1 : 0
  const C = cell.c >= threshold ? 1 : 0
  const D = cell.d >= threshold ? 1 : 0
  const caseIndex = A * 8 + B * 4 + C * 2 + D * 1
  if (caseIndex === 0 || caseIndex === 15) return []

  const top = cell.edgePoint('top', threshold)
  const right = cell.edgePoint('right', threshold)
  const bottom = cell.edgePoint('bottom', threshold)
  const left = cell.edgePoint('left', threshold)

  switch (caseIndex) {
    case 1:
      return [{ from: left, to: bottom }]
    case 2:
      return [{ from: bottom, to: right }]
    case 3:
      return [{ from: left, to: right }]
    case 4:
      return [{ from: top, to: right }]
    case 5:
      return [
        { from: top, to: left },
        { from: bottom, to: right },
      ]
    case 6:
      return [{ from: top, to: bottom }]
    case 7:
      return [{ from: top, to: left }]
    case 8:
      return [{ from: top, to: left }]
    case 9:
      return [{ from: top, to: bottom }]
    case 10:
      return [
        { from: top, to: right },
        { from: bottom, to: left },
      ]
    case 11:
      return [{ from: top, to: right }]
    case 12:
      return [{ from: left, to: right }]
    case 13:
      return [{ from: bottom, to: right }]
    case 14:
      return [{ from: left, to: bottom }]
    default:
      return []
  }
}

/**
 * 1つの格子に対して、「高さがthreshold以上の領域」をマーチングスクエア法でポリゴン化する。
 * 鞍点ケース(対角のみが条件を満たす)は2つの独立した三角形として返す。
 */
function aboveThresholdPolygons(heightMap: HeightMap, gx: number, gy: number, threshold: number): Point[][] {
  const cell = cellGeometry(heightMap, gx, gy)
  const states = [cell.a >= threshold, cell.b >= threshold, cell.c >= threshold, cell.d >= threshold]
  const caseIndex = (states[0] ? 8 : 0) + (states[1] ? 4 : 0) + (states[2] ? 2 : 0) + (states[3] ? 1 : 0)
  if (caseIndex === 0) return []
  if (caseIndex === 15) return [[cell.TL, cell.TR, cell.BR, cell.BL]]

  const top = cell.edgePoint('top', threshold)
  const right = cell.edgePoint('right', threshold)
  const bottom = cell.edgePoint('bottom', threshold)
  const left = cell.edgePoint('left', threshold)

  // 鞍点(対角のみ条件を満たす)は1本のポリゴンにすると蝶ネクタイ状に自己交差するため、
  // 2つの独立した三角形として塗る
  if (caseIndex === 5) return [[top, cell.TR, right], [bottom, cell.BL, left]]
  if (caseIndex === 10) return [[left, cell.TL, top], [right, cell.BR, bottom]]

  const corners = [cell.TL, cell.TR, cell.BR, cell.BL]
  const edges = [top, right, bottom, left]
  const polygon: Point[] = []
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4
    if (states[i]) polygon.push(corners[i])
    if (states[i] !== states[next]) polygon.push(edges[i])
  }
  return [polygon]
}

/**
 * カメラに映っている範囲のセルだけを毎フレーム塗り直す、戦術HUD風レンダラー。
 * 地形の塗りはマーチングスクエア法によるポリゴンで等高線に沿わせ、境界の等高線も同じ手法で滑らかに描く。
 * discovered(フォグオブウォー)未発見セルは描画しない。
 */
export class TerrainRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly heightMap: HeightMap
  private readonly isDiscovered: (gx: number, gy: number) => boolean

  constructor(scene: Phaser.Scene, heightMap: HeightMap, isDiscovered: (gx: number, gy: number) => boolean) {
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(-100)
    this.heightMap = heightMap
    this.isDiscovered = isDiscovered
  }

  redraw(camera: Phaser.Cameras.Scene2D.Camera) {
    const g = this.graphics
    g.clear()

    const view = camera.worldView
    const startGx = Math.max(0, Math.floor(view.x / CELL_SIZE) - 1)
    const startGy = Math.max(0, Math.floor(view.y / CELL_SIZE) - 1)
    const endGx = Math.min(GRID_SIZE - 1, Math.ceil((view.x + view.width) / CELL_SIZE) + 1)
    const endGy = Math.min(GRID_SIZE - 1, Math.ceil((view.y + view.height) / CELL_SIZE) + 1)

    // 1. 塗り: セルごとに、高さの低い閾値から高い閾値の順でポリゴンを重ね塗りする。
    // 低い閾値の塗り(そのセル全体を覆う大きめの領域)の上に、より高い閾値の塗り(その内側の
    // 小さい領域)を重ねることで、しきい値をまたぐバンドが自然に塗り分けられる。
    for (let gy = startGy; gy <= endGy; gy++) {
      for (let gx = startGx; gx <= endGx; gx++) {
        if (!this.isDiscovered(gx, gy)) continue

        for (const level of FILL_LEVELS_ASCENDING) {
          const kind = kindForHeight(level)
          const tint = TERRAIN_TINT[kind]
          if (tint.alpha <= 0) continue

          const polygons = aboveThresholdPolygons(this.heightMap, gx, gy, level)
          if (polygons.length === 0) continue

          g.fillStyle(tint.color, tint.alpha)
          for (const polygon of polygons) {
            g.fillPoints(
              polygon.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
              true,
            )
          }
        }
      }
    }

    // 2. 等高線はマーチングスクエア法で、格子点(セル中心の高さ)を補間しながら滑らかに描く。
    // 副等高線(薄い、細かい間隔)→主等高線(地形種別の境界、明るい)の順で重ね描きする。
    const drawContours = (levels: number[], lineWidth: number, color: number, alpha: number) => {
      g.lineStyle(lineWidth, color, alpha)
      for (const level of levels) {
        for (let gy = startGy; gy < endGy; gy++) {
          for (let gx = startGx; gx < endGx; gx++) {
            if (!this.isDiscovered(gx, gy)) continue
            const segments = marchingSquaresSegments(this.heightMap, gx, gy, level)
            for (const seg of segments) {
              g.lineBetween(seg.from.x, seg.from.y, seg.to.x, seg.to.y)
            }
          }
        }
      }
    }

    drawContours(MINOR_CONTOUR_LEVELS, 1, MINOR_LINE_COLOR, MINOR_LINE_ALPHA)
    drawContours(MAJOR_CONTOUR_LEVELS, 1.5, MAJOR_LINE_COLOR, MAJOR_LINE_ALPHA)
  }
}
