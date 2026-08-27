import Phaser from 'phaser'
import { LOG_FONT_SIZE, LOG_LIFETIME_MS, LOG_LINE_HEIGHT, LOG_MAX_ENTRIES, LOG_X, LOG_Y_TOP, UI_SCALE } from '../config'

type Entry = {
  createdAt: number
  view: Phaser.GameObjects.Text
}

/**
 * 画面左に積み上がっていくイベントログ。新しいログは下に追加され、
 * 一番古い(上の)ログが一定時間で消えると、残りが上に詰まっていく。
 */
export class EventLog {
  private readonly scene: Phaser.Scene
  private readonly entries: Entry[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  push(message: string, color = '#eaffff') {
    const view = this.scene.add
      .text(LOG_X * UI_SCALE, (LOG_Y_TOP + this.entries.length * LOG_LINE_HEIGHT) * UI_SCALE, message, {
        fontSize: LOG_FONT_SIZE,
        color,
        fontFamily: 'monospace',
      })
      .setScrollFactor(0)
      .setScale(UI_SCALE)
      .setDepth(100)
      .setAlpha(0)

    this.scene.tweens.add({ targets: view, alpha: 1, duration: 150 })

    this.entries.push({ createdAt: this.scene.time.now, view })
    if (this.entries.length > LOG_MAX_ENTRIES) {
      this.expireOldest()
    }
    this.reflow()
  }

  update(now: number) {
    let expired = false
    while (this.entries.length > 0 && now - this.entries[0].createdAt > LOG_LIFETIME_MS) {
      this.expireOldest()
      expired = true
    }
    if (expired) this.reflow()
  }

  private expireOldest() {
    const oldest = this.entries.shift()
    if (!oldest) return
    this.scene.tweens.add({
      targets: oldest.view,
      alpha: 0,
      duration: 250,
      onComplete: () => oldest.view.destroy(),
    })
  }

  private reflow() {
    this.entries.forEach((entry, i) => {
      this.scene.tweens.add({
        targets: entry.view,
        y: (LOG_Y_TOP + i * LOG_LINE_HEIGHT) * UI_SCALE,
        duration: 150,
      })
    })
  }
}
