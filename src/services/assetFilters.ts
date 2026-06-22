import type { GitHubAsset } from '../types/github';

const TEXT_OR_MARKDOWN_FILE = /\.(?:txt|md)$/i;

export const isTextOrMarkdownAsset = (asset: GitHubAsset) => TEXT_OR_MARKDOWN_FILE.test(asset.name);

export const getVisibleAssets = (assets: GitHubAsset[], ignoreTextMarkdownAssets = true) => {
  return ignoreTextMarkdownAssets ? assets.filter((asset) => !isTextOrMarkdownAsset(asset)) : assets;
};

export const countVisibleAssets = (assets: GitHubAsset[], ignoreTextMarkdownAssets = true) => {
  return getVisibleAssets(assets, ignoreTextMarkdownAssets).length;
};
