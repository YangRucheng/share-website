<script setup lang="ts">
import { computed } from 'vue';
import { NCollapse, NCollapseItem, NEmpty, NIcon, NPagination, NSpin, NTag, NTime } from 'naive-ui';
import { GitBranch, PackageOpen, Tags } from '@lucide/vue';
import { countVisibleAssets } from '../services/assetFilters';
import type { DownloadPreferences } from '../services/localPreferences';
import type { GitHubRelease } from '../types/github';
import AssetList from './AssetList.vue';

const props = defineProps<{
  releases: GitHubRelease[];
  hiddenReleaseCount: number;
  latestReleaseId: number | null;
  page: number;
  hasNextPage: boolean;
  loading: boolean;
  preferences: DownloadPreferences;
}>();

const emit = defineEmits<{
  'page-change': [page: number];
}>();

const pageCount = computed(() => props.hasNextPage ? props.page + 1 : Math.max(props.page, 1));
const paginationPage = computed({
  get: () => props.page,
  set: (value: number) => emit('page-change', value),
});

const visibleAssetCount = (release: GitHubRelease) => (
  countVisibleAssets(release.assets, props.preferences.ignoreTextMarkdownAssets)
);
</script>

<template>
  <section class="panel release-panel">
    <div class="release-panel-heading">
      <div class="panel-title">
        <NIcon :component="Tags" />
        <span>Releases</span>
      </div>
      <div class="release-heading-meta">
        <NTag round size="small">{{ releases.length }}</NTag>
        <NTag v-if="hiddenReleaseCount > 0" round size="small" type="warning">
          已隐藏 {{ hiddenReleaseCount }}
        </NTag>
      </div>
    </div>

    <div v-if="loading" class="release-loading">
      <NSpin size="small" />
    </div>

    <NCollapse v-if="releases.length && !loading" accordion>
      <NCollapseItem v-for="release in releases" :key="release.id" :name="String(release.id)">
        <template #header>
          <div class="release-header">
            <span class="release-name">{{ release.name || release.tag_name }}</span>
            <NTag v-if="release.id === latestReleaseId" size="small" type="success">Latest</NTag>
            <NTag v-if="release.prerelease" size="small" type="warning">Pre-release</NTag>
            <NTag v-if="release.draft" size="small" type="error">Draft</NTag>
          </div>
        </template>
        <template #header-extra>
          <span class="release-date">
            <NTime v-if="release.published_at" :time="new Date(release.published_at)" type="date" />
          </span>
        </template>

        <div class="release-meta">
          <NIcon :component="GitBranch" />
          <span>{{ release.tag_name }}</span>
        </div>

        <AssetList v-if="visibleAssetCount(release)" :assets="release.assets" :preferences="preferences" />
        <NEmpty v-else size="small" description="该版本没有可下载文件">
          <template #icon>
            <NIcon :component="PackageOpen" />
          </template>
        </NEmpty>
      </NCollapseItem>
    </NCollapse>

    <div v-if="page > 1 || hasNextPage" class="release-pagination">
      <NPagination v-model:page="paginationPage" :page-count="pageCount" :page-slot="6" :disabled="loading" />
    </div>

    <NEmpty v-if="!releases.length && !loading" description="没有可下载文件" />
  </section>
</template>
