import Phaser from 'phaser'

export class Enemy {
  x: number
  y: number
  alive = true
  spotted = false
  readonly view: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x
    this.y = y
    this.view = scene.add.rectangle(x, y, 18, 18, 0xff5a5a, 0.25)
    this.view.setStrokeStyle(2, 0xff8a8a, 1)
    this.view.setVisible(false)
  }

  setSpotted(spotted: boolean) {
    if (this.spotted === spotted) return
    this.spotted = spotted
    this.view.setVisible(spotted && this.alive)
  }

  destroy() {
    this.alive = false
    this.view.destroy()
  }
}
