import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { Modal } from '../../components/overlays/Modal'
import type { Curriculum, CurriculumProgress, LearningArea } from '@shared/contracts'
import { createUserCurriculum, getProgress, listCurricula } from '../../services/ipc/learningClient'

const AREA_LABELS: Record<LearningArea, string> = {
  'it-fundamentals': 'IT fundamentals',
  'soc-security': 'SOC and security',
  linux: 'Linux',
  networking: 'Networking',
  development: 'Development',
  git: 'Git',
  'ai-tooling': 'AI tooling',
  'steam-deck-system-skills': 'Steam Deck system skills',
  other: 'Other'
}

const AREAS: LearningArea[] = [
  'it-fundamentals',
  'soc-security',
  'linux',
  'networking',
  'development',
  'git',
  'ai-tooling',
  'steam-deck-system-skills',
  'other'
]

function computeProgress(curriculum: Curriculum, progress: CurriculumProgress): number {
  const moduleProgress = progress[curriculum.id] ?? {}
  let total = 0
  let completed = 0
  for (const module of curriculum.modules) {
    for (const lesson of module.lessons) {
      total += 1
      const lessonProgress = moduleProgress[module.id]?.[lesson.id]
      if (lessonProgress === 'completed') {
        completed += 1
      }
    }
  }
  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

function totalEstimatedMinutes(curriculum: Curriculum): number {
  return curriculum.modules.reduce(
    (sum, module) => sum + module.lessons.reduce((s, lesson) => s + lesson.estimatedMinutes, 0),
    0
  )
}

function labCount(curriculum: Curriculum): number {
  return curriculum.modules.reduce(
    (sum, module) => sum + module.lessons.filter((lesson) => lesson.type === 'lab').length,
    0
  )
}

function firstIncompleteLesson(
  curriculum: Curriculum,
  progress: CurriculumProgress
): { moduleId: string; lessonId: string } | null {
  const moduleProgress = progress[curriculum.id] ?? {}
  for (const module of curriculum.modules) {
    for (const lesson of module.lessons) {
      const status = moduleProgress[module.id]?.[lesson.id]
      if (status !== 'completed') {
        return { moduleId: module.id, lessonId: lesson.id }
      }
    }
  }
  return { moduleId: curriculum.modules[0].id, lessonId: curriculum.modules[0].lessons[0].id }
}

function CurriculumCard({
  curriculum,
  progress,
  index,
  onStart
}: {
  curriculum: Curriculum
  progress: CurriculumProgress
  index: number
  onStart: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `curriculum:${curriculum.id}`,
    groupId: 'learning-hub',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate: onStart
  })

  const progressPercent = computeProgress(curriculum, progress)
  const minutes = totalEstimatedMinutes(curriculum)
  const labs = labCount(curriculum)

  return (
    <NdxSpatialLockup selected={isFocused}>
      <ControllerButton
        ref={ref}
        variant="secondary"
        className="flex h-full min-h-72 flex-col items-start gap-3 border-0 bg-transparent p-0 text-left shadow-none hover:bg-transparent"
        onClick={onStart}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="text-body font-semibold text-text-primary">{curriculum.title}</span>
          {curriculum.bundled && <StatusBadge tone="neutral" label="Bundled" />}
        </div>
        <p className="text-meta text-text-secondary line-clamp-2">{curriculum.description}</p>
        <div className="mt-auto flex w-full flex-wrap items-center gap-2 text-meta text-text-secondary">
          <span>{AREA_LABELS[curriculum.area]}</span>
          <span>·</span>
          <span>{minutes} min</span>
          {labs > 0 && (
            <>
              <span>·</span>
              <span>
                {labs} lab{labs === 1 ? '' : 's'}
              </span>
            </>
          )}
          <span>·</span>
          <span>Offline</span>
        </div>
        {curriculum.requiredTools.length > 0 && (
          <p className="text-meta text-text-secondary">
            Tools: {curriculum.requiredTools.join(', ')}
          </p>
        )}
        <div className="w-full">
          <div className="flex justify-between text-meta text-text-secondary">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full bg-status-success transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </ControllerButton>
    </NdxSpatialLockup>
  )
}

export function LearningHub(): React.JSX.Element {
  const navigate = useNavigate()
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [progress, setProgress] = useState<CurriculumProgress>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedArea, setSelectedArea] = useState<LearningArea | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newArea, setNewArea] = useState<LearningArea>('other')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([listCurricula(), getProgress()]).then(([curriculaResult, progressResult]) => {
      if (!active) return
      setLoading(false)
      if (!curriculaResult.ok) {
        setError(curriculaResult.error.userMessage)
        return
      }
      if (!progressResult.ok) {
        setError(progressResult.error.userMessage)
        return
      }
      setCurricula(curriculaResult.data)
      setProgress(progressResult.data)
      setError(null)
    })
    return () => {
      active = false
    }
  }, [createOpen])

  const filteredCurricula = useMemo(() => {
    if (selectedArea === 'all') return curricula
    return curricula.filter((c) => c.area === selectedArea)
  }, [curricula, selectedArea])

  async function handleCreate(): Promise<void> {
    if (!newTitle.trim()) return
    setCreating(true)
    const result = await createUserCurriculum({
      title: newTitle.trim(),
      area: newArea,
      description: newDescription.trim() || 'User-created curriculum',
      modules: [
        {
          id: 'module-1',
          title: 'Module 1',
          lessons: [
            {
              id: 'lesson-1',
              type: 'read',
              title: 'Getting started',
              instructions: 'Add lessons by editing this curriculum.',
              estimatedMinutes: 5,
              objectives: [],
              hints: [],
              requiredTools: []
            }
          ]
        }
      ],
      requiredTools: [],
      offline: true
    })
    setCreating(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setCurricula((prev) => [...prev, result.data])
    setCreateOpen(false)
    setNewTitle('')
    setNewDescription('')
    setNewArea('other')
  }

  function startCurriculum(curriculum: Curriculum): void {
    const next = firstIncompleteLesson(curriculum, progress)
    if (!next) return
    navigate(`/learn/lab/${curriculum.id}/${next.moduleId}/${next.lessonId}`)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-body text-text-secondary">
        Loading learning catalog…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display font-semibold text-text-primary">Learning Hub</h1>
          <p className="text-body text-text-secondary">
            Curricula, labs, and guided practice. Everything here works offline.
          </p>
        </div>
        <ControllerButton variant="primary" onClick={() => setCreateOpen(true)}>
          Create curriculum
        </ControllerButton>
      </div>

      {error && <ErrorState title="Could not load catalog" description={error} />}

      <div className="flex flex-wrap gap-2">
        <ControllerButton
          variant={selectedArea === 'all' ? 'primary' : 'secondary'}
          onClick={() => setSelectedArea('all')}
        >
          All
        </ControllerButton>
        {AREAS.map((area) => (
          <ControllerButton
            key={area}
            variant={selectedArea === area ? 'primary' : 'secondary'}
            onClick={() => setSelectedArea(area)}
          >
            {AREA_LABELS[area]}
          </ControllerButton>
        ))}
      </div>

      {filteredCurricula.length === 0 ? (
        <EmptyState
          title="No curricula yet"
          description="Create your own curriculum or check back when more bundled content is available."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 overflow-auto md:grid-cols-2 lg:grid-cols-3">
          {filteredCurricula.map((curriculum, index) => (
            <CurriculumCard
              key={curriculum.id}
              curriculum={curriculum}
              progress={progress}
              index={index}
              onStart={() => startCurriculum(curriculum)}
            />
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create curriculum">
        <div className="flex flex-col gap-4">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Curriculum title"
            className="rounded-md border border-border bg-canvas p-3 text-body text-text-primary"
          />
          <select
            value={newArea}
            onChange={(event) => setNewArea(event.target.value as LearningArea)}
            className="rounded-md border border-border bg-canvas p-3 text-body text-text-primary"
          >
            {AREAS.map((area) => (
              <option key={area} value={area}>
                {AREA_LABELS[area]}
              </option>
            ))}
          </select>
          <textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="rounded-md border border-border bg-canvas p-3 text-body text-text-primary"
          />
          <div className="flex justify-end gap-2">
            <ControllerButton variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </ControllerButton>
            <ControllerButton
              variant="primary"
              disabled={creating || !newTitle.trim()}
              onClick={() => void handleCreate()}
            >
              {creating ? 'Creating…' : 'Create'}
            </ControllerButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
