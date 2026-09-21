<script lang="ts">
  import { assetViewerManager } from '$lib/managers/asset-viewer-manager.svelte';
  import { generateGeminiContent } from '$lib/services/gemini.service';
  import { locale } from '$lib/stores/preferences.store';
  import type { AssetResponseDto } from '@immich/sdk';
  import { Button, Icon, IconButton, LoadingSpinner, Textarea } from '@immich/ui';
  import { mdiAlertCircleOutline, mdiClockOutline, mdiClose, mdiCreation, mdiSend } from '@mdi/js';
  import { DateTime } from 'luxon';
  import { marked } from 'marked';
  import { t } from 'svelte-i18n';

  interface Props {
    asset: AssetResponseDto;
  }

  let { asset }: Props = $props();

  let prompt = $state('');
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  const renderMarkdown = (text: string): string => {
    if (!text) {
      return '';
    }
    try {
      return marked.parse(text, { async: false, breaks: true }) as string;
    } catch {
      return text;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const dt = DateTime.fromISO(dateStr);
      if (!dt.isValid) {
        return dateStr;
      }
      return dt.setLocale($locale).toLocaleString(DateTime.DATETIME_MED);
    } catch {
      return dateStr;
    }
  };

  $effect(() => {
    // Reset state when viewing a different asset
    if (!asset?.id) {
      return;
    }
    errorMessage = null;
    isLoading = false;
    prompt = '';
  });

  const handleGenerate = async (promptToSend: string) => {
    const trimmedPrompt = promptToSend.trim();
    if (isLoading || !asset?.id || !trimmedPrompt) {
      return;
    }

    isLoading = true;
    errorMessage = null;

    try {
      await generateGeminiContent({
        assetId: asset.id,
        prompt: trimmedPrompt,
      });
      prompt = '';
      await assetViewerManager.fetchGeminiResponses(asset.id);
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading = false;
    }
  };

  const handleSendCustomPrompt = () => {
    void handleGenerate(prompt);
  };

  const handlePresetPrompt = (presetText: string) => {
    void handleGenerate(presetText);
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
    <!-- History Section -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold tracking-wider text-immich-fg/60 uppercase dark:text-immich-dark-fg/60">
          History
        </p>
        {#if assetViewerManager.geminiResponsesCount > 0}
          <span class="text-xs text-immich-fg/40 dark:text-immich-dark-fg/40">
            {assetViewerManager.geminiResponsesCount}
            {assetViewerManager.geminiResponsesCount === 1 ? 'entry' : 'entries'}
          </span>
        {/if}
      </div>

      {#if assetViewerManager.geminiResponses.length > 0}
        <div class="flex flex-col gap-3" data-testid="gemini-history-list">
          {#each assetViewerManager.geminiResponses as item (item.id)}
            <div class="flex flex-col gap-2.5" data-testid="gemini-history-item">
              <div class="flex items-center justify-between text-xs text-immich-fg/50 dark:text-immich-dark-fg/50">
                <div class="flex items-center gap-1.5">
                  <Icon icon={mdiClockOutline} size="14" />
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
                {#if item.modelName}
                  <span
                    class="rounded-sm bg-gray-200/60 px-1.5 py-0.5 text-[10px] font-medium text-immich-fg/70 dark:bg-immich-dark-gray/60 dark:text-immich-dark-fg/70"
                  >
                    {item.modelName}
                  </span>
                {/if}
              </div>

              <p class="pt-0.5 text-sm font-medium text-immich-fg select-text dark:text-immich-dark-fg">
                {item.prompt}
              </p>

              <div
                class="markdown-content rounded-lg bg-gray-100 p-4 text-sm/relaxed text-immich-fg select-text dark:bg-immich-dark-gray/30 dark:text-immich-dark-fg"
              >
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html renderMarkdown(item.response)}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-xs text-immich-fg/40 italic dark:text-immich-dark-fg/40">No previous prompts yet.</p>
      {/if}
    </div>

    <hr class="border-gray-200 dark:border-immich-dark-gray/40" />

    <!-- Custom Prompt Textarea -->
    <div class="flex flex-col gap-2">
      <label
        for="gemini-custom-prompt"
        class="text-xs font-semibold tracking-wider text-immich-fg/60 uppercase dark:text-immich-dark-fg/60"
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
          if (!((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
            return;
          }
          e.preventDefault();
          handleSendCustomPrompt();
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
    {#if !isLoading}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold tracking-wider text-immich-fg/60 uppercase dark:text-immich-dark-fg/60">
          Preset Prompts
        </p>
        <div class="flex flex-wrap gap-2">
          <Button
            shape="round"
            color="secondary"
            size="medium"
            leadingIcon={mdiCreation}
            onclick={() => handlePresetPrompt('Please describe what you see in this image.')}
            title="Describe this image"
          >
            <span>Describe this image</span>
            <span class="sr-only">Describe this image</span>
          </Button>
        </div>
      </div>
    {/if}

    <!-- Loading State -->
    {#if isLoading}
      <div class="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <LoadingSpinner size="small" />
        <span class="animate-pulse font-medium">Analyzing image with Gemini...</span>
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
        <p class="mt-1 wrap-break-word whitespace-pre-wrap">{errorMessage}</p>
      </div>
    {/if}
  </div>
</section>

<style>
  :global(.markdown-content p:not(:last-child)) {
    margin-bottom: 0.75rem;
  }
  :global(.markdown-content ul) {
    list-style-type: disc;
    padding-left: 1.25rem;
    margin-bottom: 0.75rem;
  }
  :global(.markdown-content ol) {
    list-style-type: decimal;
    padding-left: 1.25rem;
    margin-bottom: 0.75rem;
  }
  :global(.markdown-content li) {
    margin-bottom: 0.25rem;
  }
  :global(.markdown-content li > p) {
    margin-bottom: 0.25rem;
  }
  :global(.markdown-content code) {
    font-size: 0.85em;
    padding: 0.15em 0.3em;
    border-radius: 0.25rem;
    background-color: rgba(0, 0, 0, 0.08);
  }
  :global(.dark .markdown-content code) {
    background-color: rgba(255, 255, 255, 0.12);
  }
  :global(.markdown-content pre) {
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin-bottom: 0.75rem;
    background-color: rgba(0, 0, 0, 0.05);
  }
  :global(.dark .markdown-content pre) {
    background-color: rgba(0, 0, 0, 0.3);
  }
  :global(.markdown-content pre code) {
    padding: 0;
    background-color: transparent;
  }
  :global(.markdown-content a) {
    color: var(--immich-primary, #3b82f6);
    text-decoration: underline;
  }
  :global(.markdown-content strong) {
    font-weight: 600;
  }
  :global(.markdown-content blockquote) {
    border-left: 3px solid rgba(150, 150, 150, 0.4);
    padding-left: 0.75rem;
    margin-left: 0;
    margin-bottom: 0.75rem;
    font-style: italic;
  }
  :global(.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4) {
    font-weight: 600;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
  }
</style>
