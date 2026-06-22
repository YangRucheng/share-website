<script setup lang="ts">
import { computed } from 'vue';
import { NEmpty, NIcon, NTag } from 'naive-ui';
import { BadgeCheck, Scale } from '@lucide/vue';
import type { GitHubLicenseFile, GitHubRepository } from '../types/github';

const props = defineProps<{
  repository: GitHubRepository;
  licenseFile: GitHubLicenseFile | null;
}>();

const license = computed(() => props.licenseFile?.license || props.repository.license);
const licenseName = computed(() => license.value?.name || '未声明许可证');
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <NIcon :component="Scale" />
      <span>许可证</span>
    </div>

    <div v-if="license" class="license-content">
      <NTag type="success" round>
        <template #icon>
          <NIcon :component="BadgeCheck" />
        </template>
        {{ license.spdx_id || license.key }}
      </NTag>
      <strong>{{ licenseName }}</strong>
    </div>

    <NEmpty v-else size="small" description="该仓库未提供许可证信息" />
  </section>
</template>
