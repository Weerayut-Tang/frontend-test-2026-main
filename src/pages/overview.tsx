import { useRouter } from '@tanstack/react-router'
import type { ToOptions } from '@tanstack/react-router'

import BadgeStacks, { AllowedStacks } from '#/components/features/badge-stacks'
import type { IStackBadge } from '#/components/features/badge-stacks'
import Header from '#/components/features/header'

import { Button } from '#/components/ui/button'

interface IAssignment {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  stacks: IStackBadge[]
  url: ToOptions['to']
  status: 'Available' | 'Locked'
  description: string
}

const assignments: IAssignment[] = [
  {
    id: 'feature-flag-editor',
    title: 'Feature Flag Editor',
    difficulty: 'Hard',
    stacks: AllowedStacks.filter((stack) =>
      ['tanstack-form', 'zod', 'json-preview'].includes(stack.key),
    ),
    url: '/code-challenge/feature-flag-form',
    status: 'Available',
    description:
      'สร้าง UI Editor สำหรับจัดการ Feature Flag ตามมาตรฐาน GoFeatureFlag',
  },
]

const OverviewPage = () => {
  const router = useRouter()

  return (
    <div className="bg-background text-foreground font-sans box-border">
      <Header
        title="Assignment Dashboard"
        subTitle="เลือกโจทย์ที่คุณต้องการทดสอบทักษะ Frontend Development"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {assignments.map((task) => (
          <div
            key={task.id}
            className="group bg-card p-5 rounded-lg border border-border shadow-sm hover:border-primary transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    task.difficulty === 'Hard'
                      ? 'border-red-500 text-red-500'
                      : task.difficulty === 'Expert'
                        ? 'border-purple-500 text-purple-500'
                        : 'border-blue-500 text-blue-500'
                  }`}
                >
                  {task.difficulty}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {task.status}
                </span>
              </div>

              <h2 className="text-xl font-bold mb-2 group-hover:text-primary">
                {task.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 italic">
                {task.description}
              </p>

              <BadgeStacks stacks={task.stacks} />
            </div>

            <Button
              disabled={task.status !== 'Available'}
              className={`w-full mt-5 py-2 rounded-md text-sm font-medium transition-all ${
                task.status === 'Available'
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              onClick={() => router.navigate({ to: task.url })}
            >
              {task.status === 'Available' ? 'Start Assignment' : 'Locked'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OverviewPage
