
import React, { useState } from 'react';
import { MapPin, Navigation, Info, Loader2, Sparkles, AlertCircle, Search, Link as LinkIcon, Download, Home, ShoppingCart, Store, Utensils, Bus, TreePine, Building2, Layers, Map as MapIcon, Star } from 'lucide-react';
import { Location, AppStatus, AnalysisResult, PlaceItem, ViewMode } from '../types';
import { searchLocation } from '../services/geminiService';

interface ControlsProps {
  location: Location;
  radius: number;
  setRadius: (r: number) => void;
  status: AppStatus;
  analysis: AnalysisResult | null;
  onAnalyze: () => void;
  onLocateMe: () => void;
  onLocationSelect: (loc: Location) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const Controls: React.FC<ControlsProps> = ({
  location,
  radius,
  setRadius,
  status,
  analysis,
  onAnalyze,
  onLocateMe,
  onLocationSelect,
  viewMode,
  setViewMode
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [urlQuery, setUrlQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Convert meters to formatted string
  const radiusDisplay = radius >= 1000 ? `${(radius / 1000).toFixed(1)} กม.` : `${radius} ม.`;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const coords = await searchLocation(searchQuery);
      onLocationSelect(coords);
      setSearchQuery(""); 
    } catch (error) {
      alert("ไม่พบสถานที่นี้ กรุณาลองชื่ออื่น");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUrlImport = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    if (!urlQuery.trim()) return;

    const latLngRegex = /(?:[@?&](?:q=|ll=)?|^)([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/;
    const match = urlQuery.match(latLngRegex);

    if (match && match.length >= 3) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        onLocationSelect({ lat, lng });
        setUrlQuery("");
        return;
      }
    }

    setUrlError("ไม่พบพิกัดในลิงก์ที่ระบุ (รองรับลิงก์ที่มี @lat,lng หรือ q=lat,lng)");
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        <Star className="w-3 h-3 fill-current" />
        <span className="text-xs font-semibold text-slate-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderCategory = (title: string, icon: React.ReactNode, items: PlaceItem[], colorClass: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4 last:mb-0">
        <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${colorClass}`}>
          {icon}
          {title}
          <span className="text-xs text-slate-400 font-normal ml-auto">{items.length} แห่ง</span>
        </h4>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-700 font-medium truncate flex-1 pr-2">{item.name}</span>
                <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 whitespace-nowrap">
                  {item.distance}
                </span>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   {renderStars(item.rating)}
                   {item.reviews && <span className="text-[10px] text-slate-400">({item.reviews} รีวิว)</span>}
                 </div>
                 {/* Visual indicator for popularity/heatmap weight */}
                 {item.popularity && (
                   <div 
                     className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden" 
                     title={`Popularity Score: ${(item.popularity * 10).toFixed(1)}`}
                   >
                     <div 
                       className="h-full bg-gradient-to-r from-green-400 to-red-500" 
                       style={{ width: `${item.popularity * 100}%` }}
                     />
                   </div>
                 )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-white h-full flex flex-col shadow-xl border-r border-slate-200 w-full max-w-md z-10 relative">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          MapRange AI
        </h1>
        <p className="text-blue-100 text-sm mt-1 opacity-90">
          กำหนดรัศมีและวิเคราะห์พื้นที่รอบข้าง
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Search Section */}
        <section>
          <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            ค้นหาสถานที่
          </label>
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์ชื่อสถานที่..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 placeholder:text-slate-400"
              disabled={isSearching}
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            <button 
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-2 bg-blue-600 text-white p-1.5 rounded-lg disabled:bg-slate-300 transition-colors"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 rotate-90" />}
            </button>
          </form>
        </section>

        {/* Google Maps Import Section */}
        <section>
          <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2 block flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Import Google Maps Link
          </label>
          <form onSubmit={handleUrlImport} className="relative">
            <input
              type="text"
              value={urlQuery}
              onChange={(e) => {
                setUrlQuery(e.target.value);
                setUrlError(null);
              }}
              placeholder="วางลิงก์ Google Maps..."
              className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:ring-2 outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                urlError 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50' 
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            <LinkIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            <button 
              type="submit"
              disabled={!urlQuery.trim()}
              className="absolute right-2 top-2 bg-green-600 text-white p-1.5 rounded-lg disabled:bg-slate-300 hover:bg-green-700 transition-colors"
              title="Import Location"
            >
              <Download className="w-4 h-4" />
            </button>
          </form>
          {urlError && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {urlError}
            </p>
          )}
        </section>

        {/* Radius Control */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              ระยะรัศมี (Radius)
            </label>
            <span className="text-2xl font-bold text-blue-600 font-mono">
              {radiusDisplay}
            </span>
          </div>
          
          <input
            type="range"
            min="100"
            max="50000"
            step="100"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
            <span>100 ม.</span>
            <span>50 กม.</span>
          </div>
        </section>

        {/* View Mode Toggle */}
        <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
           <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 block">
              รูปแบบการแสดงผล
           </label>
           <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode('markers')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'markers' 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                หมุด (Markers)
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'heatmap' 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                ความหนาแน่น (Heatmap)
              </button>
           </div>
           
           {/* Heatmap Legend */}
           {viewMode === 'heatmap' && (
             <div className="mt-4 animate-fade-in">
               <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1 uppercase">
                 <span>น้อย (Low)</span>
                 <span>มาก (High)</span>
               </div>
               <div className="h-3 rounded-full w-full bg-gradient-to-r from-blue-500 via-green-400 via-yellow-400 to-red-500 shadow-inner"></div>
               <p className="text-[10px] text-slate-400 mt-2 text-center">
                 แสดงความหนาแน่นของสถานที่และความนิยม
               </p>
             </div>
           )}
        </section>

        {/* Location Info */}
        <section className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-slate-400" />
                พิกัดปัจจุบัน
              </h3>
              <div className="text-sm text-slate-600 font-mono pl-6">
                <div>Lat: {location.lat.toFixed(5)}</div>
                <div>Lng: {location.lng.toFixed(5)}</div>
              </div>
            </div>
            <button 
              onClick={onLocateMe}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip flex flex-col items-center gap-1"
              title="ใช้ตำแหน่งปัจจุบันของฉัน"
            >
              <Navigation className="w-5 h-5" />
              <span className="text-[10px] font-bold">GPS</span>
            </button>
          </div>
        </section>

        {/* Action Button */}
        <button
          onClick={onAnalyze}
          disabled={status === AppStatus.LOADING}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-md
            ${status === AppStatus.LOADING 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'}
          `}
        >
          {status === AppStatus.LOADING ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              กำลังวิเคราะห์...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              วิเคราะห์พื้นที่นี้
            </>
          )}
        </button>

        {/* Results Area */}
        {status === AppStatus.SUCCESS && analysis && (
          <section className="animate-fade-in space-y-4 pb-10">
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" />
                ผลการวิเคราะห์
              </h3>
              
              <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden mb-6">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
                  <span className="text-indigo-900 font-semibold">{analysis.locationName}</span>
                </div>
                <div className="p-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">ภาพรวม</span>
                  <p className="text-slate-600 text-sm leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              {/* Categorized Lists */}
              <div className="space-y-2">
                {renderCategory("ที่อยู่อาศัย", <Home className="w-4 h-4" />, analysis.residential, "text-blue-600")}
                {renderCategory("ร้านสะดวกซื้อ", <Store className="w-4 h-4" />, analysis.convenience, "text-orange-600")}
                {renderCategory("ห้าง/ตลาด", <ShoppingCart className="w-4 h-4" />, analysis.shopping, "text-purple-600")}
                {renderCategory("ร้านอาหาร", <Utensils className="w-4 h-4" />, analysis.food, "text-green-600")}
                {renderCategory("การเดินทาง", <Bus className="w-4 h-4" />, analysis.transport, "text-cyan-600")}
                {renderCategory("นันทนาการ", <TreePine className="w-4 h-4" />, analysis.recreation, "text-emerald-600")}
                {renderCategory("บริการสาธารณะ", <Building2 className="w-4 h-4" />, analysis.public_service, "text-slate-600")}
              </div>
            </div>
          </section>
        )}

        {status === AppStatus.ERROR && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
             <div>
               <p className="font-semibold">เกิดข้อผิดพลาด</p>
               <p className="text-sm opacity-90">ไม่สามารถวิเคราะห์ข้อมูลได้ โปรดลองใหม่อีกครั้ง</p>
             </div>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
        Powered by Google Gemini 2.5 Flash
      </div>
    </div>
  );
};

export default Controls;
