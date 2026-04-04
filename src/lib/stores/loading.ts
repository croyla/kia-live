import { writable } from 'svelte/store';

// True while GTFS static data has not yet been loaded into the feed store
export const gtfsLoading = writable<boolean>(true);

// Mutex: true while discovery.ts is mid-render of the current trip/stop state
export const discoveryLoading = writable<boolean>(false);