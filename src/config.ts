export const CANVAS_WIDTH = 960
export const CANVAS_HEIGHT = 540
// カメラをズームアウトして、戦場全体・ミサイルの発射〜撃破をより俯瞰で見せる
export const CAMERA_ZOOM = 0.65
// scrollFactor(0)のHUD要素もカメラズームの影響を受けて縮んでしまうため、
// 位置とスケールにこれを掛けて見た目のサイズ・配置を打ち消す(zoom=1のときと同じ見た目になる)
export const UI_SCALE = 1 / CAMERA_ZOOM

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

export const PLAYER_BASE_SPEED = 240

export const DRONE_COUNT = 3
export const DRONE_SENSOR_RADIUS = 190
export const DRONE_ORBIT_RADIUS = 260
export const DRONE_ORBIT_SPEED = 0.8 // rad/sec
// 「敵を探して虫のようにうようよ動く」ための揺らぎ。周期の違う2層のサイン波を
// 半径・角速度それぞれに重ねることで、単純な円軌道に見えない不規則な動きにする。
export const DRONE_RADIUS_WOBBLE = 75
export const DRONE_RADIUS_WOBBLE_SPEED = 1.1 // rad/sec
export const DRONE_RADIUS_WOBBLE_2 = 35
export const DRONE_RADIUS_WOBBLE_SPEED_2 = 2.6 // rad/sec
export const DRONE_ANGLE_WOBBLE = 0.6 // rad
export const DRONE_ANGLE_WOBBLE_SPEED = 0.9 // rad/sec
export const DRONE_ANGLE_WOBBLE_2 = 0.35 // rad
export const DRONE_ANGLE_WOBBLE_SPEED_2 = 2.1 // rad/sec
// 自機とドローンをつなぐ薄い線
export const DRONE_TETHER_COLOR = 0x2fb8d8
export const DRONE_TETHER_ALPHA = 0.18

// 敵は常に自機へじわじわ接近する(追い詰めてくる)。地形の速度倍率も自機と同様に適用する。
export const ENEMY_CHASE_SPEED = 120
export const ENEMY_STOP_DISTANCE = 50 // これより近づいたら自機の目の前で足を止める
// 他の敵と重ならないよう、近すぎる敵からは互いに離れる力を働かせる(自機への接近と合成)
export const ENEMY_SEPARATION_RADIUS = 40
export const ENEMY_SEPARATION_STRENGTH = 1.2
// HPはランダムに割り振り、強さを見た目の大きさで表現する(1が最弱・最小)
export const ENEMY_HP_MIN = 1
export const ENEMY_HP_MAX = 4
export const ENEMY_BASE_SIZE = 14
export const ENEMY_SIZE_PER_HP = 4

// Wave侵攻: 一定間隔ごとに、自機を囲む複数の方角(アプローチ)から敵の集団が出現する
export const WAVE_INTERVAL_MS = 20000
export const WAVE_SPAWN_RADIUS = 700 // 自機からどれだけ離れた場所で出現するか
export const WAVE_SCATTER_RADIUS = 130 // 各アプローチ内でのばらけ具合
export const WAVE_APPROACHES_MIN = 2
export const WAVE_APPROACHES_MAX = 4
export const WAVE_BASE_ENEMIES_PER_APPROACH = 3
export const WAVE_GROWTH_EVERY_N_WAVES = 2 // このWave数ごとに1体ずつ増える

export const LOCK_INTERVAL_MS = 90
export const LOCK_CAPACITY_INITIAL = 2
export const LOCK_CAPACITY_MAX = 6
export const LOCK_RANGE = DRONE_SENSOR_RADIUS + DRONE_ORBIT_RADIUS
export const KILLS_PER_CAPACITY_UP = 3

export const MISSILE_SPEED = 380
export const MISSILE_LAUNCH_STAGGER_MS = 50
export const MISSILE_BASE_DAMAGE = 2
// 発射時に自機がいる地形が高いほど威力が上がる(高所からの攻撃ボーナス)
export const TERRAIN_DAMAGE_MULTIPLIER: Record<TerrainKind, number> = {
  river: 1.0,
  plains: 1.0,
  forest: 1.25,
  mountain: 1.75,
  impassable: 1.75,
}
// 上空から放物線を描いて着弾する演出。ARC_HEIGHTは軌道の頂点の高さ(見た目上のpxオフセット)。
export const MISSILE_ARC_HEIGHT = 150
export const MISSILE_SPIN_SPEED = Math.PI * 6 // rad/sec、三角錐がくるくる回る演出用
// 弾道の高度がこの範囲(進行度0〜1)にある間だけ地形との衝突をチェックする。
// 発射直後・着弾直前は自機/敵の足元(=通行可能地形)なので誤クラッシュを避けるために除外する。
export const MISSILE_CRASH_CHECK_T_MIN = 0.08
export const MISSILE_CRASH_CHECK_T_MAX = 0.92
// 地形ごとの「弾道を遮る高さ」。ミサイルの現在高度がこれを下回っていたらクラッシュする。
export const TERRAIN_OBSTRUCTION_HEIGHT: Record<TerrainKind, number> = {
  plains: 0,
  river: 0,
  forest: 20,
  mountain: 140,
  impassable: 220,
}
// 撃破した地点に一定時間残る「x」マーク。しばらく表示し続けた後、フェードアウトして消える。
export const KILL_MARK_HOLD_MS = 5000
export const KILL_MARK_FADE_MS = 600
export const KILL_MARK_SIZE = 9
export const KILL_MARK_LINE_WIDTH = 2
export const KILL_MARK_COLOR = 0xff8a8a
export const KILL_MARK_ALPHA = 0.85

// 飛行軌跡(トレイル)。発射地点から現在地までの弾道を線で残す。
export const MISSILE_TRAIL_MAX_POINTS = 80
export const MISSILE_TRAIL_COLOR = 0xffe066
export const MISSILE_TRAIL_MAX_ALPHA = 0.5
export const MISSILE_TRAIL_WIDTH = 2

// 自機中心の音波(ソナー)。固定半径の円周上を、常に位相が回り続けるオシロスコープ的な
// 波形が伝っている表現(拡散して消える波紋ではない)。敵がいる方角は波の振幅が大きくなり、
// シアン→赤に色が変わる。spottedに関わらず、一定距離以内の生存中の敵すべてが寄与する
// (視覚とは別の察知レイヤー)。
export const SONAR_BASE_RADIUS = 90
export const SONAR_SEGMENTS = 96
export const SONAR_MAX_RANGE = 900
export const SONAR_MAX_BUMP = 32
export const SONAR_LOBE_WIDTH = 0.22 // rad、敵1体が影響を与える角度の半幅(狭いほど鋭いスパイク)
export const SONAR_LOBE_SHARPNESS = 3 // 大きいほどスパイクの根元が細く尖る
export const SONAR_CALM_COLOR = 0x2fb8d8
export const SONAR_THREAT_COLOR = 0xff5a5a
export const SONAR_BASE_ALPHA = 0.4
export const SONAR_LINE_WIDTH = 1.5
export const SONAR_WAVE_FREQUENCY = 14 // 円周上の波の数(細かさ)
export const SONAR_WAVE_SPEED = 2.4 // rad/sec、波形の位相が回る速さ(=動いて見える)
export const SONAR_WAVE_BASE_AMPLITUDE = 1 // 何もない方向はほぼ真円に見える程度の待機振幅

// 画面左に流れるイベントログ
export const LOG_X = 20
export const LOG_Y_TOP = 76
export const LOG_LINE_HEIGHT = 20
export const LOG_MAX_ENTRIES = 8
export const LOG_LIFETIME_MS = 4500
export const LOG_FONT_SIZE = '13px'
