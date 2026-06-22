<script setup lang="ts">
import { computed } from 'vue';
import { NEmpty, NIcon } from 'naive-ui';
import { BookOpen } from '@lucide/vue';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { GitHubRepository } from '../types/github';

const props = defineProps<{
  markdown: string | null;
  repository: GitHubRepository;
  branch?: string;
}>();

const EXTERNAL_LINK = /^(?:https?:|mailto:|tel:)/i;
const HAS_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;

const normalizeRelativePath = (href: string) => {
  const [pathAndQuery, hash = ''] = href.split('#');
  const [path, query = ''] = pathAndQuery.split('?');
  const segments: string[] = [];

  path.split('/').forEach((part) => {
    if (!part || part === '.') {
      return;
    }

    if (part === '..') {
      segments.pop();
      return;
    }

    segments.push(part);
  });

  return [
    segments.join('/'),
    query ? `?${query}` : '',
    hash ? `#${hash}` : '',
  ].join('');
};

const resolveReadmeLink = (href: string) => {
  const trimmed = href.trim();
  const fullName = props.repository.full_name;
  const repositoryUrl = `https://github.com/${fullName}`;
  const branch = props.branch || props.repository.default_branch;

  if (!trimmed) {
    return null;
  }

  if (EXTERNAL_LINK.test(trimmed)) {
    return trimmed;
  }

  if (HAS_PROTOCOL.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('#')) {
    return `${repositoryUrl}${trimmed}`;
  }

  if (trimmed.startsWith(`/${fullName}/`)) {
    return `https://github.com${trimmed}`;
  }

  const path = normalizeRelativePath(trimmed.replace(/^\/+/, ''));
  return path ? `${repositoryUrl}/blob/${branch}/${path}` : repositoryUrl;
};

const rewriteLinks = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href');
    const nextHref = href ? resolveReadmeLink(href) : null;

    if (!nextHref) {
      link.removeAttribute('href');
      link.classList.add('markdown-disabled-link');
      return;
    }

    link.setAttribute('href', nextHref);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer noopener');
  });

  return template.innerHTML;
};

const rendered = computed(() => {
  if (!props.markdown) {
    return '';
  }

  const html = marked.parse(props.markdown, { async: false }) as string;
  return rewriteLinks(DOMPurify.sanitize(html));
});
</script>

<template>
  <section class="panel readme-panel">
    <div class="panel-title">
      <NIcon :component="BookOpen" />
      <span>自述文件</span>
    </div>

    <article v-if="rendered" class="markdown-body" v-html="rendered" />
    <NEmpty v-else size="small" description="未能读取 README" />
  </section>
</template>
