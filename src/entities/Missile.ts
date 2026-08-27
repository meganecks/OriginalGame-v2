import Phaser from 'phaser'
import {
  MISSILE_ARC_HEIGHT,
  MISSILE_CRASH_CHECK_T_MAX,
  MISSILE_CRASH_CHECK_T_MIN,
  MISSILE_SPEED,
  MISSILE_SPIN_SPEED,
  MISSILE_TRAIL_COLOR,
  MISSILE_TRAIL_MAX_ALPHA,
  MISSILE_TRAIL_MAX_POINTS,
  MISSILE_TRAIL_WIDTH,
  TERRAIN_OBSTRUCTION_HEIGHT,
  type TerrainKind,
} from '../config'
import type { HeightMap } from '../terrain/HeightMap'
import type { Enemy } from './Enemy'

const HIT_DISTANCE = 14
const MIN_DURATION = 0.2 // 秒。極端に近距離でも一瞬で消えないための下限

/**
 * 発射地点から上空へ放物線(パラボラ)を描いて着弾するミサイル。
 * 見た目は常にくるくる回転(三角錐が回っているような演出)。
 * 弾道の高度が地形の遮蔽高さを下回ると、着弾前でも地形にクラッシュする。
 */
export class Missile {
  alive = true
  private groundX: number
  private groundY: number
  private readonly launchX: number
  private readonly launchY: number
  private readonly targetX: number
  private readonly targetY: number
  private readonly duration: number
  private t = 0
  private spinAngle: number
  private readonly view: Phaser.GameObjects.Graphics
  private readonly shadow: Phaser.GameObjects.Arc
  private readonly trail: Phaser.GameObjects.Graphics
  private readonly trailPoints: { x: number; y: number }[] = []
  private readonly scene: Phaser.Scene
  private readonly target: Enemy
  private readonly damage: number
  private readonly heightMap: HeightMap
  private readonly onHit: (enemy: Enemy, damage: number) => void
  private readonly onCrash: (x: number, y: number, kind: TerrainKind) => void

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    heightMap: HeightMap,
    onHit: (enemy: Enemy, damage: number) => void,
    onCrash: (x: number, y: number, kind: TerrainKind) => void,
  ) {
    this.launchX = x
    this.launchY = y
    this.groundX = x
    this.groundY = y
    this.targetX = target.x
    this.targetY = target.y
    this.target = target
    this.damage = damage
    this.heightMap = heightMap
    this.onHit = onHit
    this.onCrash = onCrash
    this.spinAngle = Math.random() * Math.PI * 2
    this.scene = scene

    const distance = Math.hypot(this.targetX - x, this.targetY - y)
    this.duration = Math.max(MIN_DURATION, distance / MISSILE_SPEED)

    this.trail = scene.add.graphics()
    this.trail.setDepth(14)
    this.shadow = scene.add.circle(x, y, 5, 0x000000, 0.35)
    this.shadow.setDepth(9)

    // 円錐を左右2面に割って明暗を塗り分け、中心稜線をハイライトすることで立体感を出す。
    // ローカル座標は元の三角形(頂点(0,9)、底辺(±6,-7))と同じにして、
    // setPosition/setRotation/setScaleの挙動を変えずに済ませる。
    this.view = scene.add.graphics()
    this.view.fillStyle(0xcc9a3d, 1) // 影側の面
    this.view.fillTriangle(0, 9, -6, -7, 0, -7)
    this.view.fillStyle(0xfff2c2, 1) // 光が当たる側の面
    this.view.fillTriangle(0, 9, 0, -7, 6, -7)
    this.view.lineStyle(1.5, 0xffffff, 0.9)
    this.view.lineBetween(0, 9, 0, -7) // 中心稜線のハイライト
    this.view.lineStyle(1, 0x8a5a1e, 0.8)
    this.view.strokeTriangle(0, 9, -6, -7, 6, -7) // 外周の縁取りで輪郭を締める
    this.view.setDepth(15)
  }

  update(dt: number) {
    if (!this.alive) return
    if (!this.target.alive) {
      this.destroy()
      return
    }

    this.t = Math.min(1, this.t + dt / this.duration)
    this.groundX = Phaser.Math.Linear(this.launchX, this.targetX, this.t)
    this.groundY = Phaser.Math.Linear(this.launchY, this.targetY, this.t)
    const altitude = MISSILE_ARC_HEIGHT * 4 * this.t * (1 - this.t)

    if (this.t > MISSILE_CRASH_CHECK_T_MIN && this.t < MISSILE_CRASH_CHECK_T_MAX) {
      const kind = this.heightMap.kindAtWorld(this.groundX, this.groundY)
      if (TERRAIN_OBSTRUCTION_HEIGHT[kind] > altitude) {
        this.onCrash(this.groundX, this.groundY, kind)
        this.destroy()
        return
      }
    }

    const distToTarget = Math.hypot(this.targetX - this.groundX, this.targetY - this.groundY)
    if (this.t >= 1 || distToTarget <= HIT_DISTANCE) {
      this.onHit(this.target, this.damage)
      this.destroy()
      return
    }

    this.spinAngle += MISSILE_SPIN_SPEED * dt
    const baseScale = 1 + (altitude / MISSILE_ARC_HEIGHT) * 0.5

    // 弾道(放物線)の接線方向を向かせる。高度の変化率も含めるので、上昇中は機首上げ、
    // 下降中は機首下げになる。その向きを保ったまま、機体の長軸まわりに回っている
    // ように見せるため、幅(scaleX)だけをコサインで振ってやる横回転(スピン)を重ねる。
    const dAltitude = MISSILE_ARC_HEIGHT * 4 * (1 - 2 * this.t)
    const velX = (this.targetX - this.launchX) / this.duration
    const velY = (this.targetY - this.launchY) / this.duration - dAltitude / this.duration
    const heading = Math.atan2(velY, velX)

    this.shadow.setPosition(this.groundX, this.groundY)
    this.view.setRotation(heading - Math.PI / 2)
    this.view.setScale(Math.cos(this.spinAngle) * baseScale, baseScale)
    this.view.setPosition(this.groundX, this.groundY - altitude)

    this.trailPoints.push({ x: this.groundX, y: this.groundY - altitude })
    if (this.trailPoints.length > MISSILE_TRAIL_MAX_POINTS) this.trailPoints.shift()
    this.redrawTrail()
  }

  private redrawTrail() {
    this.trail.clear()
    for (let i = 1; i < this.trailPoints.length; i++) {
      const from = this.trailPoints[i - 1]
      const to = this.trailPoints[i]
      const age = i / this.trailPoints.length // 0(古い)〜1(現在地に近い)
      this.trail.lineStyle(MISSILE_TRAIL_WIDTH, MISSILE_TRAIL_COLOR, age * MISSILE_TRAIL_MAX_ALPHA)
      this.trail.lineBetween(from.x, from.y, to.x, to.y)
    }
  }

  private destroy() {
    this.alive = false
    this.view.destroy()
    this.shadow.destroy()
    this.scene.tweens.add({
      targets: this.trail,
      alpha: 0,
      duration: 300,
      onComplete: () => this.trail.destroy(),
    })
  }
}
