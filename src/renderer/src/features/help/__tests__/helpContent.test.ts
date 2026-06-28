import { describe, expect, it } from 'vitest'
import type { RouteDefinition } from '../../../app/routing/routes'
import { buildHelpTopics, findHelpTopicForPath, searchHelpTopics } from '../helpContent'

const routes: RouteDefinition[] = [
  {
    routeId: 'home',
    screenId: 'ND-008',
    path: '/',
    title: 'Home',
    owningEpic: 'Epic 3',
    controllerHints: [{ glyph: 'A', label: 'Select' }],
    restoreOnRevisit: true
  },
  {
    routeId: 'agent-detail',
    screenId: 'ND-017',
    path: '/agents/:agentId',
    title: 'Agent Detail',
    owningEpic: 'Epic 8',
    controllerHints: [{ glyph: 'B', label: 'Back' }],
    restoreOnRevisit: false
  },
  {
    routeId: 'boot',
    screenId: 'ND-001',
    path: '/boot',
    title: 'Boot',
    owningEpic: 'Epic 3',
    controllerHints: [],
    restoreOnRevisit: false
  }
]

describe('helpContent', () => {
  it('builds topics from real route metadata and excludes boot', () => {
    const topics = buildHelpTopics(routes)

    expect(topics.map((topic) => topic.id)).toEqual(['home', 'agent-detail'])
    expect(topics[0].summary).toContain('ND-008')
    expect(topics[0].controllerActions).toEqual(['A: Select'])
  })

  it('matches parameterized routes for context help', () => {
    const topic = findHelpTopicForPath(routes, '/agents/agent-1')

    expect(topic?.id).toBe('agent-detail')
    expect(topic?.restoreBehavior).toBe('Does not restore state when revisited.')
  })

  it('searches by title, path, epic, and screen id', () => {
    const topics = buildHelpTopics(routes)

    expect(searchHelpTopics(topics, 'ND-017')).toHaveLength(1)
    expect(searchHelpTopics(topics, 'Epic 8')[0].id).toBe('agent-detail')
    expect(searchHelpTopics(topics, 'missing')).toEqual([])
  })
})
