import Phaser from 'phaser'
import { LOCK_INTERVAL_MS } from '../config'
import type { Enemy } from '../entities/Enemy'

/**
 * spotted済みの敵を常に自動で近い順にロックし続け(容量まで)、
 * スペースバーでロック中の全ターゲットに向けて一斉発射する。
 */
export class LockOnSystem {
  private locked: Enemy[] = []
  private readonly markers = new Map<Enemy, Phaser.GameObjects.Arc>()
  private msSinceLastLock = 0
  private readonly scene: Phaser.Scene
  private readonly onRelease: (targets: Enemy[]) => void
  private readonly spaceKey: Phaser.Input.Keyboard.Key

  constructor(scene: Phaser.Scene, onRelease: (targets: Enemy[]) => void) {
    this.scene = scene
    this.onRelease = onRelease
    this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.spaceKey.on('down', this.handleFire, this)
  }

  private handleFire = () => {
    if (this.locked.length === 0) return
    this.onRelease([...this.locked])
    this.clearLocks()
  }

  update(deltaMs: number, enemies: Enemy[], playerX: number, playerY: number, capacity: number) {
    for (const [enemy, marker] of this.markers) {
      marker.setPosition(enemy.x, enemy.y)
    }

    if (this.locked.length >= capacity) return

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
    this.spaceKey.off('down', this.handleFire, this)
    this.clearLocks()
  }
}
