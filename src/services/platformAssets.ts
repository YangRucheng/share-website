import type { GitHubAsset } from '../types/github';
import type { PlatformId } from './platformDetect';

type InstallerPlatform = Exclude<PlatformId, 'unknown'>;

// Suffix order becomes meaningful only if format/arch ranking is added later.
const INSTALLER_SUFFIXES: Record<InstallerPlatform, readonly string[]> = {
  windows: ['.exe', '.msi', '.msix'],
  macos: ['.dmg', '.pkg'],
  linux: ['.appimage', '.deb', '.rpm'],
  android: ['.apk'],
  ios: ['.ipa'],
};

export const isRecommendedAssetName = (name: string, platform: PlatformId): boolean => {
  if (platform === 'unknown') {
    return false;
  }

  const lower = name.toLowerCase();
  return INSTALLER_SUFFIXES[platform].some((suffix) => lower.endsWith(suffix));
};

export const isRecommendedAsset = (asset: GitHubAsset, platform: PlatformId): boolean => (
  isRecommendedAssetName(asset.name, platform)
);

// Stable: recommended first, alphabetical within each group.
// When platform is 'unknown', every asset scores 0 -> pure alphabetical (no behavior change).
export const sortAssetsByRecommendation = (assets: GitHubAsset[], platform: PlatformId): GitHubAsset[] => {
  return [...assets].sort((first, second) => {
    const firstRecommended = isRecommendedAsset(first, platform) ? 1 : 0;
    const secondRecommended = isRecommendedAsset(second, platform) ? 1 : 0;
    if (firstRecommended !== secondRecommended) {
      return secondRecommended - firstRecommended;
    }
    return first.name.localeCompare(second.name);
  });
};

// ---- Arch preference: clean extension point (not wired in this change) ----
export type ArchId = 'x64' | 'arm64' | 'universal' | 'unknown';

export const detectArchFromString = (text: string): ArchId => {
  const lower = text.toLowerCase();
  if (lower.includes('arm64') || lower.includes('aarch64')) {
    return 'arm64';
  }
  if (lower.includes('x64') || lower.includes('x86_64') || lower.includes('amd64')) {
    return 'x64';
  }
  if (lower.includes('universal')) {
    return 'universal';
  }
  return 'unknown';
};
// Future: in the sort comparator, add a secondary key after the recommended flag:
//   const archRank = (a: GitHubAsset) => platform === 'macos' ? rank(detectArchFromString(a.name)) : 0;
//   ...then `archRank(b) - archRank(a)` before the name localeCompare.
