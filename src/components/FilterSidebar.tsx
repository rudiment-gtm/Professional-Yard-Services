import {
  ChevronLeft,
  ChevronRight,
  Route,
  X,
  Navigation,
  Binoculars,
  Filter,
  Plus,
  Pencil,
  Bookmark,
} from 'lucide-react';
import AroundMeDialog from '@/components/AroundMeDialog';
import RouteOverviewDialog from '@/components/RouteOverviewDialog';
import LoadSharedRouteDialog from '@/components/LoadSharedRouteDialog';
import SavedRoutesDialog from '@/components/SavedRoutesDialog';
import { useAppStore, useFilteredAccounts } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import AdvancedFilterPanel from '@/components/filters/AdvancedFilterPanel';

const openAddAccountManual = () => {
  window.dispatchEvent(new CustomEvent('openAddAccountManual'));
};

export default function FilterSidebar() {
  const {
    isSidebarOpen,
    toggleSidebar,
    isRouteModeActive,
    toggleRouteMode,
    routeStops,
    clearRouteSelection,
    accounts,
    userLocation,
    openAroundMeWithOrigin,
    setAroundMeOpen,
    aroundMeResults,
    clearAroundMeResults,
    activeTab,
    setActiveTab,
  } = useAppStore();

  const hasAroundMeResults = aroundMeResults.length > 0;
  const filteredAccounts = useFilteredAccounts();

  // Generate Google Maps URL with waypoints - always starting from user's current location
  const openGoogleMapsNavigation = () => {
    if (routeStops.length < 1) return;

    const stopCoords = routeStops
      .map((stop) => {
        if (stop.kind === 'account') {
          const l = accounts.find((x) => x.id === stop.id);
          return l ? { latitude: l.latitude, longitude: l.longitude } : null;
        }
        return { latitude: stop.latitude, longitude: stop.longitude };
      })
      .filter((c): c is { latitude: number; longitude: number } => c !== null);

    if (stopCoords.length === 0) return;

    const hasUserLocation = userLocation && userLocation[0] !== 0 && userLocation[1] !== 0;
    let url = `https://www.google.com/maps/dir/?api=1`;

    if (hasUserLocation) {
      url += `&origin=${userLocation[1]},${userLocation[0]}`;
      const destination = stopCoords[stopCoords.length - 1];
      url += `&destination=${destination.latitude},${destination.longitude}`;
      const waypoints = stopCoords.slice(0, -1);
      if (waypoints.length > 0) {
        const waypointStr = waypoints.map((w) => `${w.latitude},${w.longitude}`).join('|');
        url += `&waypoints=${encodeURIComponent(waypointStr)}`;
      }
    } else {
      const origin = stopCoords[0];
      const destination = stopCoords[stopCoords.length - 1];
      const waypoints = stopCoords.slice(1, -1);
      url += `&origin=${origin.latitude},${origin.longitude}`;
      url += `&destination=${destination.latitude},${destination.longitude}`;
      if (waypoints.length > 0) {
        const waypointStr = waypoints.map((w) => `${w.latitude},${w.longitude}`).join('|');
        url += `&waypoints=${encodeURIComponent(waypointStr)}`;
      }
    }
    url += `&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out',
          'bg-sidebar text-sidebar-foreground shadow-xl',
          isSidebarOpen ? 'w-72' : 'w-0 -translate-x-full md:translate-x-0 md:w-16'
        )}
      >
        <div
          className={cn(
            'h-full flex flex-col overflow-hidden',
            isSidebarOpen ? 'opacity-100' : 'md:opacity-100 opacity-0'
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            {isSidebarOpen ? (
              <>
                <div>
                  <h1 className="text-lg font-bold text-sidebar-primary-foreground">ProYard Sales Map</h1>
                  <p className="text-xs text-sidebar-muted">Sales Territory Mapper</p>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="touch-button text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={toggleSidebar}
                className="touch-button mx-auto text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Tabs */}
          {isSidebarOpen && (
            <div className="p-2 border-b border-sidebar-border grid grid-cols-2 gap-1">
              {([
                ['chat', 'Chat'],
                ['map', 'Map'],
                ['prospect', 'Prospect'],
                ['contacts', 'Contacts'],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'text-sm font-medium py-1.5 rounded-md transition-colors',
                    activeTab === tab
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-muted hover:text-sidebar-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Stats Summary */}
          {isSidebarOpen && (
            <div className="p-4 border-b border-sidebar-border">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-sidebar-accent rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-sidebar-foreground">{accounts.length}</div>
                  <div className="text-xs text-sidebar-muted">Total Accounts</div>
                </div>
                <div className="bg-sidebar-accent rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-sidebar-foreground">{filteredAccounts.length}</div>
                  <div className="text-xs text-sidebar-muted">Showing</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {activeTab === 'map' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {isSidebarOpen ? (
              <AdvancedFilterPanel />
            ) : (
              <div className="flex flex-col items-center gap-4 pt-4">
                <button
                  onClick={toggleSidebar}
                  title="Filters"
                  className="touch-button rounded-lg bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all"
                >
                  <Filter className="w-5 h-5" />
                </button>
                <button
                  onClick={openAddAccountManual}
                  title="Add Account"
                  className="touch-button rounded-lg bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    hasAroundMeResults
                      ? setAroundMeOpen(true)
                      : openAroundMeWithOrigin(null)
                  }
                  title={hasAroundMeResults ? 'Edit Results' : 'Around Me'}
                  className="touch-button rounded-lg transition-all bg-status-active/20 text-status-active hover:bg-status-active/30"
                >
                  {hasAroundMeResults ? <Pencil className="w-5 h-5" /> : <Binoculars className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleRouteMode}
                  title={isRouteModeActive ? 'Exit Route Mode' : 'Plan Route'}
                  className={cn(
                    'touch-button rounded-lg transition-all',
                    isRouteModeActive
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-primary/20 text-primary hover:bg-primary/30',
                  )}
                >
                  {isRouteModeActive ? <X className="w-5 h-5" /> : <Route className="w-5 h-5" />}
                </button>
                <SavedRoutesDialog />
              </div>
            )}
          </div>
          )}

          {/* Route Mode Panel */}
          {activeTab === 'map' && isSidebarOpen && (
            <div className="p-4 border-t border-sidebar-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={openAddAccountManual}
                      aria-label="Add Account"
                      className="touch-button flex-1 h-11 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all inline-flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Add Account</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() =>
                        hasAroundMeResults
                          ? setAroundMeOpen(true)
                          : openAroundMeWithOrigin(null)
                      }
                      aria-label={hasAroundMeResults ? 'Edit Around Me Results' : 'Around Me'}
                      className="touch-button flex-1 h-11 rounded-lg bg-status-active text-white hover:bg-status-active/90 transition-all inline-flex items-center justify-center"
                    >
                      {hasAroundMeResults ? <Pencil className="w-5 h-5" /> : <Binoculars className="w-5 h-5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{hasAroundMeResults ? 'Edit Results' : 'Around Me'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleRouteMode}
                      aria-label={isRouteModeActive ? 'Exit Route Mode' : 'Plan Route'}
                      className={cn(
                        'touch-button flex-1 h-11 rounded-lg transition-all inline-flex items-center justify-center',
                        isRouteModeActive
                          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-2 ring-destructive/60'
                          : 'bg-primary/20 text-primary hover:bg-primary/30',
                      )}
                    >
                      {isRouteModeActive ? <X className="w-5 h-5" /> : <Route className="w-5 h-5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{isRouteModeActive ? 'Exit Route Mode' : 'Plan Route'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <SavedRoutesDialog triggerClassName="w-full h-11" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>My Routes</TooltipContent>
                </Tooltip>
              </div>

              <LoadSharedRouteDialog />

              {isRouteModeActive && (
                <div className="bg-sidebar-accent rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sidebar-foreground">
                      {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''} selected
                    </span>
                    {routeStops.length > 0 && (
                      <button
                        onClick={clearRouteSelection}
                        className="text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {userLocation && (
                    <p className="text-xs text-status-active flex items-center gap-1">
                      <span className="w-2 h-2 bg-status-active rounded-full" />
                      Starting from your location
                    </p>
                  )}

                  {routeStops.length >= 1 && (
                    <div className="space-y-2">
                      <RouteOverviewDialog />
                      <Button
                        className="w-full gap-2 bg-status-active hover:bg-status-active/90"
                        size="sm"
                        onClick={openGoogleMapsNavigation}
                      >
                        <Navigation className="w-4 h-4" />
                        Start Navigation
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-sidebar-muted">Click pins on the map to add stops</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile toggle button */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-4 z-50 md:hidden touch-button bg-sidebar text-sidebar-foreground rounded-lg shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <AroundMeDialog />
    </>
  );
}
