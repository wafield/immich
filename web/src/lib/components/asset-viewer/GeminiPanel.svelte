<script lang="ts">
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { generateGeminiContent } from '$lib/services/gemini.service';
  import type { AssetResponseDto } from '@immich/sdk';
  import { Button, Icon, IconButton, LoadingSpinner } from '@immich/ui';
  import { mdiAlertCircleOutline, mdiClose, mdiCreation } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    asset: AssetResponseDto;
  }

  let { asset }: Props = $props();

  let isLoading = $state(false);
  let description = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    // Reset state when viewing a different asset
    if (asset?.id) {
      description = null;
      errorMessage = null;
      isLoading = false;
    }
  });

  const handleDescribe = async () => {
    if (isLoading || !asset?.id) {
      return;
    }

    isLoading = true;
    errorMessage = null;
    description = null;

    try {
      const response = await generateGeminiContent({
        assetId: asset.id,
        prompt: 'Please describe what you see in this image.',
      });
      description = response.text;
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isLoading = false;
    }
  };
</script>

<section class="relative flex h-full flex-col p-2">
  <div class="sticky top-0 z-2 flex place-items-center gap-2 bg-light pt-1 pb-2 dark:bg-immich-dark-bg">
    <IconButton
      icon={mdiClose}
      aria-label={$t('close')}
      onclick={() => assetViewerManager.closeGeminiPanel()}
      shape="round"
      color="secondary"
      variant="ghost"
    />
    <p class="text-lg font-medium text-immich-fg dark:text-immich-dark-fg">Gemini</p>
  </div>

  <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
    <div>
      <Button
        shape="round"
        color="primary"
        size="medium"
        leadingIcon={mdiCreation}
        loading={isLoading}
        disabled={isLoading}
        onclick={handleDescribe}
        title="Describe this image"
      >
        <span>Describe this image</span>
        <span class="sr-only">Desribe this image</span>
      </Button>
    </div>

    {#if isLoading}
      <div class="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <LoadingSpinner size="small" />
        <span class="font-medium animate-pulse">Analyzing image with Gemini...</span>
      </div>
    {/if}

    {#if errorMessage}
      <div
        class="flex flex-col gap-1 rounded-lg border border-red-500/20 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-400"
        role="alert"
      >
        <div class="flex items-center gap-2 font-medium">
          <Icon path={mdiAlertCircleOutline} size="20" />
          <span>Failed to describe image</span>
        </div>
        <p class="mt-1 whitespace-pre-wrap break-words">{errorMessage}</p>
      </div>
    {/if}

    {#if description}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-immich-fg/60 dark:text-immich-dark-fg/60">
          Description
        </p>
        <div
          class="rounded-lg bg-gray-100 p-4 text-sm leading-relaxed text-immich-fg select-text whitespace-pre-wrap dark:bg-immich-dark-gray/30 dark:text-immich-dark-fg"
        >
          {description}
        </div>
      </div>
    {/if}
  </div>
</section>
