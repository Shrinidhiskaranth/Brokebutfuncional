import type { IconName } from '../ui/Icon';

export type TabId = 'home' | 'afford' | 'money';

export const TABS: readonly { id: TabId; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Today', icon: 'home' },
  { id: 'afford', label: 'Can I afford it?', icon: 'afford' },
  { id: 'money', label: 'My money', icon: 'wallet' },
];

export const isTabId = (value: string): value is TabId => TABS.some((t) => t.id === value);
