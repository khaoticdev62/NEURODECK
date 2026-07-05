import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxFocusSurface, NdxToolWindow } from '../../components/workbench'
import { WorkspaceRequiredState } from '../workspaces/WorkspaceRequiredState'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { getCurriculum, getProgress, updateProgress } from '../../services/ipc/learningClient'
import { LabTerminal } from './LabTerminal'
import { useLabCoach } from './useLabCoach'
import type { Curriculum, CurriculumProgress, Lesson } from '@shared/contracts'

function findNextLesson(
  curriculum: Curriculum,
  moduleId: string,
  lessonId: string
): { moduleId: string; lessonId: string } | null {
  let found = false
  for (const module of curriculum.modules) {
    for (const lesson of module.lessons) {
      if (found) return { moduleId: module.id, lessonId: lesson.id }
      if (module.id === moduleId && lesson.id === lessonId) found = true
    }
  }
  return null
}

function getLessonStatus(
  curriculumId: string,
  moduleId: string,
  lessonId: string,
  progress: CurriculumProgress
): string {
  return progress[curriculumId]?.[moduleId]?.[lessonId] ?? 'not_started'
}

function LessonInstructions({ lesson }: { lesson: Lesson }): React.JSX.Element {
  const paragraphs = lesson.instructions.split('\n\n')
  return (
    <div className="flex flex-col gap-3 text-body text-text-primary">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  )
}

export function GuidedLab(): React.JSX.Element {
  const navigate = useNavigate()
  const { curriculumId, moduleId, lessonId } = useParams<{
    curriculumId: string
    moduleId: string
    lessonId: string
  }>()
  const { activeWorkspace } = useWorkspaces()

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [progress, setProgress] = useState<CurriculumProgress>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const [coachInput, setCoachInput] = useState('')

  useEffect(() => {
    if (!curriculumId) return
    let active = true
    void Promise.all([getCurriculum({ curriculumId }), getProgress()]).then(
      ([curriculumResult, progressResult]) => {
        if (!active) return
        setLoading(false)
        if (!curriculumResult.ok) {
          setError(curriculumResult.error.userMessage)
          return
        }
        if (!progressResult.ok) {
          setError(progressResult.error.userMessage)
          return
        }
        setCurriculum(curriculumResult.data)
        setProgress(progressResult.data)
        setError(null)
      }
    )
    return () => {
      active = false
    }
  }, [curriculumId])

  const { currentModule, currentLesson } = useMemo(() => {
    if (!curriculum || !moduleId || !lessonId) {
      return { currentModule: null, currentLesson: null }
    }
    const module = curriculum.modules.find((m) => m.id === moduleId)
    const lesson = module?.lessons.find((l) => l.id === lessonId)
    return { currentModule: module ?? null, currentLesson: lesson ?? null }
  }, [curriculum, moduleId, lessonId])

  const { state: coach, ask } = useLabCoach(
    curriculum,
    moduleId ?? null,
    currentLesson,
    recentCommands
  )

  const handleTerminalData = useCallback((data: string) => {
    const lines = data.split('\n')
    setRecentCommands((prev) => {
      const next = [...prev]
      for (const line of lines) {
        const trimmed = line.trim()
        if (
          trimmed &&
          !trimmed.startsWith('$') &&
          !trimmed.startsWith('#') &&
          !trimmed.includes(' ')
        ) {
          // Best-effort command extraction: keep short lines that look like user input.
          next.push(trimmed)
        } else if (trimmed.startsWith('$') || trimmed.startsWith('#')) {
          next.push(trimmed.replace(/^[$#]\s*/, ''))
        }
      }
      return next.slice(-50)
    })
  }, [])

  async function handleMarkComplete(): Promise<void> {
    if (!curriculum || !moduleId || !lessonId) return
    setMarking(true)
    const result = await updateProgress({
      curriculumId: curriculum.id,
      moduleId,
      lessonId,
      status: 'completed'
    })
    setMarking(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setProgress(result.data)
    const next = findNextLesson(curriculum, moduleId, lessonId)
    if (next) {
      navigate(`/learn/lab/${curriculum.id}/${next.moduleId}/${next.lessonId}`)
    } else {
      navigate('/learn')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-body text-text-secondary">
        Loading lab…
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Lab error" description={error} />
  }

  if (!curriculum || !currentModule || !currentLesson) {
    return (
      <EmptyState
        title="Lesson not found"
        description="The requested lesson does not exist in this curriculum."
      />
    )
  }

  const lessonStatus = getLessonStatus(curriculum.id, currentModule.id, currentLesson.id, progress)
  const completed = lessonStatus === 'completed'

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/learn')}
            className="text-meta text-text-secondary hover:text-text-primary"
          >
            ← Learning Hub
          </button>
          <h1 className="text-title font-semibold text-text-primary">
            {curriculum.title} — {currentModule.title}
          </h1>
          <p className="text-body text-text-secondary">{currentLesson.title}</p>
        </div>
        <ControllerButton
          variant="primary"
          disabled={completed || marking}
          onClick={() => void handleMarkComplete()}
        >
          {completed ? 'Completed' : marking ? 'Saving…' : 'Mark complete'}
        </ControllerButton>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)_20rem]">
        {/* Instruction pane */}
        <NdxToolWindow title="Instructions" subtitle={currentModule.title}>
          <LessonInstructions lesson={currentLesson} />

          {currentLesson.hints.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-meta font-semibold uppercase tracking-wider text-text-tertiary">
                Hints
              </h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-meta text-text-secondary">
                {currentLesson.hints.map((hint) => (
                  <li key={hint.id}>{hint.text}</li>
                ))}
              </ul>
            </div>
          )}
        </NdxToolWindow>

        {/* Terminal pane */}
        <NdxEditorShell title="Lab terminal">
          <div className="flex h-full min-h-0 flex-col p-3">
            {!activeWorkspace ? (
              <WorkspaceRequiredState purpose="run this lab's terminal" />
            ) : (
              <LabTerminal
                workspaceId={activeWorkspace.id}
                relativeCwd={currentLesson.cwd}
                setupCommand={currentLesson.setupCommand}
                onData={handleTerminalData}
              />
            )}
          </div>
        </NdxEditorShell>

        {/* Objectives / validation / coach */}
        <section className="flex min-h-0 flex-col gap-4 overflow-auto">
          <NdxFocusSurface density="comfortable" className="p-4">
            <h2 className="text-body font-semibold text-text-primary">Objectives</h2>
            {currentLesson.objectives.length === 0 ? (
              <p className="text-meta text-text-secondary">No objectives for this lesson.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {currentLesson.objectives.map((objective) => (
                  <li
                    key={objective.id}
                    className="flex items-start gap-2 text-meta text-text-secondary"
                  >
                    <span
                      className={`mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded-full border ${
                        completed ? 'bg-status-success border-status-success' : 'border-border'
                      }`}
                    />
                    <span className={completed ? 'text-status-success line-through' : ''}>
                      {objective.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </NdxFocusSurface>

          <NdxFocusSurface density="comfortable" className="p-4">
            <h2 className="text-body font-semibold text-text-primary">Validation</h2>
            <p className="mt-2 text-meta text-text-secondary">
              Automated lab validation is not implemented yet. Mark the lesson complete manually
              once you have met the objectives yourself.
            </p>
          </NdxFocusSurface>

          <NdxFocusSurface density="comfortable" className="flex min-h-0 flex-col gap-2 p-4">
            <h2 className="text-body font-semibold text-text-primary">AI coach</h2>
            {coach.reason ? (
              <p className="text-meta text-text-secondary">{coach.reason}</p>
            ) : (
              <>
                <div className="flex max-h-48 min-h-0 flex-col gap-2 overflow-auto">
                  {coach.messages.length === 0 && (
                    <p className="text-meta text-text-secondary">
                      Ask a question about this lesson. The coach gives hints, not answers.
                    </p>
                  )}
                  {coach.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`rounded-md p-2 text-meta ${
                        message.role === 'user'
                          ? 'bg-surface-raised/40 text-text-primary'
                          : 'bg-canvas text-text-secondary'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={coachInput}
                    onChange={(event) => setCoachInput(event.target.value)}
                    placeholder="Ask the coach…"
                    className="min-w-0 flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void ask(coachInput)
                        setCoachInput('')
                      }
                    }}
                  />
                  <ControllerButton
                    variant="primary"
                    disabled={coach.loading || !coachInput.trim()}
                    onClick={() => {
                      void ask(coachInput)
                      setCoachInput('')
                    }}
                  >
                    Ask
                  </ControllerButton>
                </div>
              </>
            )}
          </NdxFocusSurface>
        </section>
      </div>
    </div>
  )
}
