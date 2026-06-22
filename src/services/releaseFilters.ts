import type { GitHubRelease } from '../types/github';
import type { DownloadPreferences } from './localPreferences';
import { countVisibleAssets } from './assetFilters';

export const filterReleases = (releases: GitHubRelease[], preferences: DownloadPreferences) => {
  return releases.filter((release) => {
    if (
      preferences.ignoreEmptyReleases
      && countVisibleAssets(release.assets, preferences.ignoreTextMarkdownAssets) === 0
    ) {
      return false;
    }

    return true;
  });
};
