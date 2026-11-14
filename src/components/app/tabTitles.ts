import { getTitleFromNavigationRegistry } from '../../config/navigationRegistry';

export function getTitleForTab(tab: string, selectedNCNumber?: string): string {
  return getTitleFromNavigationRegistry(tab, selectedNCNumber);
}
