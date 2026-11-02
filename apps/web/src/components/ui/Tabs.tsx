import {
  createContext,
  useContext,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';

interface TabsContextValue {
  selectedTab: string;
  onSelectTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be rendered inside <Tabs>');
  }
  return ctx;
}

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, children, className }: TabsProps): ReactNode {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ selectedTab: value, onSelectTab: onChange, baseId }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function TabList({ children, className, 'aria-label': ariaLabel }: TabListProps): ReactNode {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!listRef.current) return;
    const tabs = Array.from(
      listRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    let nextIndex: number;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = currentIndex === -1 || currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      nextTab.focus();
      nextTab.click();
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-pill bg-parchment border border-ash',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabTrigger({ value, children, className, disabled }: TabTriggerProps): ReactNode {
  const { selectedTab, onSelectTab, baseId } = useTabsContext();
  const isSelected = selectedTab === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  return (
    <button
      id={tabId}
      role="tab"
      type="button"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => onSelectTab(value)}
      className={cn(
        'rounded-pill px-4 py-1.5 text-xs font-medium transition cursor-pointer focus-visible:outline-2 focus-visible:outline-ink',
        isSelected
          ? 'bg-ink text-white'
          : 'bg-transparent text-graphite hover:text-ink hover:bg-ash/30',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps): ReactNode {
  const { selectedTab, baseId } = useTabsContext();
  const isSelected = selectedTab === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isSelected) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
