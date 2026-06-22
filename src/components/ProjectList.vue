<script setup lang="ts">
import { NAlert, NIcon, NSkeleton, NTag } from 'naive-ui';
import { ChevronRight, FolderGit2 } from '@lucide/vue';
import type { RepositoryState } from '../types/github';

defineProps<{
  states: RepositoryState[];
}>();

const FALLBACK_LOGO = 'https://cdn.micono.eu.org/icon/logo.png';

const emit = defineEmits<{
  select: [key: string];
}>();

const getAvatarUrl = (state: RepositoryState) => state.repository?.owner.avatar_url || FALLBACK_LOGO;

const useFallbackLogo = (event: Event) => {
  const image = event.target as HTMLImageElement | null;
  if (image && image.src !== FALLBACK_LOGO) {
    image.src = FALLBACK_LOGO;
  }
};
</script>

<template>
  <section class="project-list">
    <button
      v-for="state in states"
      :key="state.key"
      class="project-card"
      type="button"
      @click="emit('select', state.key)"
    >
      <span class="project-icon">
        <img :src="getAvatarUrl(state)" alt="" loading="lazy" @error="useFallbackLogo" />
      </span>

      <span class="project-main">
        <span class="project-title-line">
          <strong>{{ state.config.name || state.key }}</strong>
          <NTag v-if="state.loading" size="small" type="info">更新中</NTag>
        </span>

        <span v-if="state.repository" class="project-stats">
          <span>
            <NIcon :component="FolderGit2" />
            {{ state.repository.full_name }}
          </span>
        </span>

        <span v-else-if="state.loading" class="project-skeleton">
          <NSkeleton text width="180px" />
        </span>

        <NAlert v-else-if="state.error" type="error" :bordered="false" class="project-error">
          {{ state.error }}
        </NAlert>
      </span>

      <span class="project-enter">
        <NIcon :component="ChevronRight" />
      </span>
    </button>
  </section>
</template>
