import { GRID_SIZE, CELL_SIZE } from '../config'

/**
 * 地形の発見状態(永続)を管理する。一度ドローンの索敵範囲に入ったセルは
 * discovered のまま残る。「現在敵が見えるか」はこのクラスの範囲外(Droneが持つ)。
 */
export class FogOfWar {
  private readonly discovered: Uint8Array

  constructor() {
    this.discovered = new Uint8Array(GRID_SIZE * GRID_SIZE)
  }

  isDiscoveredCell(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false
    return this.discovered[gy * GRID_SIZE + gx] === 1
  }

  /** ワールド座標を中心に半径radius(px)以内のセルを発見済みにする */
  revealCircle(worldX: number, worldY: number, radius: number) {
    const cellRadius = Math.ceil(radius / CELL_SIZE) + 1
    const centerGx = Math.floor(worldX / CELL_SIZE)
    const centerGy = Math.floor(worldY / CELL_SIZE)

    for (let gy = centerGy - cellRadius; gy <= centerGy + cellRadius; gy++) {
      for (let gx = centerGx - cellRadius; gx <= centerGx + cellRadius; gx++) {
        if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) continue
        const cellCenterX = gx * CELL_SIZE + CELL_SIZE / 2
        const cellCenterY = gy * CELL_SIZE + CELL_SIZE / 2
        if (Math.hypot(cellCenterX - worldX, cellCenterY - worldY) <= radius) {
          this.discovered[gy * GRID_SIZE + gx] = 1
        }
      }
    }
  }
}
