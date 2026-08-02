<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  import emptyFoldersUrl from '$lib/assets/empty-folders.svg';
  import AdminCard from '$lib/components/AdminCard.svelte';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import ServerStatisticsCard from '$lib/components/server-statistics/ServerStatisticsCard.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/EmptyPlaceholder.svelte';
  import TableButton from '$lib/components/TableButton.svelte';
  import LibraryFolderAddModal from '$lib/modals/LibraryFolderAddModal.svelte';
  import { Route } from '$lib/route';
  import {
    getLibraryActions,
    getLibraryExclusionPatternActions,
    getLibraryFolderActions,
    getLibraryUiColorActions,
    getLibraryUploadPathActions,
  } from '$lib/services/library.service';
  import { getBytesWithUnit } from '$lib/utils/byte-units';
  import { Code, CommandPaletteDefaultProvider, Container, Heading, Input, modalManager } from '@immich/ui';
  import {
    mdiCameraIris,
    mdiChartPie,
    mdiFilterMinusOutline,
    mdiFolderOutline,
    mdiPaletteOutline,
    mdiPlayCircle,
  } from '@mdi/js';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { LayoutData } from './$types';

  type Props = {
    children?: Snippet;
    data: LayoutData;
  };

  const { children, data }: Props = $props();

  const photosPromise = $derived(data.statisticsPromise.then((stats) => ({ value: stats.photos })));

  const videosPromise = $derived(data.statisticsPromise.then((stats) => ({ value: stats.videos })));

  const usagePromise = $derived(
    data.statisticsPromise.then((stats) => {
      const [value, unit] = getBytesWithUnit(stats.usage);
      return { value, unit };
    }),
  );

  const library = $derived(data.library);

  let uploadPath = $derived(data.library.uploadPath ?? '');

  let uiColor = $state(data.library.uiColor ?? '');

  $effect(() => {
    uiColor = data.library.uiColor ?? '';
  });

  const onLibraryUpdate = () => invalidate('app:library');

  const onLibraryDelete = async ({ id }: { id: string }) => {
    if (id === library.id) {
      await goto(Route.libraries());
    }
  };

  const { Edit, Delete, AddFolder, AddExclusionPattern, Scan } = $derived(getLibraryActions($t, library));
  const { SubmitUploadPath } = $derived(getLibraryUploadPathActions($t, library, uploadPath));
  const { SubmitUiColor } = $derived(getLibraryUiColorActions($t, library, uiColor));
</script>

<OnEvents {onLibraryUpdate} {onLibraryDelete} />

<CommandPaletteDefaultProvider name={$t('library')} actions={[Edit, Delete, AddFolder, AddExclusionPattern, Scan]} />

<AdminPageLayout
  breadcrumbs={[{ title: $t('external_libraries'), href: Route.libraries() }, { title: library.name }]}
  actions={[Scan, Edit, Delete]}
>
  <Container size="large" center>
    <div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <Heading tag="h1" size="large" class="col-span-full my-4">{library.name}</Heading>
      <div class="col-span-full flex flex-col gap-4 lg:flex-row">
        <ServerStatisticsCard icon={mdiCameraIris} title={$t('photos')} valuePromise={photosPromise} />
        <ServerStatisticsCard icon={mdiPlayCircle} title={$t('videos')} valuePromise={videosPromise} />
        <ServerStatisticsCard icon={mdiChartPie} title={$t('usage')} valuePromise={usagePromise} />
      </div>

      <AdminCard icon={mdiFolderOutline} title="Library Upload Path">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          When assets are uploaded or moved to this library, they will be put under this path, applying the storage
          template. Under this path, expect to see a list of years.
        </p>
        <div class="mt-4 flex items-center gap-2">
          <Input id="library-upload-path" bind:value={uploadPath} placeholder="/media/path/to/upload" class="flex-1" />
          <TableButton action={SubmitUploadPath} />
        </div>
      </AdminCard>

      <AdminCard icon={mdiPaletteOutline} title="Library UI Color">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Set a UI color (RGBA / Hex format) associated with this library to visually identify its content on the UI.
        </p>
        <div class="mt-4 flex items-center gap-3">
          <input
            type="color"
            id="library-ui-color-picker"
            value={uiColor && /^#[0-9A-Fa-f]{6}$/.test(uiColor) ? uiColor : '#3b82f6'}
            oninput={(e) => (uiColor = e.currentTarget.value)}
            class="size-10 cursor-pointer rounded border border-gray-300 bg-transparent p-1 dark:border-gray-600"
          />
          <Input id="library-ui-color" bind:value={uiColor} placeholder="#3b82f6" class="w-48" />
          {#if uiColor}
            <button
              type="button"
              onclick={() => (uiColor = '')}
              class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </button>
          {/if}
          <TableButton action={SubmitUiColor} />
        </div>
      </AdminCard>

      <AdminCard icon={mdiFolderOutline} title={$t('folders')} headerAction={AddFolder}>
        {#if library.importPaths.length === 0}
          <EmptyPlaceholder
            src={emptyFoldersUrl}
            text={$t('admin.library_folder_description')}
            fullWidth
            onClick={() => modalManager.show(LibraryFolderAddModal, { library })}
          />
        {:else}
          <table class="w-full">
            <tbody>
              {#each library.importPaths as folder (folder)}
                {@const { Edit, Delete } = getLibraryFolderActions($t, library, folder)}
                <tr class="h-12">
                  <td>
                    <Code>{folder}</Code>
                  </td>
                  <td class="flex justify-end gap-2">
                    <TableButton action={Edit} />
                    <TableButton action={Delete} />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </AdminCard>

      <AdminCard icon={mdiFilterMinusOutline} title={$t('exclusion_pattern')} headerAction={AddExclusionPattern}>
        <table class="w-full">
          <tbody>
            {#each library.exclusionPatterns as exclusionPattern (exclusionPattern)}
              {@const { Edit, Delete } = getLibraryExclusionPatternActions($t, library, exclusionPattern)}
              <tr class="h-12">
                <td>
                  <Code>{exclusionPattern}</Code>
                </td>
                <td class="flex justify-end gap-2">
                  <TableButton action={Edit} />
                  <TableButton action={Delete} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </AdminCard>
    </div>
    {@render children?.()}
  </Container>
</AdminPageLayout>
