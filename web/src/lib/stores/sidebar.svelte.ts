import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
import { PersistedLocalStorage } from '$lib/utils/persisted';

/**
 * Whether sidebar should be collapsed (showing a column of icon buttons only, instead of hiding the sidebar).
 */
const isSidebarCollapsed = new PersistedLocalStorage<boolean>('sidebar-collapsed', false);

class SidebarStore {
  /**
   * Whether full sidebar should be visible. This depends on mediaQueryManager.
   */
  isVisible = $derived.by(() => mediaQueryManager.isFullSidebar);

  get isCollapsed() {
    return isSidebarCollapsed.current;
  }

  set isCollapsed(value: boolean) {
    isSidebarCollapsed.current = value;
  }

  /**
   * Reset the sidebar visibility to the default, based on the current screen width.
   */
  reset() {
    this.isVisible = mediaQueryManager.isFullSidebar;
  }

  /**
   * Toggles the sidebar visibility, if available at the current screen width.
   */
  toggle() {
    this.isVisible = mediaQueryManager.isFullSidebar ? true : !this.isVisible;
  }
}

export const sidebarStore = new SidebarStore();
