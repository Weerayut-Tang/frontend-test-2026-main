import { cn } from '#/lib/utils'

export interface IStackBadge {
  key: string
  title: string
  url: string
  color: string
}

interface IStackBadgeProps {
  stacks: IStackBadge[]
}

export const AllowedStacks: IStackBadge[] = [
  {
    key: 'tanstack-form',
    title: 'TanStack Form',
    url: 'https://tanstack.com/form/latest',
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    key: 'zod',
    title: 'Zod',
    url: 'https://zod.dev/',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'json-preview',
    title: 'JSON Preview',
    url: 'https://www.npmjs.com/package/@monaco-editor/react',
    color: 'bg-slate-100 text-slate-700',
  },
]

function StackBadges({ stacks }: IStackBadgeProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {stacks.map((stack) => (
        <a
          key={stack.title}
          href={stack.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded',
            stack.color,
          )}
        >
          {stack.title}
        </a>
      ))}
    </div>
  )
}

export default StackBadges
