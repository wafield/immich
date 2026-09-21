<script lang="ts">
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { generateGeminiContent } from '$lib/services/gemini.service';
  import type { AssetResponseDto } from '@immich/sdk';
  import { Button, Icon, IconButton, LoadingSpinner, Textarea } from '@immich/ui';
  import { mdiAlertCircleOutline, mdiClose, mdiCreation, mdiSend } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    asset: AssetResponseDto;
  }

  let { asset }: Props = $props();

  let prompt = $state('');
  let isLoading = $state(false);
  let responseText = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    // Reset state when viewing a different asset
    if (asset?.id) {
      responseText = null;
      errorMessage = null;
      isLoading = false;
      prompt = '';
    }
  });

  const handleGenerate = async (promptToSend: string) => {
    const trimmedPrompt = promptToSend.trim();
    if (isLoading || !asset?.id || !trimmedPrompt) {
      return;
    }

    isLoading = true;
    errorMessage = null;
    responseText = null;

    try {
      const response = await generateGeminiContent({
        assetId: asset.id,
        prompt: trimmedPrompt,
      });
      responseText = response.text;
      await assetViewerManager.fetchGeminiResponses(asset.id);
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isLoading = false;
    }
  };

  const handleSendCustomPrompt = () => {
    handleGenerate(prompt);
  };

  const handlePresetPrompt = (presetText: string) => {
    handleGenerate(presetText);
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
    <!-- Custom Prompt Textarea -->
    <div class="flex flex-col gap-2">
      <label
        for="gemini-custom-prompt"
        class="text-xs font-semibold uppercase tracking-wider text-immich-fg/60 dark:text-immich-dark-fg/60"
      >
        Prompt
      </label>
      <Textarea
        id="gemini-custom-prompt"
        variant="ghost"
        class="immich-form-input w-full resize-none text-sm"
        placeholder="Ask Gemini about this image..."
        bind:value={prompt}
        disabled={isLoading}
        onkeydown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSendCustomPrompt();
          }
        }}
      />
      <div class="flex justify-end">
        <Button
          shape="round"
          color="primary"
          size="medium"
          leadingIcon={mdiSend}
          loading={isLoading}
          disabled={isLoading || !prompt.trim()}
          onclick={handleSendCustomPrompt}
          title="Send prompt"
        >
          <span>Send</span>
          <span class="sr-only">Send prompt</span>
        </Button>
      </div>
    </div>

    <!-- Preset Prompts Section -->
    <div class="flex flex-col gap-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-immich-fg/60 dark:text-immich-dark-fg/60">
        Preset Prompts
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          shape="round"
          color="secondary"
          size="medium"
          leadingIcon={mdiCreation}
          loading={isLoading}
          disabled={isLoading}
          onclick={() => handlePresetPrompt('Please describe what you see in this image.')}
          title="Describe this image"
        >
          <span>Describe this image</span>
          <span class="sr-only">Describe this image</span>
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    {#if isLoading}
      <div class="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <LoadingSpinner size="small" />
        <span class="font-medium animate-pulse">Analyzing image with Gemini...</span>
      </div>
    {/if}

    <!-- Error State -->
    {#if errorMessage}
      <div
        class="flex flex-col gap-1 rounded-lg border border-red-500/20 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-400"
        role="alert"
      >
        <div class="flex items-center gap-2 font-medium">
          <Icon icon={mdiAlertCircleOutline} size="20" />
          <span>Failed to generate response</span>
        </div>
        <p class="mt-1 whitespace-pre-wrap break-words">{errorMessage}</p>
      </div>
    {/if}

    <!-- Response Display -->
    {#if responseText}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-immich-fg/60 dark:text-immich-dark-fg/60">
          Response
        </p>
        <div
          class="rounded-lg bg-gray-100 p-4 text-sm leading-relaxed text-immich-fg select-text whitespace-pre-wrap dark:bg-immich-dark-gray/30 dark:text-immich-dark-fg"
        >
          {responseText}
        </div>
      </div>
    {/if}
  </div>
</section>
