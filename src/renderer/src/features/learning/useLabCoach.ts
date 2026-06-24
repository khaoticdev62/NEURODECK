import { useEffect, useState } from 'react'
import type { Curriculum, Lesson, ModelProvider } from '@shared/contracts'
import { completeModel, listModelProviders } from '../../services/ipc/modelClient'

export interface CoachState {
  enabled: boolean
  reason: string | null
  loading: boolean
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export function useLabCoach(
  curriculum: Curriculum | null,
  moduleId: string | null,
  lesson: Lesson | null,
  recentCommands: string[]
): {
  state: CoachState
  ask: (question: string) => Promise<void>
} {
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    []
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    void listModelProviders().then((result) => {
      if (!active) return
      setLoadingProviders(false)
      if (result.ok) {
        setProviders(result.data)
      }
    })
    return () => {
      active = false
    }
  }, [curriculum?.id, moduleId, lesson?.id])

  const enabled = providers.some((p) => p.enabled)
  const reason = loadingProviders
    ? 'Checking available AI providers…'
    : enabled
      ? null
      : 'No AI provider is configured or enabled.'

  async function ask(question: string): Promise<void> {
    if (!enabled || !lesson) return
    setLoading(true)
    const userMessage = question.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    const systemPrompt = buildCoachPrompt(curriculum, moduleId, lesson, recentCommands)
    const result = await completeModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      profileId: 'balanced',
      workspacePrivate: false,
      temperature: 0.2,
      maxTokens: 1024
    })

    setLoading(false)
    if (!result.ok) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Coach could not respond: ${result.error.userMessage}` }
      ])
      return
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: result.data.content.trim() }])
  }

  return {
    state: {
      enabled,
      reason,
      loading: loading || loadingProviders,
      messages
    },
    ask
  }
}

function buildCoachPrompt(
  curriculum: Curriculum | null,
  moduleId: string | null,
  lesson: Lesson,
  recentCommands: string[]
): string {
  const context = curriculum
    ? `Curriculum: ${curriculum.title}. Module: ${moduleId ?? 'unknown'}. Lesson: ${lesson.title}.`
    : `Lesson: ${lesson.title}.`
  const objectives = lesson.objectives.map((o) => `- ${o.text}`).join('\n')
  const commands =
    recentCommands.length > 0
      ? recentCommands.slice(-10).join('\n')
      : 'No commands have been run yet.'

  return `${context}

Lesson instructions:
${lesson.instructions}

Objectives:
${objectives || 'No specific objectives for this lesson.'}

Recent terminal commands:
${commands}

You are an AI coach for a hands-on learning lab. Give hints before direct answers. Prefer short, practical guidance. Do not claim the learner has completed an objective unless real validation confirms it. If the user asks something unrelated to the lesson, steer them back gently.`
}
