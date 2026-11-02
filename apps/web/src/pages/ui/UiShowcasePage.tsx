import { useState, type ReactNode } from 'react';
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
  type ToastItem,
  VisuallyHidden,
} from '../../components/ui';

export function UiShowcasePage(): ReactNode {
  const [activeTab, setActiveTab] = useState('overview');
  const [switchState, setSwitchState] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([
    { id: '1', title: 'System', message: 'Prototype UI kit rendered', tone: 'default' },
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-12">
      <header className="space-y-2 border-b border-ash pb-6">
        <Pill tone="sim">Dev-Only Preview</Pill>
        <h1 className="text-display tracking-tight text-ink">MARGI AI UI Kit</h1>
        <p className="text-body text-graphite">
          Accessible primitives adhering to DESIGN.md — zero shadows, maximum 500 font weight, and
          system token colors.
        </p>
      </header>

      {/* Buttons */}
      <section className="space-y-4" aria-labelledby="buttons-heading">
        <h2 id="buttons-heading" className="text-subheading font-medium text-ink">
          Buttons
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="lg">
            Primary Large (Lime Pill)
          </Button>
          <Button variant="primary" size="md">
            Primary Medium
          </Button>
          <Button variant="primary" size="sm">
            Primary Small
          </Button>
          <Button variant="ghost">Ghost Nav Action</Button>
          <Button variant="link">Underline Link</Button>
          <Button variant="primary" disabled>
            Disabled Lime
          </Button>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4" aria-labelledby="cards-heading">
        <h2 id="cards-heading" className="text-subheading font-medium text-ink">
          Cards &amp; Inner Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card tone="white">
            <h3 className="text-heading font-medium text-ink">White Surface Card</h3>
            <p className="mt-2 text-sm text-graphite">
              Elevated surface for forms and clean reading.
            </p>
            <InnerCard tone="parchment" className="mt-4">
              <span className="text-xs font-medium text-ink">Inner Card Parchment</span>
            </InnerCard>
          </Card>

          <Card tone="parchment">
            <h3 className="text-heading font-medium text-ink">Parchment Card</h3>
            <p className="mt-2 text-sm text-graphite">Editorial card surface on warm paper.</p>
            <InnerCard tone="white" className="mt-4">
              <span className="text-xs font-medium text-ink">Inner Card White</span>
            </InnerCard>
          </Card>

          <Card tone="dark">
            <h3 className="text-heading font-medium text-parchment">Dark Island Card</h3>
            <p className="mt-2 text-sm text-graphite">
              Inverted block for Thought Stream and contrast.
            </p>
            <InnerCard tone="dark" className="mt-4">
              <span className="text-xs font-medium text-parchment">Inner Card Dark Charcoal</span>
            </InnerCard>
          </Card>

          <Card tone="lime">
            <h3 className="text-heading font-medium text-ink">Lime Accent Block</h3>
            <p className="mt-2 text-sm text-ink">Hero feature highlight surface.</p>
          </Card>
        </div>
      </section>

      {/* Pills and Tags */}
      <section className="space-y-4" aria-labelledby="pills-heading">
        <h2 id="pills-heading" className="text-subheading font-medium text-ink">
          Pills &amp; Eyebrow Tags
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="default">Default Pill</Pill>
          <Pill tone="parchment">Parchment</Pill>
          <Pill tone="dark">Dark Charcoal</Pill>
          <Pill tone="sim">Simulated Status</Pill>
          <Pill tone="outline">Outlined Pill</Pill>
          <Tag tone="default">Tag Alias</Tag>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4" aria-labelledby="tabs-heading">
        <h2 id="tabs-heading" className="text-subheading font-medium text-ink">
          Tabs (Roving TabIndex)
        </h2>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <TabList aria-label="UI Kit Demonstration Tabs">
            <TabTrigger value="overview">Overview</TabTrigger>
            <TabTrigger value="micro">Micro Alternatives</TabTrigger>
            <TabTrigger value="regional">Regional Dispersion</TabTrigger>
            <TabTrigger value="disabled" disabled>
              Disabled Tab
            </TabTrigger>
          </TabList>
          <TabContent value="overview">
            <div className="p-4 rounded-inner border border-ash bg-white text-sm text-ink">
              Overview tab content with full keyboard arrow navigation.
            </div>
          </TabContent>
          <TabContent value="micro">
            <div className="p-4 rounded-inner border border-ash bg-white text-sm text-ink">
              Micro alternatives within 3 km corridor.
            </div>
          </TabContent>
          <TabContent value="regional">
            <div className="p-4 rounded-inner border border-ash bg-white text-sm text-ink">
              Regional alternatives across East/North Bali.
            </div>
          </TabContent>
        </Tabs>
      </section>

      {/* Form Controls: Switch, Input, Select */}
      <section className="space-y-6" aria-labelledby="forms-heading">
        <h2 id="forms-heading" className="text-subheading font-medium text-ink">
          Form Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Switch
              checked={switchState}
              onChange={setSwitchState}
              label="Simulation Mode"
              description="Test congestion under 115% surge conditions"
            />
            <Switch checked={true} disabled onChange={() => {}} label="Disabled Switch (Checked)" />
          </div>

          <div className="space-y-4">
            <Input
              id="showcase-input-text"
              label="Origin Search"
              placeholder="e.g. Lempuyang Temple"
              helperText="Coordinates never leave the device"
            />
            <Input
              id="showcase-input-error"
              label="Invalid Input Example"
              defaultValue="Invalid scene"
              error="Selected image is not a recognizable travel scene"
            />
            <Select
              id="showcase-select"
              label="Time Horizon (WITA)"
              defaultValue="10"
              helperText="Step 1 hour in UTC+8"
            >
              <option value="09">09:00 WITA (Morning Calm)</option>
              <option value="10">10:00 WITA (Crowd Surge)</option>
              <option value="15">15:00 WITA (Afternoon Vibe)</option>
            </Select>
          </div>
        </div>
      </section>

      {/* Dialog & Spinners */}
      <section className="space-y-4" aria-labelledby="dialog-heading">
        <h2 id="dialog-heading" className="text-subheading font-medium text-ink">
          Dialog &amp; Spinners
        </h2>
        <div className="flex items-center gap-6">
          <Button variant="ghost" onClick={() => setIsDialogOpen(true)}>
            Open Accessible Dialog
          </Button>

          <div className="flex items-center gap-3">
            <Spinner size="sm" label="Small spinner" />
            <Spinner size="md" label="Medium spinner" />
            <Spinner size="lg" label="Large spinner" />
          </div>
        </div>

        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Ethical AI Disclosure"
          description="Transparent agentic reasoning pipeline"
        >
          <div className="space-y-4 text-sm text-ink">
            <p>
              MARGI AI orchestrates 3 autonomous agents for vibe deconstruction, telemetry routing,
              and MSME bundling.
            </p>
            <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
              Understood
            </Button>
          </div>
        </Dialog>
      </section>

      {/* Toast Region */}
      <ToastRegion
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      <VisuallyHidden>Screen-reader accessible hidden test text</VisuallyHidden>
    </main>
  );
}
