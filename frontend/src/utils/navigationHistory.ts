/**
 * ASTRA Universal Navigation & History State Abstraction.
 * Provides hierarchical, predictable back-navigation, browser history synchronization,
 * filter preservation, and active-mission protection across the entire web application.
 */

import { DestinationFilter } from './destinationModel';

export type AppViewMode = 'landing' | 'space-imagery' | 'mission-control';
export type McModeView = 'cockpit' | 'universe' | 'diagnostics';
export type UniverseTab = 'catalogue' | 'briefing' | 'history';

export interface CatalogueFilterState {
  destination: string;
  category: string;
  difficulty: string;
  status: string;
  search: string;
}

export interface NavigationLocation {
  viewMode: AppViewMode;
  mcModeView?: McModeView;
  universeTab?: UniverseTab;
  selectedMissionId?: string | null;
  selectedSpacecraftId?: string;
  destinationFilter?: DestinationFilter;
  catalogueFilters?: CatalogueFilterState;
  imageryDestinationId?: string;
  imageryDrawerOpen?: boolean;
  imageryModalOpen?: boolean;
}

class NavigationHistoryManager {
  private stack: NavigationLocation[] = [];
  private listeners: Array<(location: NavigationLocation) => void> = [];
  private isPopping = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', (e) => {
        if (e.state && typeof e.state === 'object' && e.state.viewMode) {
          this.isPopping = true;
          const loc = e.state as NavigationLocation;
          // Synchronize internal stack
          if (this.stack.length > 1) {
            this.stack.pop();
          } else {
            this.stack = [loc];
          }
          this.notify(loc);
          this.isPopping = false;
        } else {
          // Reconcile hash or default to landing
          const fallback = this.parseUrlHash();
          this.notify(fallback);
        }
      });
    }
  }

  public init(initial: NavigationLocation): void {
    this.stack = [initial];
    this.syncUrl(initial, true);
  }

  public clear(): void {
    this.stack = [{ viewMode: 'landing' }];
  }

  public getCurrent(): NavigationLocation {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : { viewMode: 'landing' };
  }

  public push(location: NavigationLocation): void {
    const current = this.getCurrent();
    // Prevent duplicate consecutive states
    if (this.isEqual(current, location)) {
      return;
    }

    this.stack.push(location);
    this.syncUrl(location, false);
    this.notify(location);
  }

  public replace(location: NavigationLocation): void {
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1] = location;
    } else {
      this.stack = [location];
    }
    this.syncUrl(location, true);
    this.notify(location);
  }

  /**
   * One logical step back navigation.
   * If an in-app previous state exists in the stack, pops and navigates to it.
   * If the stack has only 1 entry or was reached directly, determines the logical parent fallback.
   */
  public goBack(): NavigationLocation {
    if (this.stack.length > 1) {
      this.stack.pop();
      const prev = this.stack[this.stack.length - 1];
      this.syncUrl(prev, false);
      if (typeof window !== 'undefined' && window.history.length > 1) {
        // Inform browser history if applicable
        try {
          window.history.back();
        } catch (_) {}
      }
      this.notify(prev);
      return prev;
    }

    // Logical parent hierarchy fallback
    const current = this.getCurrent();
    const fallback = this.computeLogicalParent(current);
    this.stack = [fallback];
    this.syncUrl(fallback, true);
    this.notify(fallback);
    return fallback;
  }

  public computeLogicalParent(current: NavigationLocation): NavigationLocation {
    if (current.viewMode === 'space-imagery') {
      if (current.imageryModalOpen || current.imageryDrawerOpen) {
        return {
          ...current,
          imageryModalOpen: false,
          imageryDrawerOpen: false,
        };
      }
      return { viewMode: 'landing' };
    }

    if (current.viewMode === 'mission-control') {
      if (current.mcModeView === 'universe') {
        if (current.universeTab === 'briefing' || current.universeTab === 'history') {
          // Return to catalogue, keeping previous filters
          return {
            ...current,
            universeTab: 'catalogue',
            selectedMissionId: null,
          };
        }
        // From universe catalogue -> return to cockpit
        return {
          viewMode: 'mission-control',
          mcModeView: 'cockpit',
          selectedMissionId: current.selectedMissionId,
          selectedSpacecraftId: current.selectedSpacecraftId,
        };
      }

      if (current.mcModeView === 'diagnostics') {
        return {
          viewMode: 'mission-control',
          mcModeView: 'cockpit',
          selectedSpacecraftId: current.selectedSpacecraftId,
        };
      }

      // From root cockpit -> return to landing
      return { viewMode: 'landing' };
    }

    return { viewMode: 'landing' };
  }

  public subscribe(listener: (location: NavigationLocation) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(location: NavigationLocation): void {
    this.listeners.forEach((l) => l(location));
  }

  private isEqual(a: NavigationLocation, b: NavigationLocation): boolean {
    return (
      a.viewMode === b.viewMode &&
      a.mcModeView === b.mcModeView &&
      a.universeTab === b.universeTab &&
      a.selectedMissionId === b.selectedMissionId &&
      a.selectedSpacecraftId === b.selectedSpacecraftId &&
      a.destinationFilter === b.destinationFilter &&
      a.imageryDestinationId === b.imageryDestinationId &&
      a.imageryDrawerOpen === b.imageryDrawerOpen &&
      a.imageryModalOpen === b.imageryModalOpen
    );
  }

  private syncUrl(location: NavigationLocation, replace: boolean): void {
    if (typeof window === 'undefined' || this.isPopping) return;

    let hash = '';
    const params = new URLSearchParams();

    if (location.viewMode === 'space-imagery') {
      hash = '#space-imagery';
      if (location.imageryDestinationId) {
        params.set('dest', location.imageryDestinationId);
      }
    } else if (location.viewMode === 'mission-control') {
      hash = '#mission-control';
      if (location.mcModeView) {
        params.set('mode', location.mcModeView);
      }
      if (location.mcModeView === 'universe') {
        if (location.universeTab) {
          params.set('tab', location.universeTab);
        }
        if (location.selectedMissionId) {
          params.set('mission', location.selectedMissionId);
        }
      }
      if (location.selectedSpacecraftId) {
        params.set('craft', location.selectedSpacecraftId);
      }
      if (location.destinationFilter) {
        params.set('dest', location.destinationFilter);
      }
    }

    const paramStr = params.toString();
    const finalHash = hash ? (paramStr ? `${hash}?${paramStr}` : hash) : '';
    const pathname = (typeof window !== 'undefined' && window.location?.pathname) || '';
    const url = finalHash ? `${pathname}${finalHash}` : (pathname || '/');

    try {
      if (typeof window !== 'undefined' && window.history) {
        if (replace) {
          window.history.replaceState(location, '', url);
        } else {
          window.history.pushState(location, '', url);
        }
      }
    } catch (_) {}
  }

  public parseUrlHash(): NavigationLocation {
    if (typeof window === 'undefined' || !window.location) return { viewMode: 'landing' };

    const fullHash = window.location.hash || '';
    if (!fullHash) return { viewMode: 'landing' };

    const [hashPart, queryPart] = fullHash.split('?');
    const params = new URLSearchParams(queryPart || '');

    if (hashPart === '#space-imagery') {
      return {
        viewMode: 'space-imagery',
        imageryDestinationId: params.get('dest') || undefined,
      };
    }

    if (hashPart === '#mission-control') {
      const mode = (params.get('mode') as McModeView) || 'cockpit';
      const tab = (params.get('tab') as UniverseTab) || 'catalogue';
      const mission = params.get('mission') || null;
      const craft = params.get('craft') || undefined;
      const dest = (params.get('dest') as DestinationFilter) || undefined;

      return {
        viewMode: 'mission-control',
        mcModeView: mode,
        universeTab: tab,
        selectedMissionId: mission,
        selectedSpacecraftId: craft,
        destinationFilter: dest,
      };
    }

    return { viewMode: 'landing' };
  }
}

export const navigationHistory = new NavigationHistoryManager();
