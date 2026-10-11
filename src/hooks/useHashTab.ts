import { useCallback, useEffect, useState } from 'react';
import { isTabId } from '../constants/navigation';
import type { TabId } from '../constants/navigation';

function readTab(): TabId {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return isTabId(hash) ? hash : 'home';
}

/**
 * Tab navigation kept in the URL hash (#home, #afford, #money), so links and the
 * back button work. `navigated` is true after the first in-app navigation, which
 * pages use to move focus to their heading.
 */
export function useHashTab(): { tab: TabId; navigated: boolean; goTo: (tab: TabId) => void } {
  const [tab, setTab] = useState<TabId>(readTab);
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTo = useCallback((next: TabId) => {
    setTab(next);
    setNavigated(true);
    try {
      window.history.replaceState(null, '', `#${next}`);
    } catch {
      // Some sandboxed frames block history; navigation still works without it.
    }
    window.scrollTo({ top: 0 });
  }, []);

  return { tab, navigated, goTo };
}
