<script setup lang="ts">
import { computed } from 'vue';
import {
  NAlert,
  NCard,
  NIcon,
  NSkeleton,
  NTag,
} from 'naive-ui';
import { Download, PackageCheck } from '@lucide/vue';
import { countVisibleAssets, getVisibleAssets } from '../services/assetFilters';
import { filterReleases } from '../services/releaseFilters';
import type { DownloadPreferences } from '../services/localPreferences';
import type { RepositoryState } from '../types/github';
import LicensePanel from './LicensePanel.vue';
import ReadmePanel from './ReadmePanel.vue';
import ReleaseList from './ReleaseList.vue';

const props = defineProps<{
  state: RepositoryState;
  preferences: DownloadPreferences;
}>();

const emit = defineEmits<{
  'release-page-change': [page: number];
}>();

const FALLBACK_LOGO = 'https://cdn.micono.eu.org/icon/logo.png';

const repository = computed(() => props.state.data?.repository || props.state.repository);
const releases = computed(() => filterReleases(props.state.data?.releases || [], props.preferences));
const hiddenReleaseCount = computed(() => (props.state.data?.releases.length || 0) - releases.value.length);
const assetCount = computed(() => (
  releases.value.reduce((total, release) => (
    total + countVisibleAssets(release.assets, props.preferences.ignoreTextMarkdownAssets)
  ), 0)
));
const downloadCount = computed(() => (
  releases.value.reduce((total, release) => (
    total + getVisibleAssets(release.assets, props.preferences.ignoreTextMarkdownAssets)
      .reduce((releaseTotal, asset) => releaseTotal + asset.download_count, 0)
  ), 0)
));
const avatarUrl = computed(() => repository.value?.owner.avatar_url || FALLBACK_LOGO);

const formatNumber = (value: number) => value.toLocaleString('zh-CN');

const useFallbackLogo = (event: Event) => {
  const image = event.target as HTMLImageElement | null;
  if (image && image.src !== FALLBACK_LOGO) {
    image.src = FALLBACK_LOGO;
  }
};
</script>

<template>
  <NCard class="repo-card" :bordered="false">
    <template #header>
      <div class="repo-heading">
        <div>
          <div class="repo-name-line">
            <span class="repo-icon">
              <img :src="avatarUrl" alt="" loading="lazy" @error="useFallbackLogo" />
            </span>
            <span>{{ state.config.name || repository?.full_name || state.key }}</span>
            <NTag v-if="state.loading && state.data" size="small" type="info">更新中</NTag>
          </div>
        </div>
      </div>
    </template>

    <div v-if="state.detailLoading && !state.data" class="loading-stack">
      <NSkeleton text :repeat="2" />
      <NSkeleton height="120px" />
      <NSkeleton height="220px" />
    </div>

    <NAlert v-else-if="state.detailError || state.error" type="error" :title="state.key">
      {{ state.detailError || state.error }}
    </NAlert>

    <div v-else-if="state.data" class="repo-content">
      <div class="download-summary">
        <div class="download-summary-item">
          <span class="download-summary-icon">
            <NIcon :component="Download" />
          </span>
          <span>
            <span class="download-summary-label">本页文件</span>
            <strong>{{ formatNumber(assetCount) }}</strong>
          </span>
        </div>
        <div class="download-summary-item">
          <span class="download-summary-icon">
            <NIcon :component="PackageCheck" />
          </span>
          <span>
            <span class="download-summary-label">本页版本</span>
            <strong>{{ formatNumber(releases.length) }}</strong>
          </span>
        </div>
        <div class="download-summary-item">
          <span class="download-summary-icon">
            <NIcon :component="Download" />
          </span>
          <span>
            <span class="download-summary-label">本页下载</span>
            <strong>{{ formatNumber(downloadCount) }}</strong>
          </span>
        </div>
      </div>

      <div class="repo-panels">
        <ReleaseList
          :releases="releases"
          :hidden-release-count="hiddenReleaseCount"
          :latest-release-id="state.data.latestReleaseId"
          :page="state.data.releasePage"
          :has-next-page="state.data.hasNextReleasePage"
          :loading="state.releaseLoading"
          :preferences="preferences"
          @page-change="emit('release-page-change', $event)"
        />
        <LicensePanel :repository="state.data.repository" :license-file="state.data.licenseFile" />
        <ReadmePanel
          :markdown="state.data.readmeMarkdown"
          :repository="state.data.repository"
          :branch="state.config.branch"
        />
      </div>
    </div>
  </NCard>
</template>
