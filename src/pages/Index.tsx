import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountTagsBulk } from '@/hooks/useTags';
import FilterSidebar from '@/components/FilterSidebar';
import MapToolbar from '@/components/MapToolbar';
import AccountMap from '@/components/AccountMap';
import AccountDrawer from '@/components/AccountDrawer';
import MapHeader from '@/components/MapHeader';
import ChatView from '@/components/ChatView';
import ProspectView from '@/components/ProspectView';
import ContactsView from '@/components/ContactsView';
import RouteOverviewDialog from '@/components/RouteOverviewDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Route, Navigation, X, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { openGoogleMapsRoute, MAX_GOOGLE_MAPS_STOPS } from '@/lib/googleMapsRoute';
import { toast } from 'sonner';




const Index = () => {
  const {
    isSidebarOpen, setAccounts, setAccountTagsBulk, accounts,
    isRouteModeActive, toggleRouteMode,
    routeStops, clearRouteSelection,
    userLocation, activeTab
  } = useAppStore();
  const { data: dbAccounts, isLoading } = useAccounts();
  const { data: accountTagsMap } = useAccountTagsBulk();
  const isMobile = useIsMobile();

  // Sync database accounts to store, fallback to mock data if empty
  useEffect(() => {
    console.log('[Index] DB accounts:', dbAccounts?.length, 'Store accounts:', accounts.length, 'Loading:', isLoading);
    if (!isLoading && dbAccounts) {
      setAccounts(dbAccounts);
    }
  }, [dbAccounts, isLoading, setAccounts]);

  // Tags are fetched independently of the account list — this patches them
  // in whenever they arrive, without ever gating the account fetch above.
  useEffect(() => {
    if (accountTagsMap) {
      setAccountTagsBulk(accountTagsMap);
    }
  }, [accountTagsMap, setAccountTagsBulk]);

  const openGoogleMapsNavigation = () => {
    const { truncated } = openGoogleMapsRoute(routeStops, accounts, userLocation);
    if (truncated) {
      toast.warning(`Google Maps supports up to ${MAX_GOOGLE_MAPS_STOPS} stops per route — extra stops were dropped.`);
    }
  };
  
  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <FilterSidebar />
      
      {/* Main Content */}
      <div className={cn(
        "h-full transition-all duration-300",
        isSidebarOpen ? "ml-0 md:ml-72" : "ml-0 md:ml-16"
      )}>
        {/* Map tab — stays mounted so switching tabs never re-initializes Mapbox */}
        <div className={cn('h-full', activeTab === 'map' ? 'block' : 'hidden')}>
          <MapHeader />
          <MapToolbar />
          <div className="h-full pt-[100px] mr-0 md:mr-14">
            <AccountMap />
          </div>
        </div>

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div className="h-full">
            <ChatView />
          </div>
        )}

        {/* Prospect tab */}
        {activeTab === 'prospect' && (
          <div className="h-full">
            <ProspectView />
          </div>
        )}

        {/* Contacts tab */}
        {activeTab === 'contacts' && (
          <div className="h-full">
            <ContactsView />
          </div>
        )}
      </div>
      
      {/* Account Detail Drawer */}
      <AccountDrawer />

      {/* Mobile floating route bar — visible only on mobile when sidebar is closed */}
      {isMobile && !isSidebarOpen && (
        <div className="fixed bottom-6 left-4 right-4 z-40 flex justify-center">
          {isRouteModeActive ? (
            <div className="w-full max-w-sm flex items-center gap-1.5 bg-sidebar text-sidebar-foreground px-2 py-2 rounded-xl shadow-xl border border-sidebar-border">
              <span className="text-xs font-medium whitespace-nowrap">
                {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''}
              </span>
              {routeStops.length > 0 && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-sidebar-muted" onClick={clearRouteSelection}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {routeStops.length >= 1 && (
                <>
                  <RouteOverviewDialog />
                  <Button size="sm" className="gap-1 bg-status-active hover:bg-status-active/90 h-8 text-xs" onClick={openGoogleMapsNavigation}>
                    <Navigation className="w-3.5 h-3.5" />
                    Navigate
                  </Button>
                </>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-sidebar-muted" onClick={toggleRouteMode}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              className="gap-2 shadow-xl bg-sidebar-primary hover:bg-sidebar-primary/90 rounded-xl h-11 px-5"
              onClick={toggleRouteMode}
            >
              <Route className="w-4 h-4" />
              Plan Route
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
