import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useStartRun, useSubmitRun, useDailyChallenge } from '@/hooks/use-game-api';
import { GameView } from '@/components/game-view';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function PlayPage() {
    const { user, login } = useAuth();
    const { data: daily, isLoading: loadingDaily } = useDailyChallenge();
    const startRun = useStartRun();
    const submitRun = useSubmitRun();
    const { toast } = useToast();
    const [location, setLocation] = useLocation();

    const [serverNonce, setServerNonce] = useState<string | null>(null);
    const [runStarted, setRunStarted] = useState(false);

    // 1. Ensure User
    useEffect(() => {
        if (!user && !loadingDaily) {
            login(); // Auto guest login if needed
        }
    }, [user, loadingDaily, login]);

    // 2. Start Run on Mount
    useEffect(() => {
        if (user && daily && !runStarted) {
            startRun.mutate({ mode: 'daily', seed: daily.seed }, {
                onSuccess: (data) => {
                    setServerNonce(data.serverNonce);
                    setRunStarted(true);
                },
                onError: (err) => {
                    toast({
                        title: "Error starting run",
                        description: err.message,
                        variant: "destructive"
                    });
                    setLocation("/");
                }
            });
        }
    }, [user, daily, runStarted, startRun, toast, setLocation]);

    const handleGameOver = (result: any) => {
        if (!serverNonce || !daily) return;

        submitRun.mutate({
            mode: 'daily',
            seed: daily.seed,
            serverNonce,
            result: {
                score: result.score,
                gems: result.gems,
                timeMs: result.timeMs,
                won: result.won,
                history: result.history
            }
        }, {
            onSuccess: (data) => {
                if (data.newHighScore) {
                     toast({
                        title: "NEW HIGH SCORE!",
                        description: `Rank #${data.rank}`,
                        className: "bg-yellow-500 text-black border-4 border-black"
                    });
                } else {
                    toast({
                        title: "Run Submitted",
                        description: data.valid ? "Verified successfully" : "Verification failed"
                    });
                }
                // Don't auto-redirect, let them try again via GameView UI or go back
            },
            onError: () => {
                toast({
                    title: "Submission Failed",
                    variant: "destructive"
                });
            }
        });
    };

    if (!user || loadingDaily || !serverNonce) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-primary font-mono gap-4">
                 <Loader2 className="w-8 h-8 animate-spin" />
                 <p className="animate-pulse">INITIALIZING RUN...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="crt-flicker" />
            
            {/* Nav */}
            <header className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur">
                <div 
                    className="font-bold text-xl tracking-tighter cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setLocation('/')}
                >
                    &lt; BACK
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                    DAILY SEED: {daily?.seed.substring(0, 8)}
                </div>
            </header>

            <main className="flex-1 p-4 flex items-center justify-center">
                <GameView 
                    seed={daily?.seed || 'default'} 
                    onGameOver={handleGameOver} 
                />
            </main>
        </div>
    );
}
