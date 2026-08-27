import Phaser from 'phaser'
import {
  CAMERA_ZOOM,
  DRONE_COUNT,
  DRONE_TETHER_ALPHA,
  DRONE_TETHER_COLOR,
  ENEMY_HP_MAX,
  ENEMY_HP_MIN,
  KILL_MARK_ALPHA,
  KILL_MARK_COLOR,
  KILL_MARK_FADE_MS,
  KILL_MARK_HOLD_MS,
  KILL_MARK_LINE_WIDTH,
  KILL_MARK_SIZE,
  MISSILE_BASE_DAMAGE,
  MISSILE_LAUNCH_STAGGER_MS,
  TERRAIN_DAMAGE_MULTIPLIER,
  TERRAIN_SPEED_MULTIPLIER,
  UI_SCALE,
  WAVE_APPROACHES_MAX,
  WAVE_APPROACHES_MIN,
  WAVE_BASE_ENEMIES_PER_APPROACH,
  WAVE_GROWTH_EVERY_N_WAVES,
  WAVE_SCATTER_RADIUS,
  WAVE_SPAWN_RADIUS,
  WORLD_SIZE,
  type TerrainKind,
} from '../config'
import { Drone } from '../entities/Drone'
import { Enemy } from '../entities/Enemy'
import { Missile } from '../entities/Missile'
import { Player } from '../entities/Player'
import { EventLog } from '../systems/EventLog'
import { FogOfWar } from '../systems/FogOfWar'
import { LockOnSystem } from '../systems/LockOnSystem'
import { ProgressionSystem } from '../systems/ProgressionSystem'
import { ThreatSonar } from '../systems/ThreatSonar'
import { WaveSystem } from '../systems/WaveSystem'
import { HeightMap } from '../terrain/HeightMap'
import { TerrainRenderer } from '../terrain/TerrainRenderer'

const TERRAIN_LOG_LABEL: Record<TerrainKind, string> = {
  river: 'crossing river',
  plains: 'plains',
  forest: 'moving through forest',
  mountain: 'mountain terrain',
  impassable: 'impassable terrain',
}

export class MainScene extends Phaser.Scene {
  private heightMap!: HeightMap
  private fogOfWar!: FogOfWar
  private terrainRenderer!: TerrainRenderer
  private player!: Player
  private drones: Drone[] = []
  private enemies: Enemy[] = []
  private missiles: Missile[] = []
  private lockOnSystem!: LockOnSystem
  private waveSystem!: WaveSystem
  private threatSonar!: ThreatSonar
  private progression = new ProgressionSystem()
  private droneTethers!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
  private eventLog!: EventLog
  private lastTerrainKind: TerrainKind | null = null
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super('Main')
  }

  create() {
    const seed = Date.now()
    this.heightMap = new HeightMap(seed)
    this.fogOfWar = new FogOfWar()

    this.terrainRenderer = new TerrainRenderer(this, this.heightMap, (gx, gy) =>
      this.fogOfWar.isDiscoveredCell(gx, gy),
    )

    const spawn = this.heightMap.findPassableWorldPoint()
    this.player = new Player(this, spawn.x, spawn.y)

    this.drones = Array.from(
      { length: DRONE_COUNT },
      (_, i) => new Drone(this, (i / DRONE_COUNT) * Math.PI * 2),
    )

    this.lockOnSystem = new LockOnSystem(this, (targets) => this.launchMissileVolley(targets))
    this.waveSystem = new WaveSystem((waveNumber) => this.spawnWave(waveNumber))
    this.threatSonar = new ThreatSonar(this)

    this.droneTethers = this.add.graphics()
    this.droneTethers.setDepth(-40)

    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.startFollow(this.player.view, true, 0.18, 0.18)
    this.cameras.main.setZoom(CAMERA_ZOOM)

    this.add
      .text(20 * UI_SCALE, 16 * UI_SCALE, 'Original Game', { fontSize: '20px', color: '#ffffff' })
      .setScrollFactor(0)
      .setScale(UI_SCALE)
      .setDepth(100)

    this.hudText = this.add
      .text(20 * UI_SCALE, 44 * UI_SCALE, '', { fontSize: '14px', color: '#6fe3ff' })
      .setScrollFactor(0)
      .setScale(UI_SCALE)
      .setDepth(100)

    this.eventLog = new EventLog(this)
    this.waveSystem.start()

    this.cursors = this.input.keyboard!.createCursorKeys()
  }

  update(time: number, deltaMs: number) {
    const dt = deltaMs / 1000
    this.player.update(dt, this.cursors, this.heightMap)

    const terrainKind = this.heightMap.kindAtWorld(this.player.x, this.player.y)
    if (terrainKind !== this.lastTerrainKind) {
      this.logTerrainStatus(terrainKind, this.lastTerrainKind === null)
      this.lastTerrainKind = terrainKind
    }
    this.eventLog.update(time)

    this.droneTethers.clear()
    this.droneTethers.lineStyle(1, DRONE_TETHER_COLOR, DRONE_TETHER_ALPHA)
    for (const drone of this.drones) {
      drone.update(time, this.player.x, this.player.y)
      this.fogOfWar.revealCircle(drone.x, drone.y, drone.sensorRadius())
      this.droneTethers.lineBetween(this.player.x, this.player.y, drone.x, drone.y)
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      enemy.update(dt, this.player.x, this.player.y, this.heightMap, this.enemies)
      const spotted = this.drones.some(
        (drone) => Math.hypot(drone.x - enemy.x, drone.y - enemy.y) <= drone.sensorRadius(),
      )
      if (spotted && !enemy.spotted) {
        this.eventLog.push('Contact: enemy spotted', '#ff8a8a')
      }
      enemy.setSpotted(spotted)
    }

    this.lockOnSystem.update(deltaMs, this.enemies, this.player.x, this.player.y, this.progression.lockCapacity)
    this.waveSystem.update(deltaMs)

    for (const missile of this.missiles) {
      missile.update(dt)
    }
    this.missiles = this.missiles.filter((m) => m.alive)

    this.terrainRenderer.redraw(this.cameras.main)
    this.threatSonar.redraw(this.player.x, this.player.y, this.enemies, time)
    this.hudText.setText(
      `Lock: ${this.lockOnSystem.currentLockCount()}/${this.progression.lockCapacity}   Kills: ${this.progression.kills}`,
    )
  }

  private logTerrainStatus(kind: TerrainKind, isInitial: boolean) {
    const multiplier = TERRAIN_SPEED_MULTIPLIER[kind]
    const pct = Math.round(multiplier * 100)
    const label = TERRAIN_LOG_LABEL[kind]

    if (isInitial) {
      this.eventLog.push(`Status: ${label} (${pct}% speed)`, multiplier < 1 ? '#ffcf6f' : '#6fe3ff')
    } else if (multiplier < 1) {
      this.eventLog.push(`Speed down: ${label} (${pct}%)`, '#ffcf6f')
    } else {
      this.eventLog.push(`Speed up: ${label} (${pct}%)`, '#6fe3ff')
    }
  }

  private launchMissileVolley(targets: Enemy[]) {
    // 発射時に自機がいる地形が高いほど威力が上がる(高所からの攻撃ボーナス)
    const launchKind = this.heightMap.kindAtWorld(this.player.x, this.player.y)
    const multiplier = TERRAIN_DAMAGE_MULTIPLIER[launchKind]
    const damage = Math.round(MISSILE_BASE_DAMAGE * multiplier)

    const bonusNote = multiplier > 1 ? ` (high ground x${multiplier})` : ''
    this.eventLog.push(`Missiles launched: ${targets.length} locked, dmg ${damage}${bonusNote}`, '#ffe066')

    targets.forEach((target, i) => {
      this.time.delayedCall(i * MISSILE_LAUNCH_STAGGER_MS, () => {
        if (!target.alive) return
        this.missiles.push(
          new Missile(
            this,
            this.player.x,
            this.player.y,
            target,
            damage,
            this.heightMap,
            (enemy, dmg) => this.handleMissileHit(enemy, dmg),
            (x, y, kind) => this.handleMissileCrash(x, y, kind),
          ),
        )
      })
    })
  }

  private handleMissileHit(enemy: Enemy, damage: number) {
    const died = enemy.takeDamage(damage)
    if (died) {
      this.spawnExplosion(enemy.x, enemy.y)
      this.spawnKillMark(enemy.x, enemy.y)
      this.progression.registerKill()
      this.eventLog.push(`Target destroyed (total: ${this.progression.kills})`, '#7dffb3')
    } else {
      this.eventLog.push(`Hit: enemy HP ${enemy.hp}/${enemy.maxHp}`, '#ffcf6f')
    }
  }

  private spawnKillMark(x: number, y: number) {
    const mark = this.add.graphics()
    mark.setDepth(25)
    mark.lineStyle(KILL_MARK_LINE_WIDTH, KILL_MARK_COLOR, KILL_MARK_ALPHA)
    mark.lineBetween(x - KILL_MARK_SIZE, y - KILL_MARK_SIZE, x + KILL_MARK_SIZE, y + KILL_MARK_SIZE)
    mark.lineBetween(x - KILL_MARK_SIZE, y + KILL_MARK_SIZE, x + KILL_MARK_SIZE, y - KILL_MARK_SIZE)
    this.tweens.add({
      targets: mark,
      alpha: 0,
      delay: KILL_MARK_HOLD_MS,
      duration: KILL_MARK_FADE_MS,
      onComplete: () => mark.destroy(),
    })
  }

  private spawnWave(waveNumber: number) {
    const approaches =
      WAVE_APPROACHES_MIN + Math.floor(this.heightMap.next() * (WAVE_APPROACHES_MAX - WAVE_APPROACHES_MIN + 1))
    const enemiesPerApproach = WAVE_BASE_ENEMIES_PER_APPROACH + Math.floor((waveNumber - 1) / WAVE_GROWTH_EVERY_N_WAVES)

    let spawned = 0
    for (let a = 0; a < approaches; a++) {
      const angle = this.heightMap.next() * Math.PI * 2
      const originX = this.player.x + Math.cos(angle) * WAVE_SPAWN_RADIUS
      const originY = this.player.y + Math.sin(angle) * WAVE_SPAWN_RADIUS

      for (let i = 0; i < enemiesPerApproach; i++) {
        const p = this.heightMap.findPassableWorldPointNear(originX, originY, WAVE_SCATTER_RADIUS)
        const hp = ENEMY_HP_MIN + Math.floor(this.heightMap.next() * (ENEMY_HP_MAX - ENEMY_HP_MIN + 1))
        this.enemies.push(new Enemy(this, p.x, p.y, hp))
        spawned += 1
      }
    }

    this.eventLog.push(`Wave ${waveNumber}: ${spawned} hostiles from ${approaches} approaches`, '#ff8a8a')
  }

  private handleMissileCrash(x: number, y: number, kind: TerrainKind) {
    this.spawnCrash(x, y)
    this.eventLog.push(`Missile lost: blocked by ${TERRAIN_LOG_LABEL[kind]}`, '#ffcf6f')
  }

  private spawnExplosion(x: number, y: number) {
    const circle = this.add.circle(x, y, 10, 0xffe066, 0.9)
    circle.setDepth(30)
    this.tweens.add({
      targets: circle,
      scale: 3,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    })
  }

  private spawnCrash(x: number, y: number) {
    const burst = this.add.circle(x, y, 8, 0xff8a5a, 0.8)
    burst.setDepth(30)
    this.tweens.add({
      targets: burst,
      scale: 2.2,
      alpha: 0,
      duration: 350,
      onComplete: () => burst.destroy(),
    })

    // 破片が飛び散る演出
    const debris = this.add.graphics()
    debris.setDepth(29)
    debris.lineStyle(2, 0xffcf6f, 0.9)
    const fragments = 4
    for (let i = 0; i < fragments; i++) {
      const angle = (i / fragments) * Math.PI * 2 + Math.random() * 0.6
      const dist = 14 + Math.random() * 6
      debris.lineBetween(x, y, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist)
    }
    this.tweens.add({
      targets: debris,
      alpha: 0,
      duration: 300,
      onComplete: () => debris.destroy(),
    })
  }
}
