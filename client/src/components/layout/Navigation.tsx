import { useState } from "react";
import { Link, useLocation } from "wouter";

interface NavigationProps {
  currentView: "configuration" | "output";
  setCurrentView: (view: "configuration" | "output") => void;
}

export function Navigation({ currentView, setCurrentView }: NavigationProps) {
  const [, setLocation] = useLocation();
  
  const handleViewChange = (view: "configuration" | "output") => {
    setCurrentView(view);
    // We're using view switching within the same route, not changing routes
  };
  
  const openSettingsModal = () => {
    // TODO: Implement settings modal if needed
  };
  
  return (
    <nav className="fixed top-0 w-full bg-card z-50 border-b border-secondary/30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <i className="ri-soundcloud-line text-2xl text-primary"></i>
          <h1 className="font-heading font-bold text-xl">Lo-Fi Stream Overlay</h1>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => handleViewChange("configuration" as "configuration" | "output")}
            className={`px-3 py-2 font-medium ${currentView === "configuration" ? "tab-active border-b-2 border-primary text-primary" : ""}`}
          >
            Configuration
          </button>
          <button 
            onClick={() => handleViewChange("output" as "configuration" | "output")}
            className={`px-3 py-2 font-medium ${currentView === "output" ? "tab-active border-b-2 border-primary text-primary" : ""}`}
          >
            Stream Output
          </button>
          <button 
            onClick={openSettingsModal}
            className="flex items-center space-x-1 bg-primary text-card px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
          >
            <i className="ri-settings-3-line"></i>
            <span>Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
