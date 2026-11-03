import 'vitest-axe/extend-expect';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  Button,
  Card,
  Dialog,
  InnerCard,
  Input,
  Pill,
  Select,
  Spinner,
  Switch,
  TabContent,
  TabList,
  Tabs,
  TabTrigger,
  Tag,
  ToastRegion,
  VisuallyHidden,
} from './index';
import { UiShowcasePage } from '../../pages/ui/UiShowcasePage';

describe('UI Kit Primitives', () => {
  describe('Button', () => {
    it('renders primary lime button', () => {
      render(<Button variant="primary">Click Me</Button>);
      const button = screen.getByRole('button', { name: 'Click Me' });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain('bg-lime');
      expect(button.className).toContain('rounded-none');
    });

    it('renders ghost and link variants', () => {
      render(
        <div>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>,
      );
      expect(screen.getByRole('button', { name: 'Ghost' }).className).toContain('bg-transparent');
      expect(screen.getByRole('button', { name: 'Link' }).className).toContain('underline');
    });

    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button', { name: 'Disabled' });
      expect(button).toBeDisabled();
    });
  });

  describe('Card & InnerCard', () => {
    it('renders card tones', () => {
      const { rerender } = render(<Card tone="white">White</Card>);
      expect(screen.getByText('White').className).toContain('bg-white');

      rerender(<Card tone="parchment">Parchment</Card>);
      expect(screen.getByText('Parchment').className).toContain('bg-parchment');

      rerender(<Card tone="dark">Dark</Card>);
      expect(screen.getByText('Dark').className).toContain('bg-charcoal');

      rerender(<Card tone="lime">Lime</Card>);
      expect(screen.getByText('Lime').className).toContain('bg-lime');
    });

    it('renders inner card', () => {
      render(<InnerCard tone="parchment">Inner</InnerCard>);
      expect(screen.getByText('Inner').className).toContain('rounded-inner');
    });
  });

  describe('Pill and Tag', () => {
    it('renders pills and tag aliases', () => {
      render(
        <div>
          <Pill tone="sim">Simulated</Pill>
          <Tag tone="outline">Outline</Tag>
        </div>,
      );
      expect(screen.getByText('Simulated').className).toContain('bg-sim-banner');
      expect(screen.getByText('Outline').className).toContain('border-ash');
    });
  });

  describe('Tabs with keyboard navigation (roving tabindex)', () => {
    function ControlledTabs() {
      const [tab, setTab] = useState('one');
      return (
        <Tabs value={tab} onChange={setTab}>
          <TabList aria-label="Test Tabs">
            <TabTrigger value="one">Tab One</TabTrigger>
            <TabTrigger value="two">Tab Two</TabTrigger>
            <TabTrigger value="three">Tab Three</TabTrigger>
          </TabList>
          <TabContent value="one">Panel One</TabContent>
          <TabContent value="two">Panel Two</TabContent>
          <TabContent value="three">Panel Three</TabContent>
        </Tabs>
      );
    }

    it('navigates with arrow keys and updates active panel', () => {
      render(<ControlledTabs />);
      const tabOne = screen.getByRole('tab', { name: 'Tab One' });
      const tabTwo = screen.getByRole('tab', { name: 'Tab Two' });
      const tabThree = screen.getByRole('tab', { name: 'Tab Three' });

      expect(tabOne).toHaveAttribute('aria-selected', 'true');
      expect(tabOne).toHaveAttribute('tabIndex', '0');
      expect(tabTwo).toHaveAttribute('aria-selected', 'false');
      expect(tabTwo).toHaveAttribute('tabIndex', '-1');
      expect(screen.getByText('Panel One')).toBeInTheDocument();

      // Right arrow moves to Tab Two
      tabOne.focus();
      fireEvent.keyDown(tabOne, { key: 'ArrowRight' });
      expect(tabTwo).toHaveFocus();
      expect(tabTwo).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Panel Two')).toBeInTheDocument();

      // Right arrow moves to Tab Three
      fireEvent.keyDown(tabTwo, { key: 'ArrowRight' });
      expect(tabThree).toHaveFocus();
      expect(tabThree).toHaveAttribute('aria-selected', 'true');

      // Left arrow moves back to Tab Two
      fireEvent.keyDown(tabThree, { key: 'ArrowLeft' });
      expect(tabTwo).toHaveFocus();
      expect(tabTwo).toHaveAttribute('aria-selected', 'true');

      // Home key moves to first tab
      fireEvent.keyDown(tabTwo, { key: 'Home' });
      expect(tabOne).toHaveFocus();
      expect(tabOne).toHaveAttribute('aria-selected', 'true');

      // End key moves to last tab
      fireEvent.keyDown(tabOne, { key: 'End' });
      expect(tabThree).toHaveFocus();
      expect(tabThree).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Switch', () => {
    function ControlledSwitch() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          checked={checked}
          onChange={setChecked}
          label="Test Switch"
          description="Description test"
        />
      );
    }

    it('toggles switch state on click', () => {
      render(<ControlledSwitch />);
      const switchBtn = screen.getByRole('switch', { name: /Test Switch/i });
      expect(switchBtn).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchBtn);
      expect(switchBtn).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(switchBtn);
      expect(switchBtn).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Dialog with focus return & Esc close', () => {
    function DialogHarness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open Dialog Trigger
          </button>
          <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Modal Title"
            description="Modal Description"
          >
            <p>Modal Body Content</p>
          </Dialog>
        </div>
      );
    }

    it('opens dialog, closes on Escape, and returns focus to trigger', () => {
      render(<DialogHarness />);
      const trigger = screen.getByRole('button', { name: 'Open Dialog Trigger' });
      trigger.focus();

      // Click trigger to open
      fireEvent.click(trigger);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Modal Title')).toBeInTheDocument();

      // Press Escape to close
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(dialog).not.toHaveAttribute('open');

      // Focus returns to the trigger
      expect(trigger).toHaveFocus();
    });
  });

  describe('Form inputs and helper primitives', () => {
    it('renders input with label and helper text', () => {
      render(<Input id="test-input" label="Origin" helperText="Help info" />);
      expect(screen.getByLabelText('Origin')).toBeInTheDocument();
      expect(screen.getByText('Help info')).toBeInTheDocument();
    });

    it('renders select with options', () => {
      render(
        <Select id="test-select" label="Choose option">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );
      expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveValue('a');
    });

    it('renders toast region', () => {
      const handleDismiss = () => {};
      render(
        <ToastRegion
          toasts={[{ id: '1', title: 'Info', message: 'Hello world' }]}
          onDismiss={handleDismiss}
        />,
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders spinner and visually hidden elements', () => {
      render(
        <div>
          <Spinner label="Loading items" />
          <VisuallyHidden>Hidden screen-reader text</VisuallyHidden>
        </div>,
      );
      expect(screen.getByLabelText('Loading items')).toBeInTheDocument();
      expect(screen.getByText('Hidden screen-reader text')).toHaveClass('sr-only');
    });
  });

  describe('Accessibility (axe)', () => {
    it('UiShowcasePage has no accessibility violations', async () => {
      const { container } = render(<UiShowcasePage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
