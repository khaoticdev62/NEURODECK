import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxSpatialLockup } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { faceButtonGlyph } from '../../controller/mappings/controllerGlyphs'
import type { ControllerAction } from '../../controller/adapters/controllerAction'
import { useAiSafety } from '../../ai-safety/useAiSafety'

const TOTAL_LESSONS = 7

interface Lesson {
  title: string
  instruction: string
  waitingAction?: ControllerAction | 'nav.*'
}

const LESSONS: Lesson[] = [
  {
    title: '1. Move focus',
    instruction: 'Press up, down, left, or right to move the highlight around the grid.',
    waitingAction: 'nav.*'
  },
  {
    title: '2. Open and go back',
    instruction: 'Highlight Open and press confirm to open it, then press back to return.',
    waitingAction: 'confirm'
  },
  {
    title: '3. Object actions',
    instruction: 'Highlight the item and press the object-actions button (X / Square).',
    waitingAction: 'context'
  },
  {
    title: '4. Ask AI',
    instruction: 'Highlight the item and press the Ask-AI button (Y / Triangle).',
    waitingAction: 'assist'
  },
  {
    title: '5. Open Command Palette',
    instruction: 'Press the Menu button (or M) to open the Command Palette.',
    waitingAction: 'commands'
  },
  {
    title: '6. Approve a harmless plan',
    instruction: 'Review the harmless step and press confirm to approve it.'
  },
  {
    title: '7. Pause and resume',
    instruction: 'A simulated task is running. Press confirm to pause it, then again to resume.'
  }
]

type LessonState = 'instruction' | 'waiting' | 'completed'

/**
 * ND-007 Guided Controller Tutorial. A self-contained, seven-lesson walkthrough
 * of the controller actions used throughout NeuroDeck. Lessons 1–5 observe real
 * controller events; lesson 6 submits a harmless tool through the real ActionQueue
 * approval pipeline; lesson 7 toggles a simulated task pause/resume.
 */
interface TutorialTiming {
  advanceDelayMs: number
  progressIntervalMs: number
  progressStep: number
}

function getTutorialTiming(): TutorialTiming {
  return {
    advanceDelayMs: Number(import.meta.env.VITE_TUTORIAL_ADVANCE_MS ?? 1200),
    progressIntervalMs: Number(import.meta.env.VITE_TUTORIAL_PROGRESS_INTERVAL_MS ?? 100),
    progressStep: Number(import.meta.env.VITE_TUTORIAL_PROGRESS_STEP ?? 2)
  }
}

export function GuidedControllerTutorial(): React.JSX.Element {
  const { advanceDelayMs, progressIntervalMs, progressStep } = getTutorialTiming()
  const navigate = useNavigate()
  const { controllerKind, haptics, onAction, subscribe } = useFocusEngine()
  const { queue } = useAiSafety()
  const [lessonIndex, setLessonIndex] = useState(0)
  const [lessonState, setLessonState] = useState<LessonState>('waiting')
  const [isPaused, setIsPaused] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const actionIdRef = useRef<string | null>(null)

  const completeLesson = useCallback(() => {
    setLessonState('completed')
    void haptics.trigger(0, 'success')
    window.setTimeout(() => {
      const next = Math.min(lessonIndex + 1, TOTAL_LESSONS - 1)
      setLessonIndex(next)
      setLessonState(next === TOTAL_LESSONS - 1 ? 'completed' : 'waiting')
      setDetailOpen(false)
      setResultMessage(null)
      actionIdRef.current = null
    }, advanceDelayMs)
  }, [haptics, lessonIndex, advanceDelayMs])

  const handleAction = useCallback(
    (action: ControllerAction) => {
      if (lessonState !== 'waiting') return
      const lesson = LESSONS[lessonIndex]
      if (!lesson.waitingAction) return

      if (lesson.waitingAction === 'nav.*' && action.startsWith('nav.')) {
        completeLesson()
      } else if (lesson.waitingAction === action) {
        if (lessonIndex === 1 && !detailOpen) {
          setDetailOpen(true)
          setLessonState('instruction')
        } else {
          completeLesson()
        }
      }
    },
    [lessonIndex, lessonState, detailOpen, completeLesson]
  )

  useEffect(() => {
    return onAction((event) => {
      if (event.phase !== 'press') return
      handleAction(event.action)
    })
  }, [onAction, handleAction])

  useEffect(() => {
    return subscribe('back', () => {
      if (detailOpen) {
        setDetailOpen(false)
        setLessonState('waiting')
        completeLesson()
        return
      }
      if (lessonIndex > 0) {
        setLessonIndex((idx) => idx - 1)
        setLessonState('instruction')
        setDetailOpen(false)
      } else {
        navigate('/')
      }
    })
  }, [subscribe, detailOpen, lessonIndex, navigate, completeLesson])

  useEffect(() => {
    if (lessonIndex !== 6 || lessonState === 'completed') return
    if (isPaused) return
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          window.clearInterval(id)
          completeLesson()
          return 100
        }
        return Math.min(p + progressStep, 100)
      })
    }, progressIntervalMs)
    return () => window.clearInterval(id)
  }, [lessonIndex, lessonState, isPaused, completeLesson, progressIntervalMs, progressStep])

  const submitTutorialAction = useCallback(() => {
    const result = queue.submit('tutorial:acknowledge')
    if (result.ok) {
      actionIdRef.current = result.record.action.id
      queue.approve(result.record.action.id)
      setResultMessage('Approved and executed a harmless tutorial action.')
      completeLesson()
    } else {
      setResultMessage(result.error)
    }
  }, [queue, completeLesson])

  const togglePause = useCallback(() => {
    setIsPaused((p) => !p)
  }, [])

  const finish = useCallback(() => {
    navigate('/')
  }, [navigate])

  const lesson = LESSONS[lessonIndex]
  const confirmGlyph = faceButtonGlyph(controllerKind, 0)
  const backGlyph = faceButtonGlyph(controllerKind, 1)
  const contextGlyph = faceButtonGlyph(controllerKind, 2)
  const assistGlyph = faceButtonGlyph(controllerKind, 3)

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Controller Tutorial</p>
        <div className="flex gap-1">
          {LESSONS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full ${idx === lessonIndex ? 'bg-status-info' : idx < lessonIndex ? 'bg-text-secondary' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>

      <NdxEditorShell title="ND-007 Guided Controller Tutorial">
        <div className="flex min-h-full flex-col gap-4 p-5">
          <NdxSpatialLockup selected>
            <div>
              <p className="text-display font-semibold text-text-primary">{lesson.title}</p>
              <p className="mt-2 text-body text-text-secondary">{lesson.instruction}</p>
            </div>
          </NdxSpatialLockup>

          <div>
            {lessonIndex === 0 && <FocusGrid />}
            {lessonIndex === 1 && (
              <OpenBackLesson detailOpen={detailOpen} onOpen={() => setDetailOpen(true)} />
            )}
            {lessonIndex === 2 && (
              <ActionItemLesson label="Press X for actions" actionGlyph={contextGlyph} />
            )}
            {lessonIndex === 3 && (
              <ActionItemLesson label="Press Y to ask AI" actionGlyph={assistGlyph} />
            )}
            {lessonIndex === 4 && <CommandPaletteLesson />}
            {lessonIndex === 5 && (
              <ApproveLesson resultMessage={resultMessage} onApprove={submitTutorialAction} />
            )}
            {lessonIndex === 6 && (
              <PauseLesson progress={progress} isPaused={isPaused} onTogglePause={togglePause} />
            )}
          </div>

          {lessonState === 'completed' && (
            <p className="mt-4 text-body text-status-success">Lesson complete — great work!</p>
          )}
        </div>
      </NdxEditorShell>

      <div className="flex items-center justify-between text-meta text-text-secondary">
        <p>
          {confirmGlyph} Confirm · {backGlyph} Back
        </p>
        {lessonIndex === TOTAL_LESSONS - 1 && lessonState === 'completed' ? (
          <ControllerButton variant="primary" onClick={finish}>
            Finish
          </ControllerButton>
        ) : (
          <ControllerButton variant="ghost" onClick={finish}>
            Skip tutorial
          </ControllerButton>
        )}
      </div>
    </div>
  )
}

function FocusGrid(): React.JSX.Element {
  const cells = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right']
  return (
    <div className="grid grid-cols-2 gap-3">
      {cells.map((label, idx) => (
        <GridCell key={label} id={`focus-grid:${idx}`} label={label} />
      ))}
    </div>
  )
}

function GridCell({ id, label }: { id: string; label: string }): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLDivElement>({
    id,
    groupId: 'tutorial',
    priority: 1,
    initialFocus: id === 'focus-grid:0',
    onActivate: () => undefined
  })

  return (
    <NdxSpatialLockup selected={isFocused}>
      <div
        ref={ref}
        tabIndex={-1}
        className="flex h-24 items-center justify-center text-body text-text-primary"
      >
        {label}
      </div>
    </NdxSpatialLockup>
  )
}

function OpenBackLesson({
  detailOpen,
  onOpen
}: {
  detailOpen: boolean
  onOpen: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: 'tutorial:open-button',
    groupId: 'tutorial',
    priority: 1,
    initialFocus: true,
    onActivate: onOpen
  })

  if (detailOpen) {
    return (
      <div className="rounded-lg border border-border-focus bg-surface-raised p-6">
        <p className="text-body font-semibold text-text-primary">Detail view</p>
        <p className="text-meta text-text-secondary">Press Back to return to the tutorial.</p>
      </div>
    )
  }

  return (
    <ControllerButton
      ref={ref}
      variant="primary"
      className={isFocused ? 'ring-2 ring-border-focus' : undefined}
      onClick={onOpen}
    >
      Open
    </ControllerButton>
  )
}

function ActionItemLesson({
  label,
  actionGlyph
}: {
  label: string
  actionGlyph: string
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLDivElement>({
    id: `tutorial:action-item`,
    groupId: 'tutorial',
    priority: 1,
    initialFocus: true,
    onActivate: () => undefined
  })

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`flex items-center justify-between rounded-lg border p-4 ${isFocused ? 'border-border-focus bg-surface-raised' : 'border-border'}`}
    >
      <span className="text-body text-text-primary">{label}</span>
      <span className="text-meta text-text-secondary">{actionGlyph}</span>
    </div>
  )
}

function CommandPaletteLesson(): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-body text-text-secondary">
        The Command Palette opens from anywhere in NeuroDeck. Try it now.
      </p>
    </div>
  )
}

function ApproveLesson({
  resultMessage,
  onApprove
}: {
  resultMessage: string | null
  onApprove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: 'tutorial:approve-button',
    groupId: 'tutorial',
    priority: 1,
    initialFocus: true,
    onActivate: onApprove
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <p className="text-body font-semibold text-text-primary">Harmless tutorial action</p>
        <p className="text-meta text-text-secondary">
          This action does nothing permanent. It only demonstrates the approval flow.
        </p>
      </div>
      <ControllerButton
        ref={ref}
        variant="primary"
        className={isFocused ? 'ring-2 ring-border-focus' : undefined}
        onClick={onApprove}
      >
        Approve
      </ControllerButton>
      {resultMessage && <p className="text-meta text-status-success">{resultMessage}</p>}
    </div>
  )
}

function PauseLesson({
  progress,
  isPaused,
  onTogglePause
}: {
  progress: number
  isPaused: boolean
  onTogglePause: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: 'tutorial:pause-button',
    groupId: 'tutorial',
    priority: 1,
    initialFocus: true,
    onActivate: onTogglePause
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="h-4 rounded-full bg-border">
        <div
          className="h-4 rounded-full bg-status-info transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ControllerButton
        ref={ref}
        variant={isPaused ? 'secondary' : 'primary'}
        className={isFocused ? 'ring-2 ring-border-focus' : undefined}
        onClick={onTogglePause}
      >
        {isPaused ? 'Resume' : 'Pause'}
      </ControllerButton>
    </div>
  )
}
