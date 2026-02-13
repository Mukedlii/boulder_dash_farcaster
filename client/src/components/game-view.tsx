import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Boot } from '../game/scenes/Boot';
import { Preloader } from '../game/scenes/Preloader';
import { GameScene } from '../game/scenes/Game';
import { GAME_WIDTH, GAME_HEIGHT, GameEvents, COLORS } from '../game/config';
import { Button } from './ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RefreshCw, Trophy } from 'lucide-react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

interface GameViewProps {
    seed: string;
    onGameOver: (result: any) => void;
}

export function GameView({ seed, onGameOver }: GameViewProps) {
    const gameRef = useRef<HTMLDivElement>(null);
    const phaserRef = useRef<Phaser.Game | null>(null);
    const [score, setScore] = useState(0);
    const [gems, setGems] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameResult, setGameResult] = useState<any>(null);

    useEffect(() => {
        if (!gameRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            parent: gameRef.current,
            backgroundColor: COLORS.BACKGROUND,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 }, // No gravity, top-down grid
                }
            },
            scene: [Boot, Preloader, GameScene],
            pixelArt: true, // Crucial for retro feel
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        const game = new Phaser.Game(config);
        phaserRef.current = game;

        // Listen for game events
        game.events.on('ready', () => {
             // Pass seed to game scene
             game.scene.start('Game', { seed });
             
             const gameScene = game.scene.getScene('Game');
             gameScene.events.on(GameEvents.SCORE_UPDATE, (data: any) => {
                 setScore(data.score);
                 setGems(data.gems);
             });
             
             gameScene.events.on(GameEvents.GAME_OVER, (result: any) => {
                 setIsGameOver(true);
                 setGameResult({ ...result, title: "GAME OVER" });
             });

             gameScene.events.on(GameEvents.GAME_WON, (result: any) => {
                 setIsGameOver(true);
                 setGameResult({ ...result, title: "VICTORY!" });
             });
        });

        return () => {
            game.destroy(true);
        };
    }, [seed]);

    // Handle game over submission
    useEffect(() => {
        if (isGameOver && gameResult) {
            onGameOver(gameResult);
        }
    }, [isGameOver, gameResult, onGameOver]);

    // Mobile Controls
    const handleControl = (dx: number, dy: number) => {
        const gameScene = phaserRef.current?.scene.getScene('Game') as GameScene;
        if (gameScene && gameScene.scene.isActive()) {
            gameScene.setNextMove(dx, dy);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto p-4">
            {/* Header / HUD */}
            <div className="flex w-full justify-between items-center bg-card border-2 border-primary p-4 rounded-none shadow-[4px_4px_0px_0px_var(--primary)]">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Score</span>
                    <span className="text-2xl font-bold text-primary font-mono">{score.toString().padStart(6, '0')}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Gems</span>
                    <span className="text-2xl font-bold text-accent font-mono">{gems}/10</span>
                </div>
            </div>

            {/* Game Container */}
            <div className="relative border-4 border-muted rounded-lg overflow-hidden shadow-2xl bg-black">
                <div ref={gameRef} className="w-full h-full" />
                
                {isGameOver && gameResult && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <Card className="p-8 border-4 border-accent bg-card max-w-md w-full text-center animate-in zoom-in duration-300">
                            <h2 className={cn("text-4xl mb-4", gameResult.won ? "text-green-500" : "text-red-500")}>
                                {gameResult.title}
                            </h2>
                            <div className="space-y-2 mb-6 font-mono text-lg">
                                <p>Score: <span className="text-white">{gameResult.score}</span></p>
                                <p>Gems: <span className="text-accent">{gameResult.gems}</span></p>
                                <p>Time: <span className="text-muted-foreground">{(gameResult.timeMs / 1000).toFixed(1)}s</span></p>
                            </div>
                            <Button 
                                onClick={() => window.location.reload()} 
                                className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-black border-none hover-elevate active-elevate-2"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" /> TRY AGAIN
                            </Button>
                        </Card>
                    </div>
                )}
            </div>

            {/* Mobile Controls */}
            <div className="grid grid-cols-3 gap-2 md:hidden w-48 mt-4">
                <div />
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-none border-2 border-primary/50 bg-background/50 active:bg-primary/20" onPointerDown={() => handleControl(0, -1)}>
                    <ArrowUp className="h-8 w-8" />
                </Button>
                <div />
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-none border-2 border-primary/50 bg-background/50 active:bg-primary/20" onPointerDown={() => handleControl(-1, 0)}>
                    <ArrowLeft className="h-8 w-8" />
                </Button>
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-none border-2 border-primary/50 bg-background/50 active:bg-primary/20" onPointerDown={() => handleControl(0, 1)}>
                    <ArrowDown className="h-8 w-8" />
                </Button>
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-none border-2 border-primary/50 bg-background/50 active:bg-primary/20" onPointerDown={() => handleControl(1, 0)}>
                    <ArrowRight className="h-8 w-8" />
                </Button>
            </div>
            
            <div className="hidden md:flex text-muted-foreground text-sm font-mono mt-2 gap-8">
                <span>[ARROWS] Move</span>
                <span>[R] Restart</span>
            </div>
        </div>
    );
}
