import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload() {
    // アセットが増えたらここでロード進捗バーを出す
  }

  create() {
    this.scene.start('Main')
  }
}
