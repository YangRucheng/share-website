<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, NTag } from 'naive-ui';
import { Download, FileArchive, HardDrive } from '@lucide/vue';
import { getVisibleAssets } from '../services/assetFilters';
import { proxifyDownloadUrl } from '../services/downloadProxy';
import type { DownloadPreferences } from '../services/localPreferences';
import type { GitHubAsset } from '../types/github';

const props = defineProps<{
  assets: GitHubAsset[];
  preferences: DownloadPreferences;
}>();

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** index;
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const sortedAssets = computed(() => (
  getVisibleAssets(props.assets, props.preferences.ignoreTextMarkdownAssets)
    .sort((a, b) => a.name.localeCompare(b.name))
));

const getDownloadUrl = (url: string) => proxifyDownloadUrl(url, props.preferences.downloadProxy);
</script>

<template>
  <div class="asset-list">
    <a
      v-for="asset in sortedAssets"
      :key="asset.id"
      class="asset-item"
      :href="getDownloadUrl(asset.browser_download_url)"
      target="_blank"
      rel="noreferrer"
    >
      <span class="asset-icon">
        <NIcon :component="FileArchive" />
      </span>
      <span class="asset-main">
        <span class="asset-name">{{ asset.name }}</span>
        <span class="asset-meta">
          <NIcon :component="HardDrive" />
          {{ formatBytes(asset.size) }}
          <span>{{ asset.download_count.toLocaleString() }} 次下载</span>
        </span>
      </span>
      <NTag v-if="asset.state !== 'uploaded'" size="small" type="warning">
        {{ asset.state }}
      </NTag>
      <span class="asset-download" aria-hidden="true">
        <NIcon :component="Download" />
        <span>下载</span>
      </span>
    </a>
  </div>
</template>
