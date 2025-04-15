import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Layer } from '@/lib/types';

interface LayoutContextProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  selectedLayer: Layer | null;
  setSelectedLayer: React.Dispatch<React.SetStateAction<Layer | null>>;
}

const LayoutContext = createContext<LayoutContextProps | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);

  return (
    <LayoutContext.Provider
      value={{
        layers,
        setLayers,
        selectedLayer,
        setSelectedLayer,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
