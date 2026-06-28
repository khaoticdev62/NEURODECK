import { matchPath } from 'react-router-dom'
import type { RouteDefinition } from '../../app/routing/routes'

export interface HelpTopic {
  id: string
  title: string
  path: string
  screenId?: string
  owningEpic: string
  summary: string
  controllerActions: string[]
  restoreBehavior: string
}

export function buildHelpTopics(routes: RouteDefinition[]): HelpTopic[] {
  return routes
    .filter((route) => route.routeId !== 'boot')
    .map((route) => ({
      id: route.routeId,
      title: route.title,
      path: route.path,
      screenId: route.screenId,
      owningEpic: route.owningEpic,
      summary: `${route.title} is ${route.screenId ? `${route.screenId}, ` : ''}owned by ${route.owningEpic}. The screen uses the shared controller shell, typed IPC surfaces, and honest unavailable states for integrations that are not built yet.`,
      controllerActions: route.controllerHints.map((hint) => `${hint.glyph}: ${hint.label}`),
      restoreBehavior: route.restoreOnRevisit
        ? 'Restores screen state when revisited.'
        : 'Does not restore state when revisited.'
    }))
}

export function findHelpTopicForPath(
  routes: RouteDefinition[],
  pathname: string
): HelpTopic | null {
  const exact = routes.find((route) => route.path === pathname)
  if (exact && exact.routeId !== 'boot') return buildHelpTopics([exact])[0]

  const matched = routes.find(
    (route) =>
      route.routeId !== 'boot' &&
      matchPath({ path: route.path, end: true, caseSensitive: false }, pathname)
  )
  return matched ? buildHelpTopics([matched])[0] : null
}

export function searchHelpTopics(topics: HelpTopic[], query: string): HelpTopic[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return topics
  return topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(normalized) ||
      topic.path.toLowerCase().includes(normalized) ||
      topic.owningEpic.toLowerCase().includes(normalized) ||
      topic.screenId?.toLowerCase().includes(normalized)
  )
}
