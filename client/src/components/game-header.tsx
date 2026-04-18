import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface GameHeaderProps {
  code: string;
}

export function GameHeader({ code }: GameHeaderProps) {
  const { toast } = useToast();

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Share this link with your friends to sync scores.",
    });
  };

  return (
    <div className="flex items-center justify-between py-4 px-1">
      <div className="flex flex-col">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Pick Red <span className="text-primary">Point</span>
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Room Code:</span>
          <code className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
            {code}
          </code>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="icon" 
        onClick={copyLink}
        className="rounded-full h-10 w-10 bg-white border-slate-200 shadow-sm hover:bg-slate-50 hover:text-primary transition-colors"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
