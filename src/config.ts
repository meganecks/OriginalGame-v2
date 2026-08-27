export const CANVAS_WIDTH = 960
export const CANVAS_HEIGHT = 540

export const CELL_SIZE = 32
export const GRID_SIZE = 120 // 120x120 cells
export const WORLD_SIZE = CELL_SIZE * GRID_SIZE

export const TERRAIN_KINDS = ['river', 'plains', 'forest', 'mountain', 'impassable'] as const
export type TerrainKind = (typeof TERRAIN_KINDS)[number]

// 高さ(0〜1、境界フォールオフ加算後)の閾値。この順で上から判定する。
export const TERRAIN_THRESHOLDS: { kind: TerrainKind; min: number }[] = [
  { kind: 'impassable', min: 0.85 },
  { kind: 'mountain', min: 0.68 },
  { kind: 'forest', min: 0.5 },
  { kind: 'river', min: 0.38 },
  { kind: 'plains', min: -Infinity },
]

export const TERRAIN_SPEED_MULTIPLIER: Record<TerrainKind, number> = {
  river: 0.4,
  plains: 1.0,
  forest: 0.6,
  mountain: 0.3,
  impassable: 0.02,
}

// マップ中心からの距離(0=中心, 1=最外周)に応じた境界フォールオフの強さ
export const EDGE_FALLOFF_START = 0.65 // このradiusを超えると高さの底上げが始まる
export const EDGE_FALLOFF_STRENGTH = 1.2

export const PLAYER_BASE_SPEED = 160

export const DRONE_COUNT = 3
export const DRONE_SENSOR_RADIUS = 140
export const DRONE_ORBIT_RADIUS = 130
export const DRONE_ORBIT_SPEED = 0.6 // rad/sec
// 「敵を探している」ような有機的な動きにするための揺らぎ(円軌道に半径・角速度の波を重ねる)
export const DRONE_RADIUS_WOBBLE = 26
export const DRONE_RADIUS_WOBBLE_SPEED = 0.5 // rad/sec
export const DRONE_ANGLE_WOBBLE = 0.35 // rad
export const DRONE_ANGLE_WOBBLE_SPEED = 0.35 // rad/sec
// 自機とドローンをつなぐ薄い線
export const DRONE_TETHER_COLOR = 0x2fb8d8
export const DRONE_TETHER_ALPHA = 0.18

export const ENEMY_COUNT_MIN = 15
export const ENEMY_COUNT_MAX = 25
export const ENEMY_MIN_SPAWN_DISTANCE = 260 // プレイヤースポーンからの最小距離(px)

export const LOCK_INTERVAL_MS = 150
export const LOCK_CAPACITY_INITIAL = 2
export const LOCK_CAPACITY_MAX = 6
export const LOCK_RANGE = DRONE_SENSOR_RADIUS + DRONE_ORBIT_RADIUS
export const KILLS_PER_CAPACITY_UP = 3

export const MISSILE_SPEED = 320
export const MISSILE_LAUNCH_STAGGER_MS = 80
