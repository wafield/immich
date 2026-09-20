<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import { Route } from '$lib/route';
  import { getLibrariesActions, getLibraryActions } from '$lib/services/library.service';
  import { locale } from '$lib/stores/preferences.store';
  import { getBytesWithUnit } from '$lib/utils/byte-units';
  import { type LibraryResponseDto } from '@immich/sdk';
  import {
    CommandPaletteDefaultProvider,
    Container,
    ContextMenuButton,
    Icon,
    Link,
    MenuItemType,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeading,
    TableRow,
  } from '@immich/ui';
  import { mdiCheck, mdiClose } from '@mdi/js';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import type { LayoutData } from './$types';

  type Props = {
    children?: Snippet;
    data: LayoutData;
  };

  let { children, data }: Props = $props();

  let libraries = $derived([...data.libraries]);
  let owners = $derived({ ...data.owners });

  const onLibraryCreate = async (library: LibraryResponseDto) => {
    await goto(Route.viewLibrary(library));
  };

  const onLibraryUpdate = () => invalidate('app:libraries');
  const onLibraryDelete = () => invalidate('app:libraries');

  const { Create, ScanAll } = $derived(getLibrariesActions($t));

  const getActionsForLibrary = (library: LibraryResponseDto) => {
    const { Detail, Scan, Edit, Delete } = getLibraryActions($t, library);
    return [Detail, Scan, Edit, MenuItemType.Divider, Delete];
  };
</script>

<OnEvents {onLibraryCreate} {onLibraryUpdate} {onLibraryDelete} />

<CommandPaletteDefaultProvider name={$t('library')} actions={[Create, ScanAll]} />

<AdminPageLayout breadcrumbs={[{ title: data.meta.title }]} actions={[ScanAll, Create]}>
  <Container size="large" center class="w-(--breakpoint-lg)">
    <div class="flex flex-col items-center gap-2" in:fade={{ duration: 500 }}>
      {#if libraries.length > 0}
        <Table striped size="small" spacing="small">
          <TableHeader>
            <TableHeading>{$t('name')}</TableHeading>
            <TableHeading>{$t('owner')}</TableHeading>
            <TableHeading>{$t('shared')}</TableHeading>
            <TableHeading>{$t('photos')}</TableHeading>
            <TableHeading>{$t('videos')}</TableHeading>
            <TableHeading>{$t('size')}</TableHeading>
            <TableHeading>{$t('last_scanned')}</TableHeading>
            <TableHeading></TableHeading>
          </TableHeader>
          <TableBody>
            {#each libraries as library (library.id + library.name)}
              {@const owner = owners[library.id]}
              <TableRow>
                <TableCell>
                  <div class="flex items-center gap-2 px-4">
                    <Link href={Route.viewLibrary(library)}>{library.name}</Link>
                    {#if library.uiColor}
                      <span
                        class="inline-block size-3 rounded-sm border border-gray-300 dark:border-gray-600"
                        style:background-color={library.uiColor}
                        title={library.uiColor}
                      ></span>
                    {/if}
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={Route.viewUser(owner)}>{owner.name}</Link>
                </TableCell>
                <TableCell>
                  <div class="flex items-center justify-center">
                    {#if library.shared}
                      <Icon icon={mdiCheck} size="18" class="text-primary" />
                    {:else}
                      <Icon icon={mdiClose} size="18" class="text-gray-400" />
                    {/if}
                  </div>
                </TableCell>
                {#await data.statisticsPromise}
                  <TableCell>
                    <span class="skeleton-loader inline-block h-4 w-14"></span>
                  </TableCell>
                  <TableCell>
                    <span class="skeleton-loader inline-block h-4 w-14"></span>
                  </TableCell>
                  <TableCell>
                    <span class="skeleton-loader inline-block h-4 w-20"></span>
                  </TableCell>
                {:then loadedStats}
                  {@const stats = loadedStats[library.id]}
                  <TableCell>
                    {stats.photos.toLocaleString($locale)}
                  </TableCell>
                  <TableCell>
                    {stats.videos.toLocaleString($locale)}
                  </TableCell>
                  <TableCell>
                    {@const [diskUsage, diskUsageUnit] = getBytesWithUnit(stats.usage, 0)}
                    {diskUsage}
                    {diskUsageUnit}
                  </TableCell>
                {:catch}
                  <TableCell>
                    <span class="skeleton-loader inline-block h-4 w-14"></span>
                  </TableCell>
                  <TableCell>
                    <span class="skeleton-loader inline-block h-4 w-14"></span>
                  </TableCell>
                  <TableCell>
                    <span class="skeleton-loader inline-block h-4 w-20"></span>
                  </TableCell>
                {/await}
                <TableCell>
                  {library.refreshedAt ? new Date(library.refreshedAt).toLocaleString($locale) : '-'}
                </TableCell>
                <TableCell>
                  <ContextMenuButton color="primary" aria-label={$t('open')} items={getActionsForLibrary(library)} />
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {:else}
        <EmptyPlaceholder
          fullWidth
          text={$t('no_libraries_message')}
          onClick={() => goto(Route.newLibrary())}
          class="mx-auto mt-10"
        />
      {/if}

      {@render children?.()}
    </div>
  </Container>
</AdminPageLayout>

<style>
  .skeleton-loader {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    background-color: rgba(156, 163, 175, 0.35);
  }

  .skeleton-loader::after {
    content: '';
    position: absolute;
    inset: 0;
    background-repeat: no-repeat;
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.8) 50%,
      rgba(255, 255, 255, 0)
    );
    background-size: 200% 100%;
    background-position: 200% 0;
    animation: skeleton-animation 2000ms infinite;
  }

  @keyframes skeleton-animation {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
</style>
