import { useCreateGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Gamepad2, Users } from "lucide-react";

export default function HomePage() {
  const createGame = useCreateGame();
  const [, setLocation] = useLocation();
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      setLocation(`/game?code=${joinCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-50 rounded-full blur-3xl opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-rose-600 text-white shadow-xl shadow-primary/30 mb-6">
            <Gamepad2 size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Pick Red <span className="text-primary">Point</span>
          </h1>
          <p className="text-slate-400 font-medium">
            Multiplayer score tracker for card games.
          </p>
        </div>

        <div className="space-y-6">
          {/* Create Game */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              size="lg" 
              onClick={() => createGame.mutate()}
              disabled={createGame.isPending}
              className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {createGame.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Play className="mr-2 fill-current" /> Start New Game
                </>
              )}
            </Button>
          </motion.div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-300 uppercase tracking-widest">or join existing</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Join Game */}
          <motion.form 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleJoin}
            className="flex gap-2"
          >
            <Input 
              placeholder="Enter Room Code" 
              className="h-14 bg-slate-50 border-transparent focus:bg-white focus:border-slate-200 rounded-xl text-lg px-6 font-mono font-bold uppercase placeholder:normal-case placeholder:font-sans placeholder:font-medium"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!joinCode.trim()}
              className="h-14 w-14 rounded-xl flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
            >
              <ArrowRight />
            </Button>
          </motion.form>
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-xs text-slate-300 font-medium flex items-center justify-center gap-2">
            <Users size={12} /> Sync scores instantly with friends
          </p>
        </div>
      </motion.div>
    </div>
  );
}
