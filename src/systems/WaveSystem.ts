import { WAVE_INTERVAL_MS } from '../config'

/** 一定間隔ごとにWave番号をインクリメントして侵攻を発生させる、シンプルなタイマー */
export class WaveSystem {
  private waveNumber = 0
  private msSinceLastWave = 0
  private readonly onSpawnWave: (waveNumber: number) => void

  constructor(onSpawnWave: (waveNumber: number) => void) {
    this.onSpawnWave = onSpawnWave
  }

  /** 最初のWaveを即座に発生させる */
  start() {
    this.waveNumber = 1
    this.onSpawnWave(this.waveNumber)
  }

  update(deltaMs: number) {
    this.msSinceLastWave += deltaMs
    if (this.msSinceLastWave < WAVE_INTERVAL_MS) return
    this.msSinceLastWave = 0
    this.waveNumber += 1
    this.onSpawnWave(this.waveNumber)
  }
}
