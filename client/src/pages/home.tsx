import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDailyChallenge, useStartRun } from '@/hooks/use-game-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Play, Trophy, Skull } from 'lucide-react';
import { Link } from 'wouter';

export default function Home() {
    const { user, login, isLoggingIn } = useAuth();
    const { data: daily, isLoading } = useDailyChallenge();
    const startRun = useStartRun();

    const [mode, setMode] = useState<'menu' | 'loading'>('menu');

    const handleStart = async () => {
        if (!user) {
            login();
            return;
        }
        setMode('loading');
        // Small delay for effect
        setTimeout(() => {
             window.location.href = '/play';
        }, 1000);
    };

    if (isLoading || isLoggingIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <p className="text-primary font-mono animate-pulse">LOADING SYSTEM...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="crt-flicker" />
            
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
                
                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-blue-600 drop-shadow-[0_4px_0_rgba(0,0,0,1)] select-none">
                        BOULDER<br/>DASH
                    </h1>
                    <p className="text-xl md:text-2xl text-primary font-mono tracking-widest">NEON EDITION</p>
                </div>

                {/* Daily Challenge Card */}
                <Card className="bg-black/50 border-2 border-accent p-6 backdrop-blur-md transform hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(255,255,0,0.2)]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-accent text-black px-3 py-1 text-sm font-bold uppercase tracking-wider">
                            Daily Challenge
                        </div>
                        <h3 className="text-2xl text-white font-mono">{daily?.date || "TODAY"}</h3>
                        <p className="text-muted-foreground text-sm font-mono max-w-md mx-auto">
                            {daily?.message || "Navigate the treacherous mines. Collect gems. Avoid the rocks."}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full mt-4">
                            <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded">
                                <span className="text-xs text-muted-foreground uppercase">Seed</span>
                                <span className="font-mono text-accent truncate w-full text-center">{daily?.seed.substring(0, 8)}...</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded">
                                <span className="text-xs text-muted-foreground uppercase">Difficulty</span>
                                <div className="flex gap-1 mt-1">
                                    <Skull className="w-4 h-4 text-destructive" />
                                    <Skull className="w-4 h-4 text-destructive" />
                                    <Skull className="w-4 h-4 text-muted" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Main Actions */}
                <div className="flex flex-col gap-4 max-w-xs mx-auto w-full">
                    {!user ? (
                         <Button 
                            size="lg" 
                            className="h-14 text-xl font-bold bg-primary hover:bg-primary/90 text-black border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all"
                            onClick={() => login()}
                        >
                            INSERT COIN
                        </Button>
                    ) : (
                        <>
                            <Button 
                                size="lg" 
                                className="h-16 text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-2 border-white/20 shadow-[0_0_15px_rgba(255,0,255,0.5)] animate-pulse"
                                onClick={handleStart}
                                disabled={mode === 'loading'}
                            >
                                <Play className="mr-3 fill-current" /> PLAY NOW
                            </Button>

                            <Link href="/leaderboard" className="w-full">
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    className="w-full h-14 text-xl font-bold border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-950/30"
                                >
                                    <Trophy className="mr-3" /> HIGH SCORES
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                    v1.0.0 • POWERED BY PHASER 3
                </div>
            </div>
        </div>
    );
}
