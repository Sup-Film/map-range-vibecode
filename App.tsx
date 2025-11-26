
import React, { useState } from 'react';
import MapView from './components/MapView';
import Controls from './components/Controls';
import { Location, AppStatus, AnalysisResult, ViewMode } from './types';
import { analyzeLocation } from './services/geminiService';

// Default center (Bangkok)
const DEFAULT_CENTER: Location = { lat: 13.7563, lng: 100.5018 };
const DEFAULT_RADIUS = 1000; // 1km

const App: React.FC = () => {
  const [center, setCenter] = useState<Location>(DEFAULT_CENTER);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // New State: View Mode (Markers vs Heatmap)
  const [viewMode, setViewMode] = useState<ViewMode>('markers');

  // Helper to update location and reset analysis
  const handleLocationUpdate = (loc: Location) => {
    setCenter(loc);
    // Optional: Reset analysis when location changes to avoid confusion
    if (analysis) {
       setStatus(AppStatus.IDLE);
       setAnalysis(null);
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationUpdate({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location", error);
          alert("ไม่สามารถระบุตำแหน่งปัจจุบันได้");
        }
      );
    } else {
      alert("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
    }
  };

  const handleAnalyze = async () => {
    setStatus(AppStatus.LOADING);
    setAnalysis(null);
    try {
      const result = await analyzeLocation(center, radius);
      setAnalysis(result);
      setStatus(AppStatus.SUCCESS);
      
      // On mobile, if analysis is done, user might want to see the result, 
      // ensuring sidebar is open
      setSidebarOpen(true);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
    }
  };

  // Mobile toggle for sidebar
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-slate-100 relative">
      
      {/* Sidebar Controls */}
      <div 
        className={`
          absolute md:relative z-20 h-full transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:w-96 w-full max-w-[90%] md:max-w-md
        `}
      >
        <Controls 
          location={center}
          radius={radius}
          setRadius={setRadius}
          status={status}
          analysis={analysis}
          onAnalyze={handleAnalyze}
          onLocateMe={handleLocateMe}
          onLocationSelect={handleLocationUpdate}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
        
        {/* Mobile Toggle Handle (Visible only on mobile when closed/open) */}
        <button 
          onClick={toggleSidebar}
          className="md:hidden absolute top-4 -right-12 bg-white p-2 rounded-r-lg shadow-md text-slate-700 border border-l-0 border-slate-200"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 h-full w-full relative">
        <MapView 
          center={center} 
          radius={radius} 
          onLocationSelect={handleLocationUpdate}
          analysis={analysis}
          isLoading={status === AppStatus.LOADING}
          viewMode={viewMode}
        />
        
        {/* Mobile Overlay Background (when sidebar is open) */}
        {sidebarOpen && (
          <div 
            className="md:hidden absolute inset-0 bg-black/20 z-10 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
