import { browser } from '$app/environment';
import { eventManager } from '$lib/managers/event-manager.svelte';
import { getAllLibraries, type LibraryResponseDto } from '@immich/sdk';
import { derived, writable } from 'svelte/store';

export const userLibraries = writable<LibraryResponseDto[]>([]);

export const librariesMap = derived(userLibraries, ($libraries) => {
  const map = new Map<string, LibraryResponseDto>();
  for (const lib of $libraries) {
    map.set(lib.id, lib);
  }
  return map;
});

let loadingPromise: Promise<LibraryResponseDto[]> | null = null;

export const loadUserLibraries = async (force = false) => {
  if (force || !loadingPromise) {
    loadingPromise = getAllLibraries().catch((error) => {
      console.error('Failed to load user libraries:', error);
      loadingPromise = null;
      return [];
    });
  }
  const libraries = await loadingPromise;
  userLibraries.set(libraries);
  return libraries;
};

if (browser) {
  loadUserLibraries();
}

eventManager.on({
  LibraryUpdate: () => {
    loadUserLibraries(true);
  },
  LibraryDelete: () => {
    loadUserLibraries(true);
  },
  LibraryCreate: () => {
    loadUserLibraries(true);
  },
});
