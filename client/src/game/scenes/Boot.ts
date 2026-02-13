import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load any initial assets here if we had files
        // Since we are procedural, we just move on
    }

    create() {
        this.scene.start('Preloader');
    }
}
