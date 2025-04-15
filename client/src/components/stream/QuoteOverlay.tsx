import { Quote } from "@/lib/types";

interface QuoteOverlayProps {
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    backdropBlur?: string;
  };
  quote?: Quote;
  preview?: boolean;
}

export function QuoteOverlay({ 
  style = {}, 
  quote,
  preview = false 
}: QuoteOverlayProps) {
  // Default text if no quote or in preview mode
  const defaultText = "I know that ache in your chest.\nYour story is still unfolding — even if it feels stuck.\nOne loop at a time, friend.\nYou're safe here. Stay a while.";
  const defaultAuthor = "Hollowheart";
  const defaultSource = "Tapes";
  
  const bgColor = style.backgroundColor || "rgba(0, 0, 0, 0.75)";
  const textColor = style.textColor || "#00FFFF";
  const borderRadius = style.borderRadius || "8px";
  const backdropFilter = style.backdropBlur ? `blur(8px)` : "none";

  const containerStyle = {
    backgroundColor: bgColor,
    color: textColor,
    borderRadius,
    backdropFilter,
  };

  const textContent = quote?.text || defaultText;
  const authorContent = quote?.author || defaultAuthor;
  const sourceContent = quote?.source || defaultSource;

  // Format the text content to handle newlines
  const formattedText = textContent.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < textContent.split('\n').length - 1 && <br />}
    </span>
  ));

  return (
    <div 
      className="bg-overlay backdrop-blur-sm rounded-lg p-6 quote-overlay max-w-md"
      style={containerStyle}
    >
      <p className="font-mono text-accent text-lg" style={{ color: textColor }}>
        {formattedText}
      </p>
      {(authorContent || sourceContent) && (
        <p className="font-mono text-accent/60 text-sm mt-2" style={{ color: `${textColor}99` }}>
          {authorContent && `${authorContent}`}
          {sourceContent && authorContent && ` - ${sourceContent}`}
          {sourceContent && !authorContent && `${sourceContent}`}
        </p>
      )}
    </div>
  );
}
