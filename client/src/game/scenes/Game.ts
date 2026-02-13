import { Scene } from 'phaser';
import { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, GameEvents, COLORS } from '../config';

type Entity = {
    x: number;
    y: number;
    type: 'DIRT' | 'WALL' | 'ROCK' | 'GEM' | 'EXIT' | 'PLAYER' | 'ENEMY' | 'EMPTY';
    sprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
};

// Simple pseudo-random generator for consistent seeds
class PRNG {
    private seed: number;
    constructor(seedStr: string) {
        this.seed = this.hash(seedStr);
    }
    private hash(str: string) {
        let h = 0xdeadbeef;
        for(let i=0; i<str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
        return (h ^ h >>> 16) >>> 0;
    }
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }
}

export class GameScene extends Scene {
    private grid: Entity[][];
    private player: Entity | null = null;
    private score: number = 0;
    private gemsCollected: number = 0;
    private gemsNeeded: number = 10;
    private tick: number = 0;
    private history: { tick: number, input: string }[] = [];
    private nextMove: { x: number, y: number } = { x: 0, y: 0 };
    private gameActive: boolean = false;
    private seed: string = 'daily-seed';
    
    // Timer
    private startTime: number = 0;
    private finalTime: number = 0;

    constructor() {
        super('Game');
        this.grid = [];
    }

    init(data: { seed: string }) {
        this.seed = data.seed;
        this.score = 0;
        this.gemsCollected = 0;
        this.history = [];
        this.tick = 0;
        this.gameActive = true;
        this.nextMove = { x: 0, y: 0 };
    }

    create() {
        this.generateLevel();
        this.startTime = Date.now();
        
        // Input handling
        if(this.input.keyboard) {
            this.input.keyboard.on('keydown-LEFT', () => this.nextMove = { x: -1, y: 0 });
            this.input.keyboard.on('keydown-RIGHT', () => this.nextMove = { x: 1, y: 0 });
            this.input.keyboard.on('keydown-UP', () => this.nextMove = { x: 0, y: -1 });
            this.input.keyboard.on('keydown-DOWN', () => this.nextMove = { x: 0, y: 1 });
        }

        // Game Loop Tick (e.g., 150ms per tick)
        this.time.addEvent({
            delay: 150,
            callback: this.gameTick,
            callbackScope: this,
            loop: true
        });

        // UI Overlay for Score
        this.events.emit(GameEvents.SCORE_UPDATE, { score: 0, gems: 0 });
    }

    private generateLevel() {
        const rng = new PRNG(this.seed);
        this.grid = [];

        // Fill border with walls, random interior
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                let type: Entity['type'] = 'EMPTY';
                
                if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
                    type = 'WALL';
                } else if (x === 1 && y === 1) {
                    type = 'PLAYER';
                } else if (x === GRID_WIDTH - 2 && y === GRID_HEIGHT - 2) {
                    type = 'EXIT';
                } else {
                    const rand = rng.next();
                    if (rand < 0.1) type = 'WALL';
                    else if (rand < 0.25) type = 'ROCK';
                    else if (rand < 0.35) type = 'GEM';
                    else if (rand < 0.8) type = 'DIRT';
                    else if (rand < 0.82) type = 'ENEMY';
                }

                this.createEntity(x, y, type);
            }
        }
    }

    private createEntity(x: number, y: number, type: Entity['type']) {
        let sprite: Phaser.GameObjects.Sprite | undefined;
        if (type !== 'EMPTY') {
            const texture = type.toLowerCase();
            sprite = this.add.sprite(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, texture);
            if (type === 'EXIT') sprite.setAlpha(0.5); // Closed look
        }

        const entity = { x, y, type, sprite };
        this.grid[y][x] = entity;

        if (type === 'PLAYER') this.player = entity;
    }

    private gameTick() {
        if (!this.gameActive || !this.player) return;

        this.tick++;
        
        // 1. Process Player Input
        const inputKey = this.getInputKey();
        if (inputKey !== 'WAIT') {
            this.history.push({ tick: this.tick, input: inputKey });
            this.movePlayer(this.nextMove.x, this.nextMove.y);
        } else {
             this.history.push({ tick: this.tick, input: 'WAIT' });
        }
        
        // Reset input buffer
        this.nextMove = { x: 0, y: 0 };

        // 2. Physics Update (Rocks falling, Enemies moving)
        this.updatePhysics();

        // 3. Check Conditions
        this.checkWinLoss();
    }

    private getInputKey() {
        if (this.nextMove.x === -1) return 'LEFT';
        if (this.nextMove.x === 1) return 'RIGHT';
        if (this.nextMove.y === -1) return 'UP';
        if (this.nextMove.y === 1) return 'DOWN';
        return 'WAIT';
    }

    private movePlayer(dx: number, dy: number) {
        if (!this.player) return;
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        if (this.isOutOfBounds(newX, newY)) return;

        const target = this.grid[newY][newX];

        // Interaction Logic
        if (target.type === 'EMPTY' || target.type === 'DIRT') {
            this.swapEntities(this.player, target);
            if (target.type === 'DIRT') {
                target.type = 'EMPTY';
                target.sprite?.destroy();
                target.sprite = undefined;
                this.score += 5;
            }
        } else if (target.type === 'GEM') {
            this.swapEntities(this.player, target);
            target.type = 'EMPTY';
            target.sprite?.destroy();
            target.sprite = undefined;
            this.score += 50;
            this.gemsCollected++;
            this.checkExitOpen();
        } else if (target.type === 'EXIT') {
            if (this.gemsCollected >= this.gemsNeeded) {
                 this.swapEntities(this.player, target);
                 this.winGame();
            }
        } else if (target.type === 'ROCK' && dx !== 0 && dy === 0) {
            // Push rock logic
            const behindRockX = newX + dx;
            if (!this.isOutOfBounds(behindRockX, newY)) {
                const behindRock = this.grid[newY][behindRockX];
                if (behindRock.type === 'EMPTY') {
                    this.swapEntities(target, behindRock); // Move rock
                    this.swapEntities(this.player, target); // Move player
                }
            }
        }
        
        this.events.emit(GameEvents.SCORE_UPDATE, { score: this.score, gems: this.gemsCollected });
    }

    private updatePhysics() {
        // Iterate from bottom up to handle falling correctly
        for (let y = GRID_HEIGHT - 2; y >= 0; y--) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const entity = this.grid[y][x];
                
                if (entity.type === 'ROCK' || entity.type === 'GEM') {
                    const below = this.grid[y + 1][x];
                    
                    // Fall down directly
                    if (below.type === 'EMPTY') {
                        this.swapEntities(entity, below);
                    } 
                    // Roll off rocks/walls
                    else if (below.type === 'ROCK' || below.type === 'WALL') {
                        // Check left
                        if (x > 0 && this.grid[y][x-1].type === 'EMPTY' && this.grid[y+1][x-1].type === 'EMPTY') {
                            this.swapEntities(entity, this.grid[y][x-1]); // Move left
                        }
                        // Check right
                        else if (x < GRID_WIDTH - 1 && this.grid[y][x+1].type === 'EMPTY' && this.grid[y+1][x+1].type === 'EMPTY') {
                            this.swapEntities(entity, this.grid[y][x+1]); // Move right
                        }
                    }
                    
                    // Kill player if falling on them
                    if (below.type === 'PLAYER' && (entity.type === 'ROCK')) {
                         // Check if it was falling (simple check: if it was above in previous tick)
                         // For now, simplified: aggressive rocks kill if they move into player
                         // In a real implementation, track 'falling' state
                         this.gameOver();
                    }
                }
            }
        }
    }

    private swapEntities(a: Entity, b: Entity) {
        // Swap grid position references
        this.grid[a.y][a.x] = b;
        this.grid[b.y][b.x] = a;

        // Swap coordinates
        const tempX = a.x; const tempY = a.y;
        a.x = b.x; a.y = b.y;
        b.x = tempX; b.y = tempY;

        // Update visuals
        if (a.sprite) {
            a.sprite.x = a.x * TILE_SIZE + TILE_SIZE / 2;
            a.sprite.y = a.y * TILE_SIZE + TILE_SIZE / 2;
        }
        if (b.sprite) {
            b.sprite.x = b.x * TILE_SIZE + TILE_SIZE / 2;
            b.sprite.y = b.y * TILE_SIZE + TILE_SIZE / 2;
        }
    }

    private isOutOfBounds(x: number, y: number) {
        return x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT;
    }

    private checkExitOpen() {
        if (this.gemsCollected >= this.gemsNeeded) {
            // Find exit and make it bright
            for(let row of this.grid) {
                for(let cell of row) {
                    if(cell.type === 'EXIT' && cell.sprite) {
                        cell.sprite.setAlpha(1);
                    }
                }
            }
        }
    }

    private checkWinLoss() {
        // Check if player crushed or killed by enemy (simplified)
        // Handled in updatePhysics largely
    }

    private gameOver() {
        this.gameActive = false;
        this.finalTime = Date.now() - this.startTime;
        this.events.emit(GameEvents.GAME_OVER, {
            score: this.score,
            gems: this.gemsCollected,
            timeMs: this.finalTime,
            history: this.history,
            won: false
        });
    }

    private winGame() {
        this.gameActive = false;
        this.score += 500; // Win bonus
        this.finalTime = Date.now() - this.startTime;
        this.events.emit(GameEvents.GAME_WON, {
            score: this.score,
            gems: this.gemsCollected,
            timeMs: this.finalTime,
            history: this.history,
            won: true
        });
    }

    // External control method for React UI
    public setNextMove(dx: number, dy: number) {
        this.nextMove = { x: dx, y: dy };
    }
}
