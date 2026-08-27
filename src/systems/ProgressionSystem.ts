import { KILLS_PER_CAPACITY_UP, LOCK_CAPACITY_INITIAL, LOCK_CAPACITY_MAX } from '../config'

/** 撃破数に応じてロック容量を上げる、シンプルな進行度管理 */
export class ProgressionSystem {
  private killCount = 0

  registerKill() {
    this.killCount += 1
  }

  get kills(): number {
    return this.killCount
  }

  get lockCapacity(): number {
    const bonus = Math.floor(this.killCount / KILLS_PER_CAPACITY_UP)
    return Math.min(LOCK_CAPACITY_MAX, LOCK_CAPACITY_INITIAL + bonus)
  }
}
