import { motion } from "framer-motion";

interface ScoreInputProps {
  playerId: number;
  playerName: string;
  currentScore: string | number;
  baseScore: number;
  isDouble: boolean;
  onChange: (val: string) => void;
  tabIndex?: number;
}

export function ScoreInput({ 
  playerName, 
  currentScore, 
  baseScore, 
  isDouble, 
  onChange,
  tabIndex
}: ScoreInputProps) {
  const scoreNum = Number(currentScore);
  const diff = scoreNum - baseScore;
  const finalScore = diff * (isDouble ? 2 : 1);
  const hasValue = currentScore !== "" && currentScore !== undefined;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-white p-1 rounded-xl"
    >
      <div className="w-20 flex-shrink-0 flex flex-col justify-center">
        <div className="text-xs font-bold text-slate-500 truncate">{playerName}</div>
        <div className={`text-[10px] font-mono font-bold transition-colors ${
          !hasValue ? 'text-slate-300' :
          diff >= 0 ? 'text-primary' : 'text-blue-500'
        }`}>
          {hasValue ? (
            <span className="flex items-center gap-1">
               {isDouble && <span className="text-[9px] bg-accent/10 text-accent px-1 rounded">×2</span>}
               {diff > 0 ? '+' : ''}{finalScore}
            </span>
          ) : (
            '--'
          )}
        </div>
      </div>
      
      <input 
        type="number" 
        inputMode="decimal"
        placeholder="0"
        tabIndex={tabIndex}
        className={`
          flex-1 h-12 w-full bg-slate-50 border-2 rounded-xl text-right text-xl font-black 
          outline-none transition-all duration-200 px-4 font-mono
          placeholder:text-slate-200
          focus:bg-white focus:ring-4 focus:ring-primary/10
          ${hasValue && diff >= 0 ? 'focus:border-primary/50 text-slate-900' : ''}
          ${hasValue && diff < 0 ? 'focus:border-blue-400/50 text-blue-600' : ''}
          ${!hasValue ? 'border-transparent' : 'border-slate-100'}
        `}
        value={currentScore}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
    </motion.div>
  );
}
