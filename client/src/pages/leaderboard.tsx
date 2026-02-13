import { useLeaderboard } from '@/hooks/use-game-api';
import { Card } from '@/components/ui/card';
import { Loader2, Trophy, Clock, Gem } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
    const { data: leaderboard, isLoading } = useLeaderboard();

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
             <div className="crt-flicker" />
            
            <div className="w-full max-w-4xl space-y-8 relative z-10">
                <div className="flex justify-between items-center">
                    <Link href="/">
                        <Button variant="outline" className="font-mono">&lt; BACK TO MENU</Button>
                    </Link>
                    <h1 className="text-3xl md:text-5xl font-black text-primary drop-shadow-[2px_2px_0_#000]">
                        LEADERBOARD
                    </h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <Card className="bg-card/50 border-2 border-accent p-0 overflow-hidden backdrop-blur-sm">
                        <div className="grid grid-cols-12 gap-4 p-4 bg-accent/10 border-b border-accent font-bold text-accent uppercase tracking-wider text-sm md:text-base">
                            <div className="col-span-2 md:col-span-1 text-center">#</div>
                            <div className="col-span-6 md:col-span-5">Player</div>
                            <div className="col-span-4 md:col-span-3 text-right">Score</div>
                            <div className="hidden md:block md:col-span-3 text-right">Time</div>
                        </div>
                        
                        <div className="divide-y divide-white/10 max-h-[60vh] overflow-y-auto">
                            {leaderboard?.map((entry, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors font-mono",
                                        i === 0 ? "text-yellow-400 text-lg" : 
                                        i === 1 ? "text-gray-300" : 
                                        i === 2 ? "text-amber-600" : "text-muted-foreground"
                                    )}
                                >
                                    <div className="col-span-2 md:col-span-1 text-center font-bold">
                                        {i < 3 ? <Trophy className="w-5 h-5 mx-auto" /> : entry.rank}
                                    </div>
                                    <div className="col-span-6 md:col-span-5 truncate font-medium">
                                        {entry.username}
                                    </div>
                                    <div className="col-span-4 md:col-span-3 text-right font-bold">
                                        {entry.score.toLocaleString()}
                                    </div>
                                    <div className="hidden md:block md:col-span-3 text-right text-sm opacity-80">
                                        {(entry.timeMs / 1000).toFixed(1)}s
                                    </div>
                                </div>
                            ))}
                            
                            {leaderboard?.length === 0 && (
                                <div className="p-12 text-center text-muted-foreground font-mono">
                                    NO RECORDS YET. BE THE FIRST!
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
