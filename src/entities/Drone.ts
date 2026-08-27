import Phaser from 'phaser'
import {
  DRONE_ANGLE_WOBBLE,
  DRONE_ANGLE_WOBBLE_SPEED,
  DRONE_ORBIT_RADIUS,
  DRONE_ORBIT_SPEED,
  DRONE_RADIUS_WOBBLE,
  DRONE_RADIUS_WOBBLE_SPEED,
  DRONE_SENSOR_RADIUS,
} from '../config'

/**
 * 自機に自動追従するドローン。索敵範囲(センサー円)を持つ。
 * 3機を等間隔に配置し、自機の周りを回りながら、半径と角速度に揺らぎを加えて
 * 「敵を探している」ような有機的な動きにする。
 */
export class Drone {
  x: number
  y: number
  private readonly view: Phaser.GameObjects.Arc
  private readonly sensorView: Phaser.GameObjects.Arc
  private readonly angleOffset: number
  private readonly phase: number

  constructor(scene: Phaser.Scene, angleOffset: number) {
    this.angleOffset = angleOffset
    this.phase = angleOffset * 37.1 // 各機の揺らぎがずれるように適当な無理数比でずらす
    this.x = 0
    this.y = 0
    this.sensorView = scene.add.circle(0, 0, DRONE_SENSOR_RADIUS, 0x2fb8d8, 0.05)
    this.sensorView.setStrokeStyle(1, 0x2fb8d8, 0.25)
    this.sensorView.setDepth(-50)
    this.view = scene.add.circle(0, 0, 4, 0x6fe3ff, 1)
    this.view.setDepth(10)
  }

  update(timeMs: number, playerX: number, playerY: number) {
    const t = timeMs / 1000
    const baseAngle = t * DRONE_ORBIT_SPEED + this.angleOffset
    const angle = baseAngle + Math.sin(t * DRONE_ANGLE_WOBBLE_SPEED + this.phase) * DRONE_ANGLE_WOBBLE
    const radius = DRONE_ORBIT_RADIUS + Math.sin(t * DRONE_RADIUS_WOBBLE_SPEED + this.phase) * DRONE_RADIUS_WOBBLE

    this.x = playerX + Math.cos(angle) * radius
    this.y = playerY + Math.sin(angle) * radius
    this.view.setPosition(this.x, this.y)
    this.sensorView.setPosition(this.x, this.y)
  }

  sensorRadius(): number {
    return DRONE_SENSOR_RADIUS
  }
}
