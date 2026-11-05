'use client';

import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { Editor } from '@monaco-editor/react';
import Header from '#/components/features/header';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';

const RuleSchema = z.object({
  type: z.literal('rule'),
  query: z.string().min(1, 'Query field is required'),
  percentage: z.coerce.number().min(0, 'Percentage must be between 0-100').max(100, 'Percentage must be between 0-100'),
  variation: z.string().min(1, 'Variation is required'),
});

const GroupSchema: any = z.lazy(() =>
  z.object({
    type: z.literal('group'),
    items: z.array(z.union([RuleSchema, GroupSchema])).optional().default([]),
  })
);

const TargetingSchema = z.array(z.union([RuleSchema, GroupSchema]));

const VariationSchema = z.object({
  key: z.string().min(1, 'Variation key is required'),
  value: z.boolean(),
});

const DefaultRuleSchema = z.object({
  variation: z.string().min(1, 'Default variation is required'),
});

const FlagSchema = z.object({
  flagKey: z.string().min(1, 'Flag key is required'),
  flagName: z.string().min(1, 'Flag name is required'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  variations: z.array(VariationSchema).min(1, 'At least one variation is required'),
  targeting: TargetingSchema.optional().default([]),
  defaultRule: DefaultRuleSchema,
});

type FormData = z.infer<typeof FlagSchema>;
type TargetItem =
  | { type: 'rule'; query: string; percentage: number; variation: string }
  | { type: 'group'; items: TargetItem[] };

const defaultValues: FormData = {
  flagKey: 'my-new-feature',
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

function transformToOutput(data: FormData) {
  return {
    flags: {
      [data.flagKey]: {
        variations: Object.fromEntries(data.variations.map((v) => [v.key, v.value])),
        targeting: data.targeting.map((item) => {
          if (item.type === 'rule') {
            return { query: item.query, percentage: item.percentage, variation: item.variation };
          }
          return {
            items: item.items.map((sub: TargetItem) => {
              if (sub.type === 'rule') {
                return { query: sub.query, percentage: sub.percentage, variation: sub.variation };
              }
              return { items: sub.items };
            }),
          };
        }),
        defaultRule: { variation: data.defaultRule.variation },
      },
    },
  };
}

function VariationRow({
  index,
  variation,
  onUpdate,
  onRemove,
  error,
}: {
  index: number;
  variation: { key: string; value: boolean };
  onUpdate: (field: 'key' | 'value', value: string | boolean) => void;
  onRemove: () => void;
  error?: string;
}) {
  return (
    <div className="bg-card p-4 rounded-lg border border-border flex gap-3 items-start">
      <span className="text-xs font-medium text-muted-foreground self-start mt-1.5">
        Variation {index + 1}
      </span>
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Key</label>
          <Input
            value={variation.key}
            onChange={(e) => onUpdate('key', e.target.value)}
            className="h-9"
            aria-invalid={!!error}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="space-y-1 flex flex-col">
          <label className="text-xs font-medium text-foreground">Value</label>
          <select
            value={String(variation.value)}
            onChange={(e) => onUpdate('value', e.target.value === 'true')}
            className="h-9 bg-background border border-border rounded-lg px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      </div>
      <Button size="sm" variant="destructive" onClick={onRemove} disabled className="self-start mt-1 opacity-50 cursor-not-allowed">
        Remove
      </Button>
    </div>
  );
}

function RuleEditor({
  index,
  rule,
  variationKeys,
  onUpdate,
  onRemove,
  error,
}: {
  index: number;
  rule: { query: string; percentage: number; variation: string };
  variationKeys: string[];
  onUpdate: (field: 'query' | 'percentage' | 'variation', value: string) => void;
  onRemove: () => void;
  error?: string;
}) {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex gap-3 items-start">
      <span className="text-xs font-medium text-blue-700 self-start mt-1.5 uppercase tracking-wider">
        Rule {index + 1}
      </span>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Query</label>
          <Input
            value={rule.query}
            onChange={(e) => onUpdate('query', e.target.value)}
            className="h-9 text-sm"
            placeholder="e.g. group == 'beta'"
            aria-invalid={!!error}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Percentage (%)</label>
          <Input
            type="number"
            value={String(rule.percentage)}
            onChange={(e) => onUpdate('percentage', e.target.value)}
            className="h-9 text-sm"
            aria-invalid={!!error}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Variation</label>
          <select
            value={rule.variation}
            onChange={(e) => onUpdate('variation', e.target.value)}
            className="h-9 bg-background border border-border rounded-lg px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {variationKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button size="sm" variant="destructive" onClick={onRemove} className="self-start mt-1">
        Remove
      </Button>
    </div>
  );
}

function GroupEditor({
  index,
  group,
  variationKeys,
  onUpdateItem,
  onRemoveGroup,
}: {
  index: number;
  group: { items: TargetItem[] };
  variationKeys: string[];
  onUpdateItem: (type: 'group' | 'rule', groupIndex: number, itemIndex: number, field: string, value: string) => void;
  onRemoveGroup: () => void;
  error?: string;
}) {
  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex gap-3 items-start">
      <span className="text-xs font-medium text-slate-700 self-start mt-1.5 uppercase tracking-wider">
        Group {index + 1}
      </span>
      <div className="flex-1 space-y-3">
        {group.items.map((item, itemIdx) => {
          if (item.type === 'rule') {
            return (
              <RuleEditor
                key={itemIdx}
                index={itemIdx}
                rule={item}
                variationKeys={variationKeys}
                onUpdate={(field, value) => onUpdateItem('rule', index, itemIdx, field, value)}
                onRemove={() => {
                  const items = [...group.items];
                  items.splice(itemIdx, 1);
                  onUpdateItem('group', index, -1, 'items', JSON.stringify(items));
                }}
              />
            );
          }
          return (
            <GroupEditor
              key={itemIdx}
              index={itemIdx}
              group={item}
              variationKeys={variationKeys}
              onUpdateItem={onUpdateItem}
              onRemoveGroup={onRemoveGroup}
              error={undefined}
            />
          );
        })}
      </div>
      <Button size="sm" variant="destructive" onClick={onRemoveGroup} className="self-start mt-1">
        Remove Group
      </Button>
    </div>
  );
}

export default function YourCode() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setSubmitMessage(null);
      const result = FlagSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        const nextErrors: Record<string, string> = {};
        Object.entries(fieldErrors).forEach(([key, val]) => {
          nextErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setErrors(nextErrors);
        setIsSubmitting(false);
        setSubmitMessage({ type: 'error', message: 'Please fix the validation errors above.' });
        return;
      }
      setErrors({});
      await new Promise((r) => setTimeout(r, 800));
      transformToOutput(value);
      setIsSubmitting(false);
      setSubmitMessage({ type: 'success', message: 'Feature flag saved successfully!' });
    },
  });

  const variationKeys = useMemo(() => form.getFieldValue('variations').map((v) => v.key), [form]);
  const jsonPreview = useMemo(() => {
    const data: FormData = {
      flagKey: form.getFieldValue('flagKey'),
      flagName: form.getFieldValue('flagName'),
      description: form.getFieldValue('description') ?? '',
      enabled: form.getFieldValue('enabled'),
      variations: form.getFieldValue('variations'),
      targeting: form.getFieldValue('targeting'),
      defaultRule: form.getFieldValue('defaultRule'),
    };
    return JSON.stringify(transformToOutput(data), null, 2);
  }, [form]);
  const getFieldError = useCallback((path: string) => errors[path], [errors]);

  const variations = form.getFieldValue('variations');
  const targeting = form.getFieldValue('targeting');
  const defaultRule = form.getFieldValue('defaultRule');

  const addVariation = useCallback(() => {
    const current = form.getFieldValue('variations');
    const newKey = `variation_${Date.now()}`;
    form.setFieldValue('variations', [...current, { key: newKey, value: false }]);
  }, [form]);

  const removeVariation = useCallback((index: number) => {
    const current = form.getFieldValue('variations');
    if (current.length <= 1) return;
    const next = [...current];
    next.splice(index, 1);
    form.setFieldValue('variations', next);
  }, [form]);

  const updateVariation = useCallback((index: number, field: 'key' | 'value', value: string | boolean) => {
    const current = form.getFieldValue('variations');
    const next = [...current];
    next[index] = { ...next[index], [field]: value };
    form.setFieldValue('variations', next);
  }, [form]);

  const addTargetingRule = useCallback((groupIndex?: number) => {
    const current = form.getFieldValue('targeting');
    const newRule: TargetItem = { type: 'rule', query: '', percentage: 0, variation: variationKeys[0] || '' };
    if (groupIndex === undefined) {
      form.setFieldValue('targeting', [...current, newRule]);
    } else {
      const groups = [...current];
      const group = groups[groupIndex];
      if (group && group.type === 'group') {
        group.items = [...(group.items || []), newRule];
        groups[groupIndex] = group;
        form.setFieldValue('targeting', groups);
      }
    }
  }, [form, variationKeys]);

  const addTargetingGroup = useCallback(() => {
    const current = form.getFieldValue('targeting');
    const newGroup: TargetItem = { type: 'group', items: [] };
    form.setFieldValue('targeting', [...current, newGroup]);
  }, [form]);

  const removeTargetingItem = useCallback((index: number) => {
    const current = form.getFieldValue('targeting');
    const next = [...current];
    next.splice(index, 1);
    form.setFieldValue('targeting', next);
  }, [form]);

  const updateTargetingItem = useCallback((itemIndex: number, field: string, value: string) => {
    const current = form.getFieldValue('targeting');
    const next = [...current];
    const item = next[itemIndex];
    if (item.type === 'rule') {
      if (field === 'query') item.query = value;
      if (field === 'percentage') item.percentage = Number(value) || 0;
      if (field === 'variation') item.variation = value;
      next[itemIndex] = item;
    }
    form.setFieldValue('targeting', next);
  }, [form]);

  const updateDefaultRule = useCallback((value: string) => {
    form.setFieldValue('defaultRule', { variation: value });
  }, [form]);
return (
<div className="space-y-6">
        <Header
          title="Feature Flag Editor"
          subTitle={
            <>
              สร้างระบบจัดการ Feature Flag แบบ Dynamic พร้อม Targeting Rules แบบซ้อนทับ (Recursive/Nested)
              และดูผลลัพธ์ JSON แบบ Real-time
            </>
          }
        />

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Flag Configuration</h2>
              <p className="text-muted-foreground text-sm">Configure your feature flag and targeting rules below.</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                form.setFieldValue('flagKey', '');
                form.setFieldValue('flagName', '');
                form.setFieldValue('description', '');
                form.setFieldValue('enabled', true);
                form.setFieldValue('variations', [
                  { key: 'on', value: true },
                  { key: 'off', value: false },
                ]);
                form.setFieldValue('targeting', []);
                form.setFieldValue('defaultRule', { variation: 'off' });
                setErrors({});
                setSubmitMessage(null);
              }}
              variant="outline"
              size="sm"
            >
              Reset Form
            </Button>
          </div>

          <section className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Flag Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Flag Key</label>
                <Input
                  value={form.getFieldValue('flagKey')}
                  onChange={(e) => form.setFieldValue('flagKey', e.target.value)}
                  className="h-9"
                  aria-invalid={!!getFieldError('flagKey')}
                />
                {getFieldError('flagKey') && (
                  <p className="text-xs text-destructive">{getFieldError('flagKey')}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Flag Name</label>
                <Input
                  value={form.getFieldValue('flagName')}
                  onChange={(e) => form.setFieldValue('flagName', e.target.value)}
                  className="h-9"
                  aria-invalid={!!getFieldError('flagName')}
                />
                {getFieldError('flagName') && (
                  <p className="text-xs text-destructive">{getFieldError('flagName')}</p>
                )}
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Input
                  value={form.getFieldValue('description') ?? ''}
                  onChange={(e) => form.setFieldValue('description', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="text-sm font-medium text-foreground cursor-pointer select-none flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.getFieldValue('enabled')}
                    onChange={(e) => form.setFieldValue('enabled', e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  Enabled
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Flag Variations
              </h3>
            <Button size="sm" onClick={addVariation}>
              + Add Variation
            </Button>
          </div>
          <div className="space-y-3">
            {variations.map((v, i) => (
              <VariationRow
                key={i}
                index={i}
                variation={v}
                onUpdate={(field, value) => updateVariation(i, field, value)}
                onRemove={() => removeVariation(i)}
                error={getFieldError(`variations.${i}.key`)}
              />
            ))}
            {getFieldError('variations') && (
              <p className="text-xs text-destructive">{getFieldError('variations')}</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Targeting Rules
            </h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addTargetingRule()}>
                + Add Rule
              </Button>
              <Button size="sm" onClick={addTargetingGroup}>
                + Add Group
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {targeting.map((item, i) => {
              if (item.type === 'rule') {
                return (
                  <RuleEditor
                    key={i}
                    index={i}
                    rule={item}
                    variationKeys={variationKeys}
                    onUpdate={(field, value) => updateTargetingItem(i, field, value)}
                    onRemove={() => removeTargetingItem(i)}
                    error={getFieldError(`targeting.${i}.query`)}
                  />
                );
              }
              return (
                <GroupEditor
                  key={i}
                  index={i}
                  group={item}
                  variationKeys={variationKeys}
                  onUpdateItem={(type, gIdx, itemIdx, field, value) => {
                    if (type === 'rule' && field === 'addRule') {
                      addTargetingRule(gIdx);
                      return;
                    }
                    if (type === 'group' && field === 'addGroup') {
                      addTargetingGroup();
                      return;
                    }
                    if (itemIdx === -1 && field === 'items') {
                      const groups = [...targeting];
                      const group = groups[gIdx];
                      if (group && group.type === 'group') {
                        group.items = JSON.parse(value);
                        groups[gIdx] = group;
                        form.setFieldValue('targeting', groups);
                      }
                      return;
                    }
                    updateTargetingItem(i, field, value);
                  }}
                  onRemoveGroup={() => removeTargetingItem(i)}
                />
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Default Rule
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Default Variation</label>
            <select
              value={defaultRule.variation}
              onChange={(e) => updateDefaultRule(e.target.value)}
              className="h-9 bg-background border border-border rounded-lg px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {variationKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            {getFieldError('defaultRule') && (
              <p className="text-xs text-destructive">{getFieldError('defaultRule')}</p>
            )}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                const result = FlagSchema.safeParse({
                  flagKey: form.getFieldValue('flagKey'),
                  flagName: form.getFieldValue('flagName'),
                  description: form.getFieldValue('description') ?? '',
                  enabled: form.getFieldValue('enabled'),
                  variations: form.getFieldValue('variations'),
                  targeting: form.getFieldValue('targeting'),
                  defaultRule: form.getFieldValue('defaultRule'),
                });
                if (!result.success) {
                  const fieldErrors = result.error.flatten().fieldErrors;
                  const nextErrors: Record<string, string> = {};
                  Object.entries(fieldErrors).forEach(([key, val]) => {
                    nextErrors[key] = Array.isArray(val) ? val[0] : String(val);
                  });
                  setErrors(nextErrors);
                  setSubmitMessage({ type: 'error', message: 'Please fix the validation errors above.' });
                  return;
                }
                setErrors({});
                setIsSubmitting(true);
                setSubmitMessage(null);
                void new Promise((r) => setTimeout(r, 800)).then(() => {
                  setIsSubmitting(false);
                  setSubmitMessage({ type: 'success', message: 'Feature flag saved successfully!' });
                });
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Feature Flag'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Uses @tanstack/react-form + Zod validation
            </span>
          </div>
          {submitMessage && (
            <div
              className={`px-4 py-3 rounded-lg text-sm font-medium ${
                submitMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {submitMessage.message}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="bg-slate-900 px-4 py-2 border-b border-border flex justify-between items-center">
          <span className="text-xs font-mono text-slate-400">preview.json</span>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          </div>
        </div>
        <div className="p-0 flex-1 min-h-[400px]">
          <Editor
            theme="vs-dark"
            language="json"
            value={jsonPreview}
            width="100%"
            height="100%"
            onMount={(editor: any) => {
              editor.action(editor.getAction('editor.action.formatDocument'));
            }}
          />
        </div>
      </div>
    </div>
  );
}