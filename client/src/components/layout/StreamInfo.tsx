import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function StreamInfo() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Get domain from environment or fallback
  const domain = typeof window !== 'undefined' ? 
    window.location.origin : 
    process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  
  const streamUrl = `${domain}/stream`;
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(streamUrl)
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Stream URL has been copied to your clipboard",
        });
        
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error) => {
        toast({
          title: "Copy failed",
          description: "Failed to copy URL to clipboard",
          variant: "destructive",
        });
      });
  };
  
  const handleOpenStreamOutput = () => {
    window.open(streamUrl, "_blank");
  };
  
  return (
    <div className="bg-card rounded-lg p-4 border border-secondary/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">Stream Info</h2>
        <button className="text-foreground/70 hover:text-foreground transition-colors">
          <i className="ri-information-line"></i>
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Browser Source URL</label>
          <div className="flex">
            <input 
              type="text" 
              value={streamUrl} 
              readOnly 
              className="flex-1 bg-background border border-secondary/30 rounded-l px-2 py-1.5 text-sm"
            />
            <button 
              className={`${copied ? 'bg-primary/20 hover:bg-primary/30 text-primary' : 'bg-secondary/20 hover:bg-secondary/30 text-secondary'} px-3 rounded-r border border-secondary/30 border-l-0`}
              onClick={handleCopyToClipboard}
            >
              <i className={copied ? "ri-check-line" : "ri-clipboard-line"}></i>
            </button>
          </div>
          <p className="text-xs text-foreground/50 mt-1">Use this URL in OBS/Streamlabs as a browser source</p>
        </div>
        
        <div>
          <label className="block text-xs text-foreground/70 mb-1">Recommended OBS Settings</label>
          <div className="bg-background rounded p-3 text-sm border border-secondary/20">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-foreground/70">Width:</span> 1920px
              </div>
              <div>
                <span className="text-foreground/70">Height:</span> 1080px
              </div>
              <div>
                <span className="text-foreground/70">FPS:</span> 30
              </div>
              <div>
                <span className="text-foreground/70">Custom CSS:</span> None
              </div>
            </div>
          </div>
        </div>
        
        <button 
          className="w-full bg-accent/20 text-accent hover:bg-accent/30 py-2 rounded transition-colors"
          onClick={handleOpenStreamOutput}
        >
          <i className="ri-external-link-line mr-1"></i>
          Open Stream Output
        </button>
      </div>
    </div>
  );
}
