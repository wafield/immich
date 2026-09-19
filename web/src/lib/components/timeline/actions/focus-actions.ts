import { tick } from 'svelte';
import { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
import { moveFocus } from '$lib/utils/focus-util';
import { InvocationTracker } from '$lib/utils/invocationTracker';

const tracker = new InvocationTracker();

const getFocusedThumb = () => {
  const current = document.activeElement as HTMLElement | undefined;
  if (current && current.dataset.thumbnailFocusContainer !== undefined) {
    return current;
  }
};

export const focusNextAsset = () =>
  moveFocus((element) => element.dataset.thumbnailFocusContainer !== undefined, 'next');

export const focusPreviousAsset = () =>
  moveFocus((element) => element.dataset.thumbnailFocusContainer !== undefined, 'previous');

const queryHTMLElement = (query: string) => document.querySelector(query) as HTMLElement;

export const focusAsset = (assetId: string) => {
  const query = `[data-thumbnail-focus-container][data-asset="${assetId}"]`;
  const doFocus = (el: HTMLElement) => {
    document.querySelectorAll('[data-focused]').forEach((node) => node.removeAttribute('data-focused'));
    el.setAttribute('data-focused', 'true');
    try {
      el.focus({ focusVisible: true } as FocusOptions);
    } catch {
      el.focus();
    }
    el.addEventListener(
      'blur',
      () => {
        el.removeAttribute('data-focused');
      },
      { once: true },
    );
  };

  const element = queryHTMLElement(query);
  if (element) {
    doFocus(element);
    return;
  }

  let retries = 0;
  const retryFocus = () => {
    const el = queryHTMLElement(query);
    if (el) {
      doFocus(el);
    } else if (retries < 15) {
      retries++;
      requestAnimationFrame(retryFocus);
    }
  };
  requestAnimationFrame(retryFocus);
};

export const setFocusToAsset = (scrollToAsset: (asset: TimelineAsset) => boolean, asset: TimelineAsset) => {
  const scrolled = scrollToAsset(asset);
  if (scrolled) {
    focusAsset(asset.id);
  }
};

export const setFocusTo = async (
  scrollToAsset: (asset: TimelineAsset) => boolean,
  store: TimelineManager,
  direction: 'earlier' | 'later',
  interval: 'day' | 'month' | 'year' | 'asset',
) => {
  if (tracker.isActive()) {
    // there are unfinished running invocations, so return early
    return;
  }
  const thumb = getFocusedThumb();
  if (!thumb) {
    return direction === 'earlier' ? focusNextAsset() : focusPreviousAsset();
  }

  const invocation = tracker.startInvocation();
  const id = thumb.dataset.asset;
  if (!thumb || !id) {
    invocation.endInvocation();
    return;
  }

  const asset =
    direction === 'earlier'
      ? await store.getEarlierAsset({ id }, interval)
      : await store.getLaterAsset({ id }, interval);

  if (!invocation.isStillValid()) {
    return;
  }

  if (!asset) {
    invocation.endInvocation();
    return;
  }

  const scrolled = scrollToAsset(asset);
  if (scrolled) {
    await tick();
    if (!invocation.isStillValid()) {
      return;
    }
    focusAsset(asset.id);
  }

  invocation.endInvocation();
};
