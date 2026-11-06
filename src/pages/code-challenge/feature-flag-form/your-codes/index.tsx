import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { useForm, useStore } from '@tanstack/react-form';
import { Editor } from '@monaco-editor/react';
import Header from '#/components/features/header';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ──────────────────────────────────────────────────────
type RuleItem = { id: string; type: 'rule'; query: string; percentage: number; variation: string };
type GroupItem = { id: string; type: 'group'; items: TargetItem[] };
type TargetItem = RuleItem | GroupItem;
type Variation = { key: string; value: boolean };

type FormData = {
  flagName: string;
  description?: string;
  enabled: boolean;
  variations: Variation[];
  targeting: TargetItem[];
  defaultRule: { variation: string };
};

// เอา FormData เปลี่ยน type ของ targeting ให้เป็น any[] เพื่อเลี่ยง error TypeScript
type FormValues = Omit<FormData, 'targeting'> & { targeting: any[] };
type Path = number[];

// ─── Zod Schemas ────────────────────────────────────────────────
const RuleSchema = z.object({
  id: z.string('id'),
  type: z.literal('rule'),
  query: z.string().min(1, 'Query is required'),
  percentage: z
    .number({ message: 'Percentage must be a number' })
    .min(0, 'Percentage must be between 0-100')
    .max(100, 'Percentage must be between 0-100'),
  variation: z.string().min(1, 'Variation is required'),
});

// recursive: group ซ้อน group ได้ไม่จำกัด
const TargetItemSchema: z.ZodType<TargetItem> = z.lazy(() => z.discriminatedUnion('type', [RuleSchema, GroupSchema]));

const GroupSchema = z.object({
  id: z.string(),
  type: z.literal('group'),
  items: z.array(TargetItemSchema).min(1, 'Group must contain at least one rule'),
});

const FlagSchema = z
  .object({
    flagName: z.string().min(1, 'Flag name is required'),
    description: z.string().min(1, 'Description is required'),
    enabled: z.boolean(),
    variations: z
      .array(
        z.object({
          key: z.string().min(1, 'Variation key is required'),
          value: z.boolean(),
        }),
      )
      .min(1, 'At least one variation is required'),
    targeting: z.array(TargetItemSchema),
    defaultRule: z.object({
      variation: z.string().min(1, 'Default variation is required'),
    }),
  })
  .superRefine((data, ctx) => {
    const keys = data.variations.map(v => v.key);
    const targetingItems = data.targeting;

    // key ห้ามซ้ำ
    keys.forEach((k, i) => {
      if (k && keys.indexOf(k) !== i) {
        ctx.addIssue({ code: 'custom', path: ['variations', i, 'key'], message: 'Variation key must be unique' });
      }
    });

    // variation ที่ rule อ้างถึงต้องมีอยู่จริง
    const walk = (items: TargetItem[], prefix: (string | number)[]) =>
      items.forEach((it, i) => {
        const p = [...prefix, i];
        if (it.type === 'rule') {
          if (it.variation && !keys.includes(it.variation)) {
            ctx.addIssue({ code: 'custom', path: [...p, 'variation'], message: 'Variation does not exist' });
          }
        } else {
          walk(it.items, [...p, 'items']);
        }
      });
    walk(targetingItems, ['targeting']);
    if (data.defaultRule.variation && !keys.includes(data.defaultRule.variation)) {
      ctx.addIssue({ code: 'custom', path: ['defaultRule', 'variation'], message: 'Variation does not exist' });
    }
  });

// key ที่ใช้เก็บข้อมูลที่กด Save ไว้ใน browser
const STORAGE_KEY = 'feature-flag-editor:saved';

const defaultValues: FormValues = {
  flagName: 'My New Feature',
  description: 'A sample feature flag for demonstration',
  enabled: true,
  variations: [
    { key: 'on', value: true },
    { key: 'off', value: false },
  ],
  targeting: [],
  defaultRule: { variation: 'off' },
};

// ─── Pure helpers (immutable, path-based) ───────────────────────
const toOutputItem = (item: TargetItem): object =>
  item.type === 'rule'
    ? { query: item.query, percentage: item.percentage, variation: item.variation }
    : { items: item.items.map(toOutputItem) };

function transformToOutput(data: FormData) {
  return {
    flags: {
      [data.flagName]: {
        description: data.description,
        enabled: data.enabled,
        variations: Object.fromEntries(data.variations.map(v => [v.key, v.value])),
        targeting: data.targeting.map(toOutputItem),
        defaultRule: { variation: data.defaultRule.variation },
      },
    },
  };
}

function updateAt(items: TargetItem[], path: Path, fn: (item: TargetItem) => TargetItem): TargetItem[] {
  const [head, ...rest] = path;
  return items.map((it, i) => {
    if (i !== head) return it;
    if (rest.length === 0) return fn(it);
    return it.type === 'group' ? { ...it, items: updateAt(it.items, rest, fn) } : it;
  });
}

function removeAt(items: TargetItem[], path: Path): TargetItem[] {
  const [head, ...rest] = path;
  if (rest.length === 0) return items.filter((_, i) => i !== head);
  return items.map((it, i) => (i === head && it.type === 'group' ? { ...it, items: removeAt(it.items, rest) } : it));
}

// ย้ายตำแหน่ง array (ทำให้สามารถ Drag & Drop ได้) 
function moveAt(items: TargetItem[], parentPath: Path, from: number, to: number): TargetItem[] {
  const reorder = (list: TargetItem[]) => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };
  if (parentPath.length === 0) return reorder(items);
  return updateAt(items, parentPath, it => (it.type === 'group' ? { ...it, items: reorder(it.items) } : it));
}

function appendTo(items: TargetItem[], groupPath: Path, newItem: TargetItem): TargetItem[] {
  if (groupPath.length === 0) return [...items, newItem];
  return updateAt(items, groupPath, it => (it.type === 'group' ? { ...it, items: [...it.items, newItem] } : it));
}

function renameVariation(items: TargetItem[], from: string, to: string): TargetItem[] {
  return items.map(it =>
    it.type === 'rule'
      ? it.variation === from
        ? { ...it, variation: to }
        : it
      : { ...it, items: renameVariation(it.items, from, to) },
  );
}

// เป็น error ที่ เเต่ละgroup ควรมี item นึง
const errorKey = (path: Path) => `targeting.${path.join('.items.')}`;

const countRules = (items: TargetItem[]): number =>
  items.reduce((n, it) => n + (it.type === 'rule' ? 1 : countRules(it.items)), 0);

// ข้อมูลที่ save ไว้จากเวอร์ชันเก่าไม่มี id -> เติมให้ก่อน validate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureIds = (items: any): any =>
  Array.isArray(items)
    ? items.map(it => ({
      ...it,
      id: typeof it?.id === 'string' ? it.id : crypto.randomUUID(),
      ...(it?.type === 'group' ? { items: ensureIds(it.items) } : {}),
    }))
    : items;

// ─── Styles ─────────────────────────────────────────────────────

const inputClass = 'h-10 rounded-xl';

const selectClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

const TONES = {
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
} as const;

const btnBlue = 'rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700';
const btnEmerald = 'rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700';
const btnViolet = 'rounded-full bg-violet-600 text-white shadow-sm hover:bg-violet-700';
const btnSoftEmerald =
  'rounded-full border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400';
const btnSoftViolet =
  'rounded-full border-0 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-400';

// ─── Small UI pieces ────────────────────────────────────────────

function Icon({ d, className = 'size-4' }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  layers: 'M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
  filter: 'M3 4h18l-7 8v6l-4 2v-8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
};

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  ) : null;
}

function Field({
  label,
  error,
  hint,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  tone,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: string;
  tone: keyof typeof TONES;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]}`}>
            <Icon d={icon} className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
      <Icon d={ICONS.inbox} className="size-4 opacity-60" />
      {message}
    </div>
  );
}

function RemoveButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="size-10 shrink-0 rounded-full bg-red-500/10 text-red-600 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-30 dark:text-red-400 dark:hover:text-white"
    >
      <Icon d={ICONS.trash} />
    </Button>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-4 ${checked ? 'bg-emerald-500 focus-visible:ring-emerald-500/30' : 'bg-red-500 focus-visible:ring-red-500/30'
        }`}
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-7 text-emerald-600' : 'translate-x-1 text-red-600'
          }`}
      >
        <Icon d={checked ? ICONS.check : ICONS.x} className="size-3.5" />
      </span>
    </button>
  );
}

// ─── Drag & Drop ────────────────────────────────────────────────

// list ที่ลากสลับลำดับได้ — DndContext แยกต่อ list จึงลากได้เฉพาะภายใน list เดียวกัน
function SortableList({
  items,
  parentPath,
  onMove,
  children,
}: {
  items: TargetItem[];
  parentPath: Path;
  onMove: (parentPath: Path, from: number, to: number) => void;
  children: ReactNode;
}) {
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex(it => it.id === active.id);
    const to = items.findIndex(it => it.id === over.id);
    if (from >= 0 && to >= 0) onMove(parentPath, from, to);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(it => it.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      title="Drag to reorder"
      className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
    >
      <Icon d={ICONS.grip} className="size-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-20 opacity-70' : undefined}
    >
      {children(handle)}
    </div>
  );
}

// ─── Form rows ──────────────────────────────────────────────────

function VariationRow({
  index,
  variation,
  canRemove,
  errors,
  onChange,
  onRemove,
}: {
  index: number;
  variation: Variation;
  canRemove: boolean;
  errors: Record<string, string>;
  onChange: (patch: Partial<Variation>) => void;
  onRemove: () => void;
}) {
  const err = errors[`variations.${index}.key`];
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label="Key" error={err}>
          <Input
            value={variation.key}
            onChange={e => onChange({ key: e.target.value })}
            className={`${inputClass} bg-background font-mono text-sm`}
            placeholder="e.g. on"
            aria-invalid={!!err}
          />
        </Field>
        <Field label="Value">
          <select
            value={String(variation.value)}
            onChange={e => onChange({ value: e.target.value === 'true' })}
            className={`${selectClass} font-medium ${variation.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </Field>
      </div>
      <div className="pt-[1.7rem]">
        <RemoveButton label={`Remove variation ${index + 1}`} onClick={onRemove} disabled={!canRemove} />
      </div>
    </div>
  );
}

function TargetNode({
  item,
  path,
  variationKeys,
  errors,
  onUpdate,
  onRemove,
  onAdd,
  onMove,
}: {
  item: TargetItem;
  path: Path;
  variationKeys: string[];
  errors: Record<string, string>;
  onUpdate: (path: Path, patch: Partial<RuleItem>) => void;
  onRemove: (path: Path) => void;
  onAdd: (groupPath: Path, kind: 'rule' | 'group') => void;
  onMove: (parentPath: Path, from: number, to: number) => void;
}) {
  const index = path[path.length - 1];
  const base = errorKey(path);

  if (item.type === 'rule') {
    return (
      <SortableItem id={item.id}>
        {handle => (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="mt-[1.65rem] flex shrink-0 items-center gap-1.5">
              {handle}
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
                {index + 1}
              </span>
            </div>
            <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_7rem_9rem]">
              <Field label="Query" error={errors[`${base}.query`]}>
                <Input
                  value={item.query}
                  onChange={e => onUpdate(path, { query: e.target.value })}
                  className={`${inputClass} bg-background font-mono text-sm`}
                  placeholder="e.g. group == 'beta'"
                  aria-invalid={!!errors[`${base}.query`]}
                />
              </Field>
              <Field label="Rollout %" error={errors[`${base}.percentage`]}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={String(item.percentage)}
                  onChange={e => onUpdate(path, { percentage: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className={`${inputClass} bg-background text-sm tabular-nums`}
                  aria-invalid={!!errors[`${base}.percentage`]}
                />
              </Field>
              <Field label="Serve variation" error={errors[`${base}.variation`]}>
                <select
                  value={item.variation}
                  onChange={e => onUpdate(path, { variation: e.target.value })}
                  className={selectClass}
                >
                  {variationKeys.map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="pt-[1.7rem]">
              <RemoveButton label={`Remove rule ${index + 1}`} onClick={() => onRemove(path)} />
            </div>
          </div>
        )}
      </SortableItem>
    );
  }

  return (
    <SortableItem id={item.id}>
      {handle => (
        <div className="rounded-2xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {handle}
              <span className="rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold text-white">
                Group {index + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.items.length === 0 ? 'Empty' : `${item.items.length} item${item.items.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <RemoveButton label={`Remove group ${index + 1}`} onClick={() => onRemove(path)} />
          </div>

          <div className="ml-3 space-y-3 border-l-2 border-violet-500/30 pl-4">
            {item.items.length === 0 && <EmptyState message="This group has no rules yet." />}
            <SortableList items={item.items} parentPath={path} onMove={onMove}>
              {item.items.map((child, i) => (
                <div key={child.id} className="mb-3 last:mb-0">
                  <TargetNode
                    item={child}
                    path={[...path, i]}
                    variationKeys={variationKeys}
                    errors={errors}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    onAdd={onAdd}
                    onMove={onMove}
                  />
                </div>
              ))}
            </SortableList>
            <FieldError message={errors[`${base}.items`]} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={btnSoftEmerald}
                onClick={() => onAdd(path, 'rule')}
              >
                <Icon d={ICONS.plus} className="size-3.5" />
                Add rule
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={btnSoftViolet}
                onClick={() => onAdd(path, 'group')}
              >
                <Icon d={ICONS.plus} className="size-3.5" />
                Add sub-group
              </Button>
            </div>
          </div>
        </div>
      )}
    </SortableItem>
  );
}

// ─── Main Component ─────────────────────────────────────────────

function FlagEditor({ initialValues, onReset }: { initialValues: FormValues; onReset: () => void }) {
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: ({ value }) => (FlagSchema.safeParse(value).success ? undefined : 'Please fix the validation errors'),
    },
    onSubmit: async ({ value }) => {
      // บันทึกลง localStorage (validate ผ่านแล้วเท่านั้นถึงมาถึงตรงนี้)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
      }
      await new Promise(r => setTimeout(r, 400)); 
    },
  });

  // subscribe store -> re-render ทุกครั้งที่ค่าเปลี่ยน
  const values = useStore(form.store, s => s.values);
  const isSubmitting = useStore(form.store, s => s.isSubmitting);
  const attempts = useStore(form.store, s => s.submissionAttempts);
  const isSubmitSuccessful = useStore(form.store, s => s.isSubmitSuccessful);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (key: string) => setTouched(t => (t[key] ? t : { ...t, [key]: true }));
  const parsed = useMemo(() => FlagSchema.safeParse(values), [values]);

  // แสดง error ตอนกด save
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (parsed.success) return map;
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join('.');
      if ((attempts > 0 || touched[key]) && !map[key]) map[key] = issue.message;
    }
    return map;
  }, [parsed, attempts, touched]);

  const { variations, defaultRule } = values;
  const targeting = values.targeting as TargetItem[];

  const variationKeys = useMemo(() => variations.map(v => v.key), [variations]);
  const jsonPreview = useMemo(
    () => JSON.stringify(transformToOutput({ ...values, targeting: values.targeting as TargetItem[] }), null, 2),
    [values],
  );
  const ruleCount = useMemo(() => countRules(targeting), [targeting]);

  // ── variations
  const addVariation = () =>
    form.setFieldValue('variations', [...variations, { key: `variation_${variations.length + 1}`, value: false }]);

  const removeVariation = (i: number) => {
    if (variations.length <= 1) return;
    form.setFieldValue(
      'variations',
      variations.filter((_, idx) => idx !== i),
    );
  };

  const updateVariation = (i: number, patch: Partial<Variation>) => {
    const old = variations[i];
    form.setFieldValue(
      'variations',
      variations.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    );
    // เปลี่ยนชื่อ key -> ให้ rule / default ที่อ้างอิงอยู่เปลี่ยนตาม
    if (patch.key !== undefined && patch.key !== old.key) {
      form.setFieldValue('targeting', renameVariation(targeting, old.key, patch.key));
      if (defaultRule.variation === old.key) form.setFieldValue('defaultRule', { variation: patch.key });
    }
  };

  // ── targeting
  const addTarget = (groupPath: Path, kind: 'rule' | 'group') => {
    const newItem: TargetItem =
      kind === 'rule'
        ? { id: crypto.randomUUID(), type: 'rule', query: '', percentage: 0, variation: variationKeys[0] ?? '' }
        : { id: crypto.randomUUID(), type: 'group', items: [] };
    form.setFieldValue('targeting', appendTo(targeting, groupPath, newItem));
  };

  const updateRule = (path: Path, patch: Partial<RuleItem>) =>
    form.setFieldValue(
      'targeting',
      updateAt(targeting, path, it => (it.type === 'rule' ? { ...it, ...patch } : it)),
    );

  const removeTarget = (path: Path) => form.setFieldValue('targeting', removeAt(targeting, path));

  const moveTarget = (parentPath: Path, from: number, to: number) =>
    form.setFieldValue('targeting', moveAt(targeting, parentPath, from, to));

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };

  const saved = attempts > 0 && !isSubmitting && isSubmitSuccessful && parsed.success;
  const failed = attempts > 0 && !isSubmitting && !saved;

  return (
    <div className="space-y-6">
      <Header
        title="Feature Flag Editor"
        subTitle={
          <>
            สร้างระบบจัดการ Feature Flag แบบ Dynamic พร้อม Targeting Rules แบบซ้อนทับ และดูผลลัพธ์ JSON แบบ Real-time
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ───────── Form ───────── */}
        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
        >
          {/* Title bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-blue-500/10 via-violet-500/5 to-transparent px-6 py-5">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Flag configuration</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${values.enabled
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-500/15 text-red-700 dark:text-red-400'
                    }`}
                >
                  <span
                    className={`size-2 rounded-full ${values.enabled ? 'bg-emerald-500' : 'bg-red-500'}`}
                    aria-hidden="true"
                  />
                  {values.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 font-medium text-blue-700 dark:text-blue-400">
                  {variations.length} variation{variations.length > 1 ? 's' : ''}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                  {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onReset}>
              <Icon d={ICONS.reset} className="size-3.5" />
              Reset form
            </Button>
          </div>

          <div className="divide-y divide-border">
            {/* Flag details */}
            <Section
              title="Flag details"
              description="Identify the flag and control whether it is live."
              icon={ICONS.flag}
              tone="rose"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="flagName">
                  {field => (
                    <Field
                      label="Flag name"
                      error={errors.flagName}
                      hint="Used as the flag's name in the JSON output."
                      className="md:col-span-2"
                    >
                      <Input
                        value={field.state.value}
                        onChange={e => {
                          field.handleChange(e.target.value);
                          touch('flagName');
                        }}
                        onBlur={() => touch('flagName')}
                        className={inputClass}
                        aria-invalid={!!errors.flagName}
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="description">
                  {field => (
                    <Field label="Description" error={errors.description} className="md:col-span-2">
                      <Input
                        value={field.state.value ?? ''}
                        onChange={e => {
                          field.handleChange(e.target.value);
                          touch('description');
                        }}
                        onBlur={() => touch('description')}
                        className={inputClass}
                        aria-invalid={!!errors.description}
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="enabled">
                  {field => (
                    <div
                      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition-colors md:col-span-2 ${field.state.value
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                        }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-semibold ${field.state.value
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                            }`}
                        >
                          {field.state.value ? 'This flag is on' : 'This flag is off'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field.state.value ? 'It is being served to users.' : 'It is not served to anyone.'}
                        </p>
                      </div>
                      <Switch checked={field.state.value} onChange={field.handleChange} label="Enable this flag" />
                    </div>
                  )}
                </form.Field>
              </div>
            </Section>

            {/* Variations */}
            <Section
              title="Variations"
              description="The values this flag can return."
              icon={ICONS.layers}
              tone="blue"
              action={
                <Button type="button" size="sm" className={btnBlue} onClick={addVariation}>
                  <Icon d={ICONS.plus} className="size-3.5" />
                  Add variation
                </Button>
              }
            >
              <div className="space-y-3">
                {variations.map((v, i) => (
                  <VariationRow
                    key={i}
                    index={i}
                    variation={v}
                    canRemove={variations.length > 1}
                    errors={errors}
                    onChange={patch => updateVariation(i, patch)}
                    onRemove={() => removeVariation(i)}
                  />
                ))}
                <FieldError message={errors.variations} />
              </div>
            </Section>

            {/* Targeting */}
            <Section
              title="Targeting rules"
              description="Rules are checked top to bottom. Drag the handle to reorder, and use groups to nest conditions."
              icon={ICONS.filter}
              tone="emerald"
              action={
                <>
                  <Button type="button" size="sm" className={btnViolet} onClick={() => addTarget([], 'group')}>
                    <Icon d={ICONS.plus} className="size-3.5" />
                    Add group
                  </Button>
                  <Button type="button" size="sm" className={btnEmerald} onClick={() => addTarget([], 'rule')}>
                    <Icon d={ICONS.plus} className="size-3.5" />
                    Add rule
                  </Button>
                </>
              }
            >
              <div>
                {targeting.length === 0 && <EmptyState message="No targeting rules yet. Add a rule to get started." />}
                <SortableList items={targeting} parentPath={[]} onMove={moveTarget}>
                  {targeting.map((item, i) => (
                    <div key={item.id} className="mb-3 last:mb-0">
                      <TargetNode
                        item={item}
                        path={[i]}
                        variationKeys={variationKeys}
                        errors={errors}
                        onUpdate={updateRule}
                        onRemove={removeTarget}
                        onAdd={addTarget}
                        onMove={moveTarget}
                      />
                    </div>
                  ))}
                </SortableList>
              </div>
            </Section>

            {/* Default rule */}
            <Section
              title="Default rule"
              description="Served when no targeting rule matches."
              icon={ICONS.shield}
              tone="amber"
            >
              <Field label="Default variation" error={errors['defaultRule.variation']} className="max-w-xs">
                <select
                  value={defaultRule.variation}
                  onChange={e => form.setFieldValue('defaultRule', { variation: e.target.value })}
                  className={selectClass}
                >
                  {variationKeys.map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
            </Section>
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card/90 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-h-10 text-sm">
              {saved && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400">
                  <Icon d={ICONS.check} />
                  Feature flag saved
                </span>
              )}
              {failed && (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 font-medium text-red-700 dark:text-red-400">
                  <Icon d={ICONS.x} />
                  Fix the highlighted fields, then save again.
                </span>
              )}
              {!saved && !failed && (
                <span className="text-muted-foreground">Click save to keep your changes in this browser.</span>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-full bg-emerald-600 px-8 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 sm:min-w-44"
            >
              {isSubmitting ? 'Saving…' : 'Save feature flag'}
            </Button>
          </div>
        </form>

        {/* JSON preview */}
        <aside className="xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-[#1e1e1e] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#252526] px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-3 rounded-full bg-red-500" />
                  <span className="size-3 rounded-full bg-yellow-400" />
                  <span className="size-3 rounded-full bg-emerald-500" />
                </div>
                <span className="truncate font-mono text-xs text-slate-300">preview.json</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                  live
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={copyJson}
                className="h-8 gap-1.5 rounded-full bg-white/5 px-3 text-xs text-slate-200 hover:bg-white/15 hover:text-white"
              >
                <Icon d={copied ? ICONS.check : ICONS.copy} className="size-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Editor
              theme="vs-dark"
              language="json"
              value={jsonPreview}
              width="100%"
              height="min(70vh, 640px)"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'none',
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── โหลดค่าที่ Save ───

function loadValueSaved(): FormValues | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const json = JSON.parse(raw);
    const result = FlagSchema.safeParse({ ...json, targeting: ensureIds(json.targeting) });
    return result.success ? (result.data as FormValues) : null;
  } catch {
    return null; // ข้อมูลเสีย ใช้ค่าเริ่มต้นแทน
  }
}

export default function FeatureFlagEditorPage() {
  const [initialValues, setInitialValues] = useState<FormValues | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // อ่าน localStorage หลัง mount 
  useEffect(() => {
    setInitialValues(loadValueSaved() ?? defaultValues);
  }, []);

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
    setInitialValues(defaultValues);
    setEditorKey(k => k + 1); // สร้างฟอร์มใหม่ด้วยค่าเริ่มต้น
  };

  if (!initialValues) return null;

  return <FlagEditor key={editorKey} initialValues={initialValues} onReset={handleReset} />;
}
