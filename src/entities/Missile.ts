import Phaser from 'phaser'
import { MISSILE_SPEED } from '../config'
import type { Enemy } from './Enemy'

const HIT_DISTANCE = 12

export class Missile {
  alive = true
  private x: number
  private y: number
  private readonly view: Phaser.GameObjects.Triangle
  private readonly target: Enemy
  private readonly onHit: (enemy: Enemy) => void

  constructor(scene: Phaser.Scene, x: number, y: number, target: Enemy, onHit: (enemy: Enemy) => void) {
    this.x = x
    this.y = y
    this.target = target
    this.onHit = onHit
    this.view = scene.add.triangle(x, y, 0, 7, 5, -6, -5, -6, 0xffe066)
    this.view.setDepth(15)
  }

  update(dt: number) {
    if (!this.alive) return
    if (!this.target.alive) {
      this.destroy()
      return
    }

    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist <= HIT_DISTANCE) {
      this.onHit(this.target)
      this.destroy()
      return
    }

    const angle = Math.atan2(dy, dx)
    this.view.setRotation(angle - Math.PI / 2)
    this.x += Math.cos(angle) * MISSILE_SPEED * dt
    this.y += Math.sin(angle) * MISSILE_SPEED * dt
    this.view.setPosition(this.x, this.y)
  }

  private destroy() {
    this.alive = false
    this.view.destroy()
  }
}
