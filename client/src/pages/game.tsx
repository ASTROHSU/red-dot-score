import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useGame, useUpdateGame } from '@/hooks/use-game';
import { GameHeader } from '@/components/game-header';
import { ScoreInput } from '@/components/score-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2, RotateCcw, Calculator, UserPlus, CheckCircle2, 
  X, AlertTriangle, Trophy, Save, Check, Zap, Edit2, Coins, Loader2, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function GamePage() {
  const [location, setLocation] = useLocation();
  
  // Extract code from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');

  const { data: game, isLoading, error } = useGame(code || undefined);
  const updateGame = useUpdateGame();

  // Local state for UI interactions (mirrors the logic from the user's artifact)
  const [currentScores, setCurrentScores] = useState<Record<string, string>>({});
  const [isEditingPlayers, setIsEditingPlayers] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isDouble, setIsDouble] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);

  // Initialize input fields when players change
  useEffect(() => {
    if (!game) return;
    
    const initial = { ...currentScores };
    let hasChanges = false;
    
    game.state.players.forEach(p => {
      if (initial[p.id] === undefined) {
        initial[p.id] = '';
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setCurrentScores(initial);
    }
  }, [game?.state.players]);

  // Handle missing code or game not found
  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <p className="text-slate-500">No game code provided.</p>
          <Button onClick={() => setLocation('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <p className="text-red-500">Game not found or error loading.</p>
          <Button onClick={() => setLocation('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // --- Derived State & Logic ---

  const { players, gameHistory } = game.state;
  const { baseScore, exchangeRate } = game;

  // Calculate total standings
  const totalStandings = players.reduce((acc, p) => {
    acc[p.id] = 0;
    gameHistory.forEach(round => {
      if (round.scores && round.scores[p.id] !== undefined) {
        acc[p.id] += round.scores[p.id];
      }
    });
    return acc;
  }, {} as Record<number, number>);

  // Validation logic
  const totalEntered = Object.values(currentScores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const requiredTotal = baseScore * players.length;
  const isScoreValid = totalEntered === requiredTotal;

  // --- Actions ---

  const handleUpdateGame = (updates: Partial<typeof game>) => {
    updateGame.mutate({ code, ...updates });
  };

  const handleUpdateState = (newState: Partial<typeof game.state>) => {
    handleUpdateGame({ 
      state: { ...game.state, ...newState } 
    });
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer = { id: Date.now(), name: newPlayerName.trim() };
      handleUpdateState({
        players: [...players, newPlayer]
      });
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: number) => {
    if (players.length <= 1) return;
    handleUpdateState({
      players: players.filter(p => p.id !== id)
    });
  };

  const updatePlayerName = (id: number, newName: string) => {
    handleUpdateState({
      players: players.map(p => p.id === id ? { ...p, name: newName } : p)
    });
  };

  const submitRound = () => {
    if (!isScoreValid) return;

    const roundScores: Record<string, number> = {};
    const multiplier = isDouble ? 2 : 1;

    players.forEach(p => {
      const score = Number(currentScores[p.id]) || 0;
      roundScores[p.id] = (score - baseScore) * multiplier;
    });

    const newRound = {
      scores: roundScores,
      isDouble,
      rawScores: Object.entries(currentScores).reduce((acc, [k, v]) => ({
        ...acc, [k]: Number(v)
      }), {} as Record<string, number>)
    };

    let updatedHistory = [...gameHistory];
    if (editingRoundIndex !== null) {
      updatedHistory[editingRoundIndex] = newRound;
      setEditingRoundIndex(null);
    } else {
      updatedHistory = [newRound, ...gameHistory];
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f59e0b', '#ffffff']
      });
    }

    handleUpdateState({ gameHistory: updatedHistory });

    // Reset local state
    const reset: Record<string, string> = {};
    players.forEach(p => reset[p.id] = '');
    setCurrentScores(reset);
    setIsDouble(false);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editRound = (index: number) => {
    const round = gameHistory[index];
    setEditingRoundIndex(index);
    setIsDouble(round.isDouble);
    
    const restoredScores: Record<string, string> = {};
    players.forEach(p => {
      // Try to use rawScores if available, otherwise reverse calculate
      const rawVal = round.rawScores?.[p.id];
      if (rawVal !== undefined) {
        restoredScores[p.id] = String(rawVal);
      } else {
        const calculated = (round.scores[p.id] / (round.isDouble ? 2 : 1)) + baseScore;
        restoredScores[p.id] = String(calculated);
      }
    });
    
    setCurrentScores(restoredScores);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRound = (index: number) => {
    if (confirm('Are you sure you want to delete this round?')) {
      const updatedHistory = gameHistory.filter((_, i) => i !== index);
      handleUpdateState({ gameHistory: updatedHistory });
    }
  };

  const resetGame = () => {
    if (confirm('Clear all game history? This cannot be undone.')) {
      handleUpdateState({ gameHistory: [] });
    }
  };

  const cancelEdit = () => {
    setEditingRoundIndex(null);
    setIsDouble(false);
    const reset: Record<string, string> = {};
    players.forEach(p => reset[p.id] = '');
    setCurrentScores(reset);
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans text-slate-900">
      <div className="max-w-md mx-auto px-4">
        
        <GameHeader code={code} />

        {/* 1. Standings & Settings */}
        <section className="mb-6 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Trophy size={12} /> Total Standings
            </h2>
            <div className="flex items-center gap-2">
              {/* Base Score Setting */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Base</span>
                <input 
                  type="number"
                  className="w-8 text-center bg-transparent text-xs font-black text-primary outline-none"
                  value={baseScore}
                  onChange={(e) => handleUpdateGame({ baseScore: Number(e.target.value) })}
                />
              </div>
              {/* Exchange Rate Setting */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
                <Coins size={10} className="text-accent" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Rate</span>
                <input 
                  type="number"
                  className="w-10 text-center bg-transparent text-xs font-black text-amber-600 outline-none"
                  value={exchangeRate}
                  onChange={(e) => handleUpdateGame({ exchangeRate: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {players.map(p => {
              const score = totalStandings[p.id] || 0;
              const money = score * exchangeRate;
              
              return (
                <motion.div 
                  layout
                  key={p.id} 
                  className="bg-white p-4 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden group hover:border-slate-200 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-400 truncate w-full text-center mb-1">{p.name}</div>
                  <div className={`text-2xl font-black leading-none tracking-tight ${score >= 0 ? 'text-primary' : 'text-blue-600'}`}>
                    {score > 0 ? `+${score}` : score}
                  </div>
                  <div className="text-[10px] font-mono mt-2 font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full group-hover:bg-slate-100 transition-colors">
                    $ {money}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* 2. Round Input Area */}
        <div className={`
          bg-white rounded-[24px] p-5 shadow-xl shadow-slate-200/50 border-2 mb-8 transition-all duration-300
          ${editingRoundIndex !== null ? 'border-accent shadow-accent/20' : 'border-transparent'}
        `}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Calculator size={18} className={editingRoundIndex !== null ? 'text-accent' : 'text-primary'} /> 
              {editingRoundIndex !== null ? `Edit Round #${gameHistory.length - editingRoundIndex}` : 'New Round'}
            </h2>
            <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDouble(!isDouble)}
                  className={`
                    h-8 px-3 rounded-lg text-[10px] font-black transition-all border
                    ${isDouble 
                      ? 'bg-accent text-white border-accent shadow-md shadow-accent/20 hover:bg-accent/90 hover:text-white' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}
                  `}
                >
                  <Zap size={12} className={`mr-1 ${isDouble ? "fill-current" : ""}`} />
                  DOUBLE
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingPlayers(!isEditingPlayers)}
                  className={`
                    h-8 w-8 rounded-lg transition-all border
                    ${isEditingPlayers 
                      ? 'bg-primary text-white border-primary shadow-md hover:bg-primary/90 hover:text-white' 
                      : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}
                  `}
                >
                  {isEditingPlayers ? <X size={16} /> : <UserPlus size={16} />}
                </Button>
            </div>
          </div>

          {/* Player Editor Panel */}
          <AnimatePresence>
            {isEditingPlayers && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-4 bg-slate-900 rounded-2xl space-y-3 shadow-xl">
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <input 
                          type="text"
                          className="flex-1 bg-slate-800 text-white px-3 py-2 text-xs font-bold border border-slate-700 rounded-lg outline-none focus:border-primary transition-colors"
                          value={p.name}
                          onChange={(e) => updatePlayerName(p.id, e.target.value)}
                        />
                        <button onClick={() => removePlayer(p.id)} className="text-slate-500 hover:text-red-400 p-2 rounded-md hover:bg-white/5 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-800">
                    <input 
                      type="text" 
                      placeholder="New Player Name"
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-slate-500 transition-colors"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    />
                    <Button onClick={addPlayer} size="sm" variant="secondary" className="h-[34px] text-xs font-black">
                      Add
                    </Button>
                  </div>
                  <Button 
                    onClick={() => setIsEditingPlayers(false)} 
                    className="w-full mt-2 h-9 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-black"
                  >
                    <Check size={14} className="mr-2" /> Done Editing
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-2">
            {players.map((p, idx) => (
              <ScoreInput
                key={p.id}
                playerId={p.id}
                playerName={p.name}
                currentScore={currentScores[p.id] ?? ''}
                baseScore={baseScore}
                isDouble={isDouble}
                onChange={(val) => setCurrentScores(prev => ({ ...prev, [p.id]: val }))}
                tabIndex={idx + 1}
              />
            ))}
          </div>

          {/* Footer: Totals & Action Buttons */}
          <div className="mt-8 pt-4 border-t border-slate-100 space-y-4">
            <div className={`
              flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300
              ${isScoreValid 
                ? 'bg-green-50/50 border-green-100 text-green-700' 
                : 'bg-amber-50/50 border-amber-100 text-amber-700'}
            `}>
              <div className="flex items-center gap-2 text-xs font-black">
                {isScoreValid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>Total: {totalEntered} / {requiredTotal}</span>
              </div>
              {!isScoreValid && (
                <span className="text-[10px] font-black px-2 py-1 bg-white rounded-md shadow-sm border border-amber-100/50">
                  {totalEntered > requiredTotal ? `+${totalEntered - requiredTotal}` : `${totalEntered - requiredTotal}`}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              {editingRoundIndex !== null && (
                <Button 
                  onClick={cancelEdit}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold text-slate-500 border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              )}
              <Button 
                disabled={!isScoreValid}
                onClick={submitRound}
                className={`
                  flex-[2] h-12 rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]
                  ${isScoreValid 
                    ? editingRoundIndex !== null 
                      ? 'bg-accent text-white shadow-accent/25 hover:bg-accent/90' 
                      : 'bg-primary text-white shadow-primary/25 hover:bg-primary/90' 
                    : 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200'}
                `}
              >
                <Save size={20} className="mr-2" /> 
                {editingRoundIndex !== null ? 'Update Round' : 'Save Round'}
              </Button>
            </div>
          </div>
        </div>

        {/* 3. History Table */}
        {gameHistory.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-12"
          >
            <div className="px-4 py-3 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-400 text-[10px] tracking-widest uppercase">History</h3>
              <button 
                onClick={resetGame} 
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-white"
                title="Reset History"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 bg-white/95 backdrop-blur shadow-sm z-10">
                  <tr className="text-[10px] text-slate-400 border-b border-slate-100">
                    <th className="p-3 font-bold text-left w-14">#</th>
                    {players.map(p => (
                      <th key={p.id} className="p-3 font-bold truncate max-w-[80px]">{p.name}</th>
                    ))}
                    <th className="p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gameHistory.map((round, idx) => {
                    const roundNum = gameHistory.length - idx;
                    const isEditing = editingRoundIndex === idx;
                    
                    return (
                      <motion.tr 
                        key={idx} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`
                          group transition-colors
                          ${round.isDouble ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'} 
                          ${isEditing ? 'bg-amber-100/30' : ''}
                        `}
                      >
                        <td className="p-3 text-slate-300 font-mono text-[10px] text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{roundNum}</span>
                            {round.isDouble && <Zap size={10} className="text-accent fill-accent" />}
                          </div>
                        </td>
                        {players.map(p => {
                          const score = round.scores[p.id];
                          return (
                            <td key={p.id} className={`p-3 font-bold text-xs font-mono ${
                              score > 0 ? 'text-primary' : score < 0 ? 'text-blue-500' : 'text-slate-300'
                            }`}>
                              {score > 0 ? `+${score}` : score}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => editRound(idx)} className="text-slate-300 hover:text-accent p-1.5 rounded hover:bg-white transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteRound(idx)} className="text-slate-300 hover:text-red-500 p-1.5 rounded hover:bg-white transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
