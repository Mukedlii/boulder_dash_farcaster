import { Scene } from 'phaser';
import { COLORS, TILE_SIZE } from '../config';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Generate Textures Programmatically
        this.generateTextures();
    }

    create() {
        this.scene.start('Menu'); // Or go straight to Game if managed by React
    }

    generateTextures() {
        const graphics = this.make.graphics({ x: 0, y: 0 });

        // 1. Dirt
        graphics.fillStyle(COLORS.DIRT, 1);
        graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        // Add some noise
        for(let i=0; i<5; i++) {
            graphics.fillStyle(0x333344, 1);
            graphics.fillRect(Math.random()*TILE_SIZE, Math.random()*TILE_SIZE, 4, 4);
        }
        graphics.generateTexture('dirt', TILE_SIZE, TILE_SIZE);
        graphics.clear();

        // 2. Wall
        graphics.fillStyle(COLORS.WALL, 1);
        graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
        graphics.generateTexture('wall', TILE_SIZE, TILE_SIZE);
        graphics.clear();

        // 3. Rock
        graphics.fillStyle(COLORS.ROCK, 1);
        graphics.fillCircle(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 2);
        // Shine
        graphics.fillStyle(0xffffff, 0.3);
        graphics.fillCircle(TILE_SIZE/2 - 5, TILE_SIZE/2 - 5, 6);
        graphics.generateTexture('rock', TILE_SIZE, TILE_SIZE);
        graphics.clear();

        // 4. Gem
        graphics.fillStyle(COLORS.GEM, 1);
        graphics.beginPath();
        graphics.moveTo(TILE_SIZE/2, 4);
        graphics.lineTo(TILE_SIZE-4, TILE_SIZE/2);
        graphics.lineTo(TILE_SIZE/2, TILE_SIZE-4);
        graphics.lineTo(4, TILE_SIZE/2);
        graphics.closePath();
        graphics.fillPath();
        // Inner
        graphics.fillStyle(0xffffff, 0.5);
        graphics.fillRect(TILE_SIZE/2 - 4, TILE_SIZE/2 - 4, 8, 8);
        graphics.generateTexture('gem', TILE_SIZE, TILE_SIZE);
        graphics.clear();

        // 5. Player
        graphics.fillStyle(COLORS.PLAYER, 1);
        graphics.fillRect(4, 4, TILE_SIZE-8, TILE_SIZE-8);
        // Eyes
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(10, 12, 8, 8);
        graphics.fillRect(TILE_SIZE-18, 12, 8, 8);
        graphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
        graphics.clear();

        // 6. Exit
        graphics.fillStyle(COLORS.EXIT, 1);
        graphics.fillRect(2, 2, TILE_SIZE-4, TILE_SIZE-4);
        graphics.lineStyle(4, 0xffffff, 0.5);
        graphics.strokeRect(6, 6, TILE_SIZE-12, TILE_SIZE-12);
        graphics.generateTexture('exit', TILE_SIZE, TILE_SIZE);
        graphics.clear();
        
        // 7. Enemy
        graphics.fillStyle(COLORS.ENEMY, 1);
        graphics.fillRect(6, 6, TILE_SIZE-12, TILE_SIZE-12);
        // Angry Eyes
        graphics.lineStyle(2, 0x000000, 1);
        graphics.beginPath();
        graphics.moveTo(10, 14);
        graphics.lineTo(18, 20);
        graphics.moveTo(TILE_SIZE-10, 14);
        graphics.lineTo(TILE_SIZE-18, 20);
        graphics.strokePath();
        graphics.generateTexture('enemy', TILE_SIZE, TILE_SIZE);
        graphics.clear();
    }
}
