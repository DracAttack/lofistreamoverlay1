import { cn } from "@/lib/utils";

interface DragHandleProps {
  className?: string;
}

export function DragHandle({ className }: DragHandleProps) {
  return (
    <i 
      className={cn(
        "ri-drag-move-fill text-secondary/70 cursor-move",
        className
      )}
      aria-hidden="true"
    />
  );
}
