<script lang="ts">
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { IconButton } from '@immich/ui';
  import { mdiClose } from '@mdi/js';
  import { t } from 'svelte-i18n';
</script>

<section class="relative p-2">
  <div class="sticky top-0 z-2 flex place-items-center gap-2 bg-light pt-1 pb-2 dark:bg-immich-dark-bg">
    <IconButton
      icon={mdiClose}
      aria-label={$t('close')}
      onclick={() => assetViewerManager.closeGeminiPanel()}
      shape="round"
      color="secondary"
      variant="ghost"
    />
    <p class="text-lg text-immich-fg dark:text-immich-dark-fg">Gemini</p>
  </div>

  <div class="p-4 text-immich-fg dark:text-immich-dark-fg">
    gemini
  </div>
</section>
