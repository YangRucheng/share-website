<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NIcon } from 'naive-ui';
import { Moon, Sun } from '@lucide/vue';

const props = defineProps<{
  dark: boolean;
}>();

const emit = defineEmits<{
  'update:dark': [value: boolean];
}>();

const model = computed({
  get: () => props.dark,
  set: (value: boolean) => emit('update:dark', value),
});
</script>

<template>
  <NButton quaternary circle aria-label="切换深色模式" @click="model = !model">
    <template #icon>
      <NIcon>
        <Moon v-if="model" />
        <Sun v-else />
      </NIcon>
    </template>
  </NButton>
</template>
