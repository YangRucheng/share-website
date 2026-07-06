import type { GitHubAsset } from '../types/github';

const TEXT_OR_MARKDOWN_FILE = /\.(?:txt|md)$/i;
const SHA256_FILE = /\.sha256$/i;

export const isTextOrMarkdownAsset = (asset: GitHubAsset) => TEXT_OR_MARKDOWN_FILE.test(asset.name);

export const isSha256Asset = (asset: GitHubAsset) => SHA256_FILE.test(asset.name);

export const getVisibleAssets = (assets: GitHubAsset[], ignoreTextMarkdownAssets = true) => {
  return assets.filter((asset) => !isSha256Asset(asset) && (!ignoreTextMarkdownAssets || !isTextOrMarkdownAsset(asset)));
};

export const countVisibleAssets = (assets: GitHubAsset[], ignoreTextMarkdownAssets = true) => {
  return getVisibleAssets(assets, ignoreTextMarkdownAssets).length;
};
