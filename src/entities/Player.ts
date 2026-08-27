import Phaser from 'phaser'
import { PLAYER_BASE_SPEED } from '../config'
import type { HeightMap } from '../terrain/HeightMap'

export class Player {
  readonly view: Phaser.GameObjects.Triangle
  x: number
  y: number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x
    this.y = y
    // 進行方向を向く細長い二等辺三角形。4脚自走戦車の簡易マーカー(戦術HUD風に、塗りは薄く輪郭を明るく)。
    this.view = scene.add.triangle(x, y, 0, 20, 9, -10, -9, -10, 0x2fb8d8, 0.25)
    this.view.setStrokeStyle(2, 0x6fe3ff, 1)
  }

  update(dt: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys, heightMap: HeightMap) {
    let vx = 0
    let vy = 0
    if (cursors.left.isDown) vx -= 1
    if (cursors.right.isDown) vx += 1
    if (cursors.up.isDown) vy -= 1
    if (cursors.down.isDown) vy += 1

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy)
      vx /= len
      vy /= len
      this.view.setRotation(Math.atan2(vy, vx) - Math.PI / 2)
    }

    const speedMul = heightMap.speedMultiplierAtWorld(this.x, this.y)
    const speed = PLAYER_BASE_SPEED * speedMul

    this.x += vx * speed * dt
    this.y += vy * speed * dt

    this.view.setPosition(this.x, this.y)
  }
}
