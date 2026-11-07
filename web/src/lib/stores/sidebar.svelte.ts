import { mediaQueryManager } from '#lib/stores/media-query-manager.svelte.ts';
import { PersistedLocalStorage } from '#lib/utils/persisted.ts';

/**
 * Whether sidebar should be collapsed (showing a column of icon buttons only, instead of hiding the sidebar).
 */
const isSidebarCollapsed = new PersistedLocalStorage<boolean>('sidebar-collapsed', false);

class SidebarStore {
  /**
   * Whether full sidebar should be visible. This depends on mediaQueryManager.
   */
  isVisible = $derived.by(() => mediaQueryManager.isFullSidebar);

  get isOpen() {
    return this.isVisible;
  }

  set isOpen(value: boolean) {
    this.isVisible = value;
  }

  get isCollapsed() {
    return isSidebarCollapsed.current;
  }

  set isCollapsed(value: boolean) {
    isSidebarCollapsed.current = value;
  }

  /** Reset the sidebar visibility to the default, based on the current screen width. */
  reset() {
    this.isVisible = mediaQueryManager.isFullSidebar;
  }

  /**
   * Toggles the sidebar visibility, if available at the current screen width.
   * Make sure the sidebar visibility toggles only when full sidebar is visible (screen width >= 1023px).
   */
  toggle() {
    this.isVisible = mediaQueryManager.isFullSidebar || !this.isVisible;
  }
}

export const sidebarStore = new SidebarStore();
