<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue';
import {
  NAlert,
  NButton,
  NCheckbox,
  NConfigProvider,
  NEmpty,
  NFormItem,
  NGlobalStyle,
  NIcon,
  NInput,
  NMessageProvider,
  NModal,
  NSelect,
  NSpin,
  darkTheme,
  lightTheme,
  useOsTheme,
} from 'naive-ui';
import { ArrowLeft, KeyRound, Save, Settings, Trash2 } from '@lucide/vue';
import { loadConfig } from './services/config';
import { getDownloadProxyOptions } from './services/downloadProxy';
import { getRepositoryKey, loadReleasePage, loadRepositoryBundle, loadRepositorySummary } from './services/githubClient';
import {
  clearGitHubToken,
  getDownloadPreferences,
  getGitHubToken,
  setDownloadPreferences,
  setGitHubToken,
  type DownloadPreferences,
} from './services/localPreferences';
import type { AppConfig, ConfigRepository, RepositoryState } from './types/github';
import ProjectList from './components/ProjectList.vue';
import RepositoryCard from './components/RepositoryCard.vue';
import ThemeToggle from './components/ThemeToggle.vue';

const osTheme = useOsTheme();
const config = ref<AppConfig | null>(null);
const states = ref<RepositoryState[]>([]);
const bootError = ref<string | null>(null);
const loadingConfig = ref(true);
const dark = ref(osTheme.value === 'dark');
const settingsOpen = ref(false);
const tokenDraft = ref(getGitHubToken());
const storedToken = ref(getGitHubToken());
const initialPreferences = getDownloadPreferences();
const preferencesDraft = ref<DownloadPreferences>({ ...initialPreferences });
const storedPreferences = ref<DownloadPreferences>({ ...initialPreferences });
const selectedKey = ref<string | null>(null);
const downloadProxyOptions = getDownloadProxyOptions();

const theme = computed(() => dark.value ? darkTheme : lightTheme);
const hasToken = computed(() => Boolean(storedToken.value));
const selectedState = computed(() => states.value.find((state) => state.key === selectedKey.value) || null);

const makeState = (repo: ConfigRepository): RepositoryState => ({
  key: getRepositoryKey(repo),
  config: repo,
  loading: false,
  detailLoading: false,
  releaseLoading: false,
  repository: null,
  data: null,
  error: null,
  detailError: null,
});

const setState = (key: string, patch: Partial<RepositoryState>) => {
  states.value = states.value.map((state) => state.key === key ? { ...state, ...patch } : state);
};

const loadRepositorySummaryState = async (repo: ConfigRepository) => {
  const key = getRepositoryKey(repo);
  setState(key, { loading: true, error: null });

  try {
    const result = await loadRepositorySummary(repo);
    setState(key, { loading: false, repository: result.data, error: null });
  } catch (error) {
    setState(key, {
      loading: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const loadSummaries = async () => {
  if (!config.value) {
    return;
  }

  await Promise.all(config.value.repositories.map(loadRepositorySummaryState));
};

const loadRepositoryDetails = async (repo: ConfigRepository, page = 1) => {
  const key = getRepositoryKey(repo);
  const state = states.value.find((item) => item.key === key);
  const firstLoad = !state?.data;

  setState(key, {
    detailLoading: firstLoad,
    releaseLoading: !firstLoad,
    detailError: null,
  });

  try {
    if (firstLoad) {
      const data = await loadRepositoryBundle(repo, page);
      setState(key, {
        detailLoading: false,
        releaseLoading: false,
        repository: data.repository,
        data,
        detailError: null,
      });
      return;
    }

    const result = await loadReleasePage(repo, page);
    setState(key, {
      releaseLoading: false,
      data: state.data
        ? {
          ...state.data,
          releases: result.data,
          releasePage: result.page,
          hasNextReleasePage: result.hasNextPage,
          source: result.source,
        }
        : null,
      detailError: null,
    });
  } catch (error) {
    setState(key, {
      detailLoading: false,
      releaseLoading: false,
      detailError: error instanceof Error ? error.message : String(error),
    });
  }
};

const openSettings = () => {
  tokenDraft.value = storedToken.value;
  preferencesDraft.value = { ...storedPreferences.value };
  settingsOpen.value = true;
};

const samePreferences = (first: DownloadPreferences, second: DownloadPreferences) => (
  first.ignoreEmptyReleases === second.ignoreEmptyReleases
  && first.ignoreTextMarkdownAssets === second.ignoreTextMarkdownAssets
  && first.downloadProxy === second.downloadProxy
);

const selectProject = (key: string) => {
  selectedKey.value = key;
  window.scrollTo({ top: 0 });

  const state = states.value.find((item) => item.key === key);
  if (state && !state.data && !state.detailLoading) {
    void loadRepositoryDetails(state.config, 1);
  }
};

const backToProjects = () => {
  selectedKey.value = null;
  window.scrollTo({ top: 0 });
};

const changeReleasePage = (page: number) => {
  if (selectedState.value) {
    void loadRepositoryDetails(selectedState.value.config, page);
  }
};

const saveSettings = async () => {
  const nextToken = tokenDraft.value.trim();
  const nextPreferences = { ...preferencesDraft.value };
  const preferencesChanged = !samePreferences(nextPreferences, storedPreferences.value);

  setGitHubToken(nextToken);
  setDownloadPreferences(nextPreferences);
  storedToken.value = getGitHubToken();
  storedPreferences.value = nextPreferences;
  settingsOpen.value = false;

  if (preferencesChanged) {
    window.scrollTo({ top: 0 });
  }
};

const removeToken = async () => {
  if (!storedToken.value && !tokenDraft.value) {
    settingsOpen.value = false;
    return;
  }

  clearGitHubToken();
  tokenDraft.value = '';
  storedToken.value = '';
  settingsOpen.value = false;
};

const boot = async () => {
  loadingConfig.value = true;
  bootError.value = null;

  try {
    config.value = await loadConfig();
    states.value = config.value.repositories.map(makeState);
    selectedKey.value = null;
    await loadSummaries();
  } catch (error) {
    bootError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loadingConfig.value = false;
  }
};

onMounted(() => {
  void boot();
});

watchEffect(() => {
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light';
});
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NGlobalStyle />
      <main class="app-shell">
        <header class="app-header">
          <div class="title-block">
            <div class="app-mark">
              <img src="/logo.png" alt="" />
            </div>
            <div>
              <h1>{{ config?.title || 'Misaka 文件下载站' }}</h1>
            </div>
          </div>

          <div class="header-actions">
            <ThemeToggle v-model:dark="dark" />
            <button
              class="icon-button"
              :class="{ active: hasToken }"
              type="button"
              aria-label="设置"
              @click="openSettings"
            >
              <NIcon :component="Settings" />
            </button>
          </div>
        </header>

        <NAlert v-if="bootError" type="error" title="配置加载失败">
          {{ bootError }}
        </NAlert>

        <div v-else-if="loadingConfig" class="center-state">
          <NSpin size="large" />
        </div>

        <section v-else-if="states.length && selectedState" class="detail-page">
          <div class="detail-toolbar">
            <NButton secondary @click="backToProjects">
              返回项目
              <template #icon>
                <NIcon :component="ArrowLeft" />
              </template>
            </NButton>
          </div>
          <RepositoryCard
            :state="selectedState"
            :preferences="storedPreferences"
            @release-page-change="changeReleasePage"
          />
        </section>

        <section v-else-if="states.length" class="repo-list">
          <ProjectList :states="states" @select="selectProject" />
        </section>

        <NEmpty v-else description="没有配置仓库" />
      </main>

      <NModal v-model:show="settingsOpen" preset="card" title="设置" class="settings-modal">
        <div class="settings-form">
          <section class="settings-section">
            <div class="settings-section-head">
              <h2>GitHub API</h2>
              <p>访问令牌只保存在当前浏览器本地。</p>
            </div>

            <NFormItem label="个人访问令牌" class="settings-field">
              <NInput
                v-model:value="tokenDraft"
                type="password"
                show-password-on="click"
                clearable
                placeholder="github_pat_..."
              >
                <template #prefix>
                  <NIcon :component="KeyRound" />
                </template>
              </NInput>
            </NFormItem>
          </section>

          <section class="settings-section">
            <div class="settings-section-head">
              <h2>下载显示</h2>
              <p>控制 Release 文件列表和下载链接的处理方式。</p>
            </div>

            <NFormItem label="GitHub 下载链接代理" class="settings-field">
              <NSelect v-model:value="preferencesDraft.downloadProxy" :options="downloadProxyOptions" />
            </NFormItem>

            <div class="settings-checks">
              <NCheckbox v-model:checked="preferencesDraft.ignoreEmptyReleases">
                忽略没有产物的版本
              </NCheckbox>
              <NCheckbox v-model:checked="preferencesDraft.ignoreTextMarkdownAssets">
                忽略 .txt / .md 校验文件
              </NCheckbox>
            </div>
          </section>

          <div class="settings-actions">
            <NButton secondary :disabled="!storedToken && !tokenDraft" @click="removeToken">
              清除
              <template #icon>
                <NIcon :component="Trash2" />
              </template>
            </NButton>
            <NButton type="primary" @click="saveSettings">
              保存
              <template #icon>
                <NIcon :component="Save" />
              </template>
            </NButton>
          </div>
        </div>
      </NModal>
    </NMessageProvider>
  </NConfigProvider>
</template>
