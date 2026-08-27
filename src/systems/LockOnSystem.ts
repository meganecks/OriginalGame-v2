import Phaser from 'phaser'
import { LOCK_INTERVAL_MS } from '../config'
import type { Enemy } from '../entities/Enemy'

/**
 * ポインタ(マウス/タッチ共通)の長押しでspotted済みの敵を近い順に順次ロックし、
 * リリースでロックした全ターゲットをコールバックに渡す。
 */
export class LockOnSystem {
  private locked: Enemy[] = []
  private readonly markers = new Map<Enemy, Phaser.GameObjects.Arc>()
  private holding = false
  private msSinceLastLock = 0
  private readonly scene: Phaser.Scene
  private readonly onRelease: (targets: Enemy[]) => void

  constructor(scene: Phaser.Scene, onRelease: (targets: Enemy[]) => void) {
    this.scene = scene
    this.onRelease = onRelease
    scene.input.on('pointerdown', this.handlePointerDown, this)
    scene.input.on('pointerup', this.handlePointerUp, this)
  }

  private handlePointerDown = () => {
    this.holding = true
    this.msSinceLastLock = LOCK_INTERVAL_MS // 押した瞬間に1体目をロックする
  }

  private handlePointerUp = () => {
    this.holding = false
    if (this.locked.length > 0) {
      this.onRelease([...this.locked])
    }
    this.clearLocks()
  }

  update(deltaMs: number, enemies: Enemy[], playerX: number, playerY: number, capacity: number) {
    for (const [enemy, marker] of this.markers) {
      marker.setPosition(enemy.x, enemy.y)
    }

    if (!this.holding || this.locked.length >= capacity) return

    this.msSinceLastLock += deltaMs
    if (this.msSinceLastLock < LOCK_INTERVAL_MS) return
    this.msSinceLastLock = 0

    let best: Enemy | null = null
    let bestDist = Infinity
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.spotted || this.locked.includes(enemy)) continue
      const d = Math.hypot(enemy.x - playerX, enemy.y - playerY)
      if (d < bestDist) {
        bestDist = d
        best = enemy
      }
    }
    if (!best) return

    this.locked.push(best)
    const marker = this.scene.add.circle(best.x, best.y, 14)
    marker.setStrokeStyle(2, 0xffe066, 1)
    marker.setDepth(20)
    this.markers.set(best, marker)
  }

  currentLockCount(): number {
    return this.locked.length
  }

  private clearLocks() {
    for (const marker of this.markers.values()) marker.destroy()
    this.markers.clear()
    this.locked = []
  }

  destroy() {
    this.scene.input.off('pointerdown', this.handlePointerDown, this)
    this.scene.input.off('pointerup', this.handlePointerUp, this)
    this.clearLocks()
  }
}
