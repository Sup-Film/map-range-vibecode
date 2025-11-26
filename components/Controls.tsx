import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Loader2,
  Sparkles,
  Search,
  Link as LinkIcon,
  Download,
  Home,
  ShoppingCart,
  Store,
  Utensils,
  Bus,
  TreePine,
  Building2,
  Layers,
  Map as MapIcon,
  Star,
  Clock,
  Wallet,
  ChevronRight,
  Footprints,
  TrainFront,
  Car,
  ChevronDown,
  ChevronUp,
  Ruler,
  ChevronDownCircle,
} from "lucide-react";
import {
  Location,
  AppStatus,
  AnalysisResult,
  PlaceItem,
  ViewMode,
  RouteOption,
  Category,
} from "../types";
import { searchLocation } from "../services/apiService";

interface ControlsProps {
  location: Location;
  destination: Location | null;
  radius: number;
  setRadius: (r: number) => void;
  status: AppStatus;
  analysis: AnalysisResult | null;
  routes: RouteOption[] | null;
  onAnalyze: () => void;
  onCalculateRoute: () => void;
  onLocateMe: () => void;
  onLocationSelect: (loc: Location, isDestination?: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedRoute: RouteOption | null;
  onSelectRoute: (route: RouteOption | null) => void;
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

const Controls: React.FC<ControlsProps> = ({
  location,
  destination,
  radius,
  setRadius,
  status,
  analysis,
  routes,
  onAnalyze,
  onCalculateRoute,
  onLocateMe,
  onLocationSelect,
  viewMode,
  setViewMode,
  selectedRoute,
  onSelectRoute,
  selectedCategory,
  onSelectCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [destSearchQuery, setDestSearchQuery] = useState("");
  const [urlQuery, setUrlQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // State for controlling "Load More" per category
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    {}
  );
  const INITIAL_VISIBLE_COUNT = 5;
  const LOAD_MORE_STEP = 10;

  // Reset visible counts when analysis changes
  useEffect(() => {
    setVisibleCounts({});
  }, [analysis]);

  const radiusDisplay =
    radius >= 1000 ? `${(radius / 1000).toFixed(1)} กม.` : `${radius} ม.`;

  const handleSearch = async (e: React.FormEvent, isDest: boolean = false) => {
    e.preventDefault();
    const query = isDest ? destSearchQuery : searchQuery;
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const coords = await searchLocation(query);
      onLocationSelect(coords, isDest);
      if (!isDest) setSearchQuery("");
      else setDestSearchQuery("");
    } catch (error) {
      alert("ไม่พบสถานที่นี้ กรุณาลองชื่ออื่น หรือระบุให้ชัดเจนขึ้น");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUrlImport = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    if (!urlQuery.trim()) return;

    const latLngRegex =
      /(?:[@?&](?:q=|ll=)?|^)([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/;
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

    setUrlError("ไม่พบพิกัดในลิงก์ที่ระบุ");
  };

  const toggleRouteExpand = (route: RouteOption) => {
    if (selectedRoute?.id === route.id) {
      onSelectRoute(null);
    } else {
      onSelectRoute(route);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        <Star className="w-3 h-3 fill-current" />
        <span className="text-xs font-semibold text-slate-600">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  const renderCategory = (
    title: string,
    icon: React.ReactNode,
    items: PlaceItem[],
    colorClass: string,
    categoryKey: string
  ) => {
    if (!items || items.length === 0) return null;

    // Filter logic: Only show if category matches or 'all' is selected
    if (selectedCategory !== "all" && selectedCategory !== categoryKey)
      return null;

    const limit = visibleCounts[categoryKey] || INITIAL_VISIBLE_COUNT;
    const visibleItems = items.slice(0, limit);
    const hasMore = items.length > limit;

    return (
      <div className="mb-4 last:mb-0">
        <h4
          className={`text-sm font-bold flex items-center gap-2 mb-2 ${colorClass}`}>
          {icon}
          {title}
          <span className="text-xs text-slate-400 font-normal ml-auto">
            {items.length} แห่ง
          </span>
        </h4>
        <ul className="space-y-2">
          {visibleItems.map((item, idx) => (
            <li
              key={idx}
              className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-700 font-medium truncate flex-1 pr-2">
                  {item.name}
                </span>
                <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 whitespace-nowrap">
                  {item.distance}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {renderStars(item.rating)}
                  {item.reviews && (
                    <span className="text-[10px] text-slate-400">
                      ({item.reviews} รีวิว)
                    </span>
                  )}
                </div>
                {item.popularity && (
                  <div
                    className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden"
                    title={`Popularity Score: ${(item.popularity * 10).toFixed(
                      1
                    )}`}>
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

        {/* Load More Button */}
        {hasMore && (
          <button
            onClick={() =>
              setVisibleCounts((prev) => ({
                ...prev,
                [categoryKey]: limit + LOAD_MORE_STEP,
              }))
            }
            className="w-full mt-2 py-1.5 text-xs text-slate-500 font-medium bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center justify-center gap-1">
            <ChevronDownCircle className="w-3 h-3" />
            แสดงเพิ่มอีก {Math.min(LOAD_MORE_STEP, items.length - limit)} รายการ
          </button>
        )}
      </div>
    );
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "walk":
        return <Footprints className="w-3 h-3" />;
      case "train":
        return <TrainFront className="w-3 h-3" />;
      case "car":
      case "motorcycle":
        return <Car className="w-3 h-3" />;
      case "bus":
        return <Bus className="w-3 h-3" />;
      default:
        return <Navigation className="w-3 h-3" />;
    }
  };

  const categories: { key: Category; label: string; icon: React.ReactNode }[] =
    [
      { key: "all", label: "ทั้งหมด", icon: <Layers className="w-3 h-3" /> },
      {
        key: "convenience",
        label: "ร้านสะดวกซื้อ",
        icon: <Store className="w-3 h-3" />,
      },
      {
        key: "food",
        label: "ร้านอาหาร",
        icon: <Utensils className="w-3 h-3" />,
      },
      {
        key: "shopping",
        label: "ห้าง/ตลาด",
        icon: <ShoppingCart className="w-3 h-3" />,
      },
      {
        key: "transport",
        label: "การเดินทาง",
        icon: <Bus className="w-3 h-3" />,
      },
      {
        key: "residential",
        label: "ที่อยู่อาศัย",
        icon: <Home className="w-3 h-3" />,
      },
      {
        key: "recreation",
        label: "นันทนาการ",
        icon: <TreePine className="w-3 h-3" />,
      },
      {
        key: "public_service",
        label: "บริการสาธารณะ",
        icon: <Building2 className="w-3 h-3" />,
      },
    ];

  return (
    <div className="bg-white h-full flex flex-col shadow-xl border-r border-slate-200 w-full max-w-md z-10 relative">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          MapRange AI
        </h1>
        <p className="text-blue-100 text-sm mt-1 opacity-90">
          วิเคราะห์พื้นที่ & ค้นหาเส้นทาง
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner">
          <button
            onClick={() => setViewMode("markers")}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${
              viewMode === "markers" || viewMode === "heatmap"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-100"
                : "text-slate-500 hover:bg-slate-200"
            }`}>
            <Sparkles className="w-3 h-3" />
            วิเคราะห์พื้นที่
          </button>
          <button
            onClick={() => setViewMode("route")}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${
              viewMode === "route"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-100"
                : "text-slate-500 hover:bg-slate-200"
            }`}>
            <Navigation className="w-3 h-3" />
            ค้นหาเส้นทาง
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* === ANALYSIS MODE UI === */}
        {viewMode !== "route" && (
          <>
            {/* Search Section */}
            <section>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                จุดศูนย์กลาง (Origin)
              </label>
              <form
                onSubmit={(e) => handleSearch(e, false)}
                className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาสถานที่ตั้งต้น..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                  disabled={isSearching}
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-2 text-blue-600 p-1 rounded hover:bg-blue-50">
                  {isSearching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </form>
            </section>

            {/* Radius Control */}
            <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-end mb-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ระยะรัศมี
                </label>
                <span className="text-lg font-bold text-blue-600 font-mono">
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
            </section>

            {/* Sub View Mode */}
            <section>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Layer
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("markers")}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 ${
                    viewMode === "markers"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}>
                  <MapIcon className="w-3 h-3" /> Markers
                </button>
                <button
                  onClick={() => setViewMode("heatmap")}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 ${
                    viewMode === "heatmap"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}>
                  <Layers className="w-3 h-3" /> Heatmap
                </button>
              </div>
              {viewMode === "heatmap" && (
                <div className="mt-3">
                  <div className="h-2 rounded-full w-full bg-gradient-to-r from-blue-500 via-green-400 via-yellow-400 to-red-500"></div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Low Density</span>
                    <span>High Density</span>
                  </div>
                </div>
              )}
            </section>

            {/* Action Button */}
            <button
              onClick={onAnalyze}
              disabled={status === AppStatus.LOADING}
              className={`
                w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md mt-4
                ${
                  status === AppStatus.LOADING
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg"
                }
              `}>
              {status === AppStatus.LOADING ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังวิเคราะห์...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  เริ่มวิเคราะห์
                </>
              )}
            </button>

            {/* Results List */}
            {status === AppStatus.SUCCESS && analysis && (
              <div className="animate-fade-in pt-4 border-t border-slate-100">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                  <h3 className="text-indigo-900 font-bold mb-1">
                    {analysis.locationName}
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                {/* Category Filter Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => onSelectCategory(cat.key)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${
                          selectedCategory === cat.key
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }
                      `}>
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {renderCategory(
                    "ร้านสะดวกซื้อ",
                    <Store className="w-4 h-4" />,
                    analysis.convenience,
                    "text-orange-600",
                    "convenience"
                  )}
                  {renderCategory(
                    "ร้านอาหาร",
                    <Utensils className="w-4 h-4" />,
                    analysis.food,
                    "text-green-600",
                    "food"
                  )}
                  {renderCategory(
                    "ห้าง/ตลาด",
                    <ShoppingCart className="w-4 h-4" />,
                    analysis.shopping,
                    "text-purple-600",
                    "shopping"
                  )}
                  {renderCategory(
                    "ที่อยู่อาศัย",
                    <Home className="w-4 h-4" />,
                    analysis.residential,
                    "text-blue-600",
                    "residential"
                  )}
                  {renderCategory(
                    "การเดินทาง",
                    <Bus className="w-4 h-4" />,
                    analysis.transport,
                    "text-cyan-600",
                    "transport"
                  )}
                  {renderCategory(
                    "นันทนาการ",
                    <TreePine className="w-4 h-4" />,
                    analysis.recreation,
                    "text-emerald-600",
                    "recreation"
                  )}
                  {renderCategory(
                    "บริการสาธารณะ",
                    <Building2 className="w-4 h-4" />,
                    analysis.public_service,
                    "text-slate-600",
                    "public_service"
                  )}
                </div>
              </div>
            )}

            {/* Google Maps Import (Keep it here as utility) */}
            <section className="pt-4 border-t border-slate-100">
              <details className="group">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-blue-600 list-none flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> Import from URL
                </summary>
                <form onSubmit={handleUrlImport} className="mt-2 relative">
                  <input
                    type="text"
                    value={urlQuery}
                    onChange={(e) => {
                      setUrlQuery(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="วางลิงก์ Google Maps..."
                    className="w-full pl-3 pr-8 py-2 rounded border border-slate-200 text-xs"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bg-green-100 text-green-700 p-1 rounded hover:bg-green-200">
                    <Download className="w-3 h-3" />
                  </button>
                </form>
              </details>
            </section>
          </>
        )}

        {/* === ROUTE MODE UI === */}
        {viewMode === "route" && (
          <div className="animate-fade-in space-y-6">
            {/* Points Input */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative">
              {/* Connector Line */}
              <div className="absolute left-[27px] top-[34px] bottom-[34px] w-0.5 border-l-2 border-dashed border-slate-300 pointer-events-none" />

              {/* Origin */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 z-10">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">
                    จุดเริ่มต้น
                  </label>
                  <div className="text-sm font-medium text-slate-800 truncate pr-2">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </div>
                </div>
                <button
                  onClick={onLocateMe}
                  className="text-slate-400 hover:text-blue-600 p-1">
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200 z-10">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">
                    ปลายทาง
                  </label>
                  {destination ? (
                    <div className="text-sm font-medium text-slate-800 truncate pr-2">
                      {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSearch(e, true)}>
                      <input
                        type="text"
                        value={destSearchQuery}
                        onChange={(e) => setDestSearchQuery(e.target.value)}
                        placeholder="ค้นหา หรือ คลิกขวาบนแมพ..."
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:border-red-400 outline-none"
                      />
                    </form>
                  )}
                </div>
                {destination && (
                  <button
                    onClick={() => {
                      onLocationSelect(location, true);
                      setDestSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-red-600 text-xs underline">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={onCalculateRoute}
              disabled={status === AppStatus.LOADING || !destination}
              className={`
                w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md
                ${
                  status === AppStatus.LOADING || !destination
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg"
                }
              `}>
              {status === AppStatus.LOADING ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังคำนวณ...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  แนะนำเส้นทาง
                </>
              )}
            </button>

            {/* Routes List */}
            {status === AppStatus.SUCCESS && routes && (
              <div className="space-y-4 pt-2">
                {routes.map((route) => {
                  const isExpanded = selectedRoute?.id === route.id;
                  return (
                    <div
                      key={route.id}
                      className={`
                        border rounded-xl transition-all duration-300 overflow-hidden
                        ${
                          isExpanded
                            ? "bg-white border-indigo-200 ring-1 ring-indigo-200 shadow-md"
                            : "bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50"
                        }
                      `}
                      onClick={() => toggleRouteExpand(route)}>
                      {/* Card Header */}
                      <div className="p-4 cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <Car className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm">
                                {route.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {route.totalDuration}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Ruler className="w-3 h-3" />
                                  {route.totalDistance}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Wallet className="w-3 h-3" />
                                  {route.totalCost}
                                </div>
                              </div>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details (Steps) */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                          <div className="relative pl-2 space-y-4">
                            {/* Dotted Line */}
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 border-l border-dashed border-slate-300" />

                            {route.steps.map((step, sIdx) => (
                              <div key={sIdx} className="relative flex gap-3">
                                <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-sm text-slate-500">
                                  {getTransportIcon(step.mode)}
                                </div>
                                <div className="flex-1 py-1">
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    {step.instruction}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {step.duration && (
                                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">
                                        {step.duration}
                                      </span>
                                    )}
                                    {step.distance && (
                                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">
                                        {step.distance}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-[10px] text-center text-slate-400">
        Powered by OpenStreetMap, OSRM & Gemini 3.0 Pro
      </div>
    </div>
  );
};

export default Controls;
