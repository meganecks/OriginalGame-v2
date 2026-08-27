import Phaser from 'phaser'
import {
  DRONE_COUNT,
  DRONE_TETHER_ALPHA,
  DRONE_TETHER_COLOR,
  ENEMY_COUNT_MAX,
  ENEMY_COUNT_MIN,
  ENEMY_MIN_SPAWN_DISTANCE,
  MISSILE_LAUNCH_STAGGER_MS,
  WORLD_SIZE,
} from '../config'
import { Drone } from '../entities/Drone'
import { Enemy } from '../entities/Enemy'
import { Missile } from '../entities/Missile'
import { Player } from '../entities/Player'
import { FogOfWar } from '../systems/FogOfWar'
import { LockOnSystem } from '../systems/LockOnSystem'
import { ProgressionSystem } from '../systems/ProgressionSystem'
import { HeightMap } from '../terrain/HeightMap'
import { TerrainRenderer } from '../terrain/TerrainRenderer'

export class MainScene extends Phaser.Scene {
  private heightMap!: HeightMap
  private fogOfWar!: FogOfWar
  private terrainRenderer!: TerrainRenderer
  private player!: Player
  private drones: Drone[] = []
  private enemies: Enemy[] = []
  private missiles: Missile[] = []
  private lockOnSystem!: LockOnSystem
  private progression = new ProgressionSystem()
  private droneTethers!: Phaser.GameObjects.Graphics
  private hudText!: Phaser.GameObjects.Text
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

    const enemyCount =
      ENEMY_COUNT_MIN + Math.floor(this.heightMap.next() * (ENEMY_COUNT_MAX - ENEMY_COUNT_MIN + 1))
    this.enemies = Array.from({ length: enemyCount }, () => {
      const p = this.heightMap.findPassableWorldPoint({ x: spawn.x, y: spawn.y, minDist: ENEMY_MIN_SPAWN_DISTANCE })
      return new Enemy(this, p.x, p.y)
    })

    this.lockOnSystem = new LockOnSystem(this, (targets) => this.launchMissileVolley(targets))

    this.droneTethers = this.add.graphics()
    this.droneTethers.setDepth(-40)

    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.startFollow(this.player.view, true, 0.1, 0.1)

    this.add
      .text(20, 16, 'Original Game', { fontSize: '20px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100)

    this.hudText = this.add
      .text(20, 44, '', { fontSize: '14px', color: '#6fe3ff' })
      .setScrollFactor(0)
      .setDepth(100)

    this.cursors = this.input.keyboard!.createCursorKeys()
  }

  update(time: number, deltaMs: number) {
    const dt = deltaMs / 1000
    this.player.update(dt, this.cursors, this.heightMap)

    this.droneTethers.clear()
    this.droneTethers.lineStyle(1, DRONE_TETHER_COLOR, DRONE_TETHER_ALPHA)
    for (const drone of this.drones) {
      drone.update(time, this.player.x, this.player.y)
      this.fogOfWar.revealCircle(drone.x, drone.y, drone.sensorRadius())
      this.droneTethers.lineBetween(this.player.x, this.player.y, drone.x, drone.y)
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const spotted = this.drones.some(
        (drone) => Math.hypot(drone.x - enemy.x, drone.y - enemy.y) <= drone.sensorRadius(),
      )
      enemy.setSpotted(spotted)
    }

    this.lockOnSystem.update(deltaMs, this.enemies, this.player.x, this.player.y, this.progression.lockCapacity)

    for (const missile of this.missiles) {
      missile.update(dt)
    }
    this.missiles = this.missiles.filter((m) => m.alive)

    this.terrainRenderer.redraw(this.cameras.main)
    this.hudText.setText(
      `Lock: ${this.lockOnSystem.currentLockCount()}/${this.progression.lockCapacity}   Kills: ${this.progression.kills}`,
    )
  }

  private launchMissileVolley(targets: Enemy[]) {
    targets.forEach((target, i) => {
      this.time.delayedCall(i * MISSILE_LAUNCH_STAGGER_MS, () => {
        if (!target.alive) return
        this.missiles.push(
          new Missile(this, this.player.x, this.player.y, target, (enemy) => this.handleMissileHit(enemy)),
        )
      })
    })
  }

  private handleMissileHit(enemy: Enemy) {
    this.spawnExplosion(enemy.x, enemy.y)
    enemy.destroy()
    this.progression.registerKill()
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
}
