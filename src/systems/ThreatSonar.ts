import Phaser from 'phaser'
import {
  SONAR_BASE_ALPHA,
  SONAR_BASE_RADIUS,
  SONAR_CALM_COLOR,
  SONAR_LINE_WIDTH,
  SONAR_LOBE_SHARPNESS,
  SONAR_LOBE_WIDTH,
  SONAR_MAX_BUMP,
  SONAR_MAX_RANGE,
  SONAR_SEGMENTS,
  SONAR_THREAT_COLOR,
  SONAR_WAVE_BASE_AMPLITUDE,
  SONAR_WAVE_FREQUENCY,
  SONAR_WAVE_SPEED,
} from '../config'
import type { Enemy } from '../entities/Enemy'

function lerpColor(colorA: number, colorB: number, t: number): number {
  const ar = (colorA >> 16) & 0xff
  const ag = (colorA >> 8) & 0xff
  const ab = colorA & 0xff
  const br = (colorB >> 16) & 0xff
  const bg = (colorB >> 8) & 0xff
  const bb = colorB & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const b = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | b
}

/**
 * 自機を中心にした固定半径の円周上を、常に位相が回り続ける波形(オシロスコープ風)が
 * 伝っている表現。拡散して消える波紋ではなく、その場で揺れ続ける波を描く。
 * 敵がいる方角は波の振幅が大きくなり、シアン→赤に色が変わる。spottedに関わらず、
 * 一定距離以内の生存中の敵すべてが寄与する(視覚とは別の察知レイヤー)。
 */
export class ThreatSonar {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly amps = new Float32Array(SONAR_SEGMENTS)

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(-45)
  }

  redraw(playerX: number, playerY: number, enemies: Enemy[], timeMs: number) {
    this.computeAmps(playerX, playerY, enemies)

    const t = timeMs / 1000
    const points: { x: number; y: number }[] = []
    for (let i = 0; i <= SONAR_SEGMENTS; i++) {
      const idx = i % SONAR_SEGMENTS
      const angle = (idx / SONAR_SEGMENTS) * Math.PI * 2
      const localAmplitude = SONAR_WAVE_BASE_AMPLITUDE + this.amps[idx]
      const wave = Math.sin(angle * SONAR_WAVE_FREQUENCY + t * SONAR_WAVE_SPEED) * localAmplitude
      const r = SONAR_BASE_RADIUS + wave
      points.push({ x: playerX + Math.cos(angle) * r, y: playerY + Math.sin(angle) * r })
    }

    const g = this.graphics
    g.clear()
    for (let i = 0; i < SONAR_SEGMENTS; i++) {
      const intensity = Phaser.Math.Clamp(this.amps[i] / SONAR_MAX_BUMP, 0, 1)
      const color = lerpColor(SONAR_CALM_COLOR, SONAR_THREAT_COLOR, intensity)
      g.lineStyle(SONAR_LINE_WIDTH, color, SONAR_BASE_ALPHA + intensity * 0.4)
      g.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
    }
  }

  private computeAmps(playerX: number, playerY: number, enemies: Enemy[]) {
    this.amps.fill(0)

    for (const enemy of enemies) {
      if (!enemy.alive) continue
      const dx = enemy.x - playerX
      const dy = enemy.y - playerY
      const dist = Math.hypot(dx, dy)
      if (dist > SONAR_MAX_RANGE) continue

      const bearing = Math.atan2(dy, dx)
      const strength = SONAR_MAX_BUMP * (1 - dist / SONAR_MAX_RANGE)

      for (let i = 0; i < SONAR_SEGMENTS; i++) {
        const segAngle = (i / SONAR_SEGMENTS) * Math.PI * 2
        const diff = Phaser.Math.Angle.Wrap(segAngle - bearing)
        if (Math.abs(diff) > SONAR_LOBE_WIDTH) continue
        const lobe = Math.cos((diff / SONAR_LOBE_WIDTH) * (Math.PI / 2)) ** SONAR_LOBE_SHARPNESS
        const contribution = strength * lobe
        if (contribution > this.amps[i]) this.amps[i] = contribution
      }
    }
  }
}
