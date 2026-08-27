import Phaser from 'phaser'
import {
  ENEMY_BASE_SIZE,
  ENEMY_CHASE_SPEED,
  ENEMY_SEPARATION_RADIUS,
  ENEMY_SEPARATION_STRENGTH,
  ENEMY_SIZE_PER_HP,
  ENEMY_STOP_DISTANCE,
} from '../config'
import type { HeightMap } from '../terrain/HeightMap'

const FILL_COLOR = 0xff5a5a
const FILL_ALPHA = 0.25

export class Enemy {
  x: number
  y: number
  alive = true
  spotted = false
  hp: number
  readonly maxHp: number
  readonly view: Phaser.GameObjects.Rectangle
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    this.x = x
    this.y = y
    this.hp = hp
    this.maxHp = hp
    this.scene = scene

    const size = ENEMY_BASE_SIZE + hp * ENEMY_SIZE_PER_HP
    this.view = scene.add.rectangle(x, y, size, size, FILL_COLOR, FILL_ALPHA)
    this.view.setStrokeStyle(2, 0xff8a8a, 1)
    this.view.setVisible(false)
  }

  /**
   * 常に自機へじわじわ接近する(索敵の有無に関わらず、地形の速度倍率は自機と同様に受ける)。
   * 自機への追跡(seek)と、近すぎる他の敵から離れる力(separation)を合成して移動方向を決める。
   * 自機の近くで足を止めた後もseparationだけは効き続けるため、一箇所に団子状に重ならず、
   * 自機を取り囲むように自然に広がる。
   */
  update(dt: number, playerX: number, playerY: number, heightMap: HeightMap, allEnemies: Enemy[]) {
    if (!this.alive) return

    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.hypot(dx, dy)
    const seekX = dist > ENEMY_STOP_DISTANCE ? dx / dist : 0
    const seekY = dist > ENEMY_STOP_DISTANCE ? dy / dist : 0

    let separateX = 0
    let separateY = 0
    for (const other of allEnemies) {
      if (other === this || !other.alive) continue
      const ox = this.x - other.x
      const oy = this.y - other.y
      const od = Math.hypot(ox, oy)
      if (od >= ENEMY_SEPARATION_RADIUS) continue
      if (od < 0.01) {
        // 完全に重なっていると方向が定まらないため、ランダムな向きに強く押し出す
        const angle = Math.random() * Math.PI * 2
        separateX += Math.cos(angle)
        separateY += Math.sin(angle)
        continue
      }
      const weight = (ENEMY_SEPARATION_RADIUS - od) / ENEMY_SEPARATION_RADIUS
      separateX += (ox / od) * weight
      separateY += (oy / od) * weight
    }

    let dirX = seekX + separateX * ENEMY_SEPARATION_STRENGTH
    let dirY = seekY + separateY * ENEMY_SEPARATION_STRENGTH
    const dirLen = Math.hypot(dirX, dirY)
    if (dirLen <= 0) return
    dirX /= dirLen
    dirY /= dirLen

    const speedMul = heightMap.speedMultiplierAtWorld(this.x, this.y)
    const speed = ENEMY_CHASE_SPEED * speedMul
    this.x += dirX * speed * dt
    this.y += dirY * speed * dt
    this.view.setPosition(this.x, this.y)
  }

  setSpotted(spotted: boolean) {
    if (this.spotted === spotted) return
    this.spotted = spotted
    this.view.setVisible(spotted && this.alive)
  }

  /** ダメージを与える。撃破したらtrueを返す(見た目の破棄はここで行う) */
  takeDamage(amount: number): boolean {
    this.hp -= amount
    if (this.hp <= 0) {
      this.destroy()
      return true
    }
    this.flashHit()
    return false
  }

  private flashHit() {
    this.view.setFillStyle(0xffffff, 0.8)
    this.scene.time.delayedCall(120, () => {
      if (this.alive) this.view.setFillStyle(FILL_COLOR, FILL_ALPHA)
    })
  }

  destroy() {
    this.alive = false
    this.view.destroy()
  }
}
