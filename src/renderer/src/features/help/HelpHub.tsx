import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_DEFINITIONS } from '../../app/routing/routes'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxSpatialLockup } from '../../components/workbench'
import { buildHelpTopics, searchHelpTopics, type HelpTopic } from './helpContent'

export function HelpHub(): React.JSX.Element {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const topics = useMemo(() => buildHelpTopics(ROUTE_DEFINITIONS), [])
  const filtered = useMemo(() => searchHelpTopics(topics, query), [topics, query])

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <p className="text-title font-semibold text-text-primary">Help Hub</p>
        <p className="text-meta text-text-secondary">
          Route-aware help generated from the real NeuroDeck screen registry.
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search screens, epics, routes..."
        className="rounded-sm border border-border bg-surface-raised px-3 py-2 text-body text-text-primary outline-none focus-visible:border-border-focus"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((topic) => (
          <HelpTopicCard
            key={topic.id}
            topic={topic}
            onOpen={() => navigate(topic.path.includes(':') ? '/help' : topic.path)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-meta text-text-secondary">No help topics match this search.</p>
      )}
    </div>
  )
}

function HelpTopicCard({
  topic,
  onOpen
}: {
  topic: HelpTopic
  onOpen: () => void
}): React.JSX.Element {
  return (
    <NdxSpatialLockup>
      <section className="flex h-full flex-col gap-2">
        <div>
          <p className="text-body font-semibold text-text-primary">{topic.title}</p>
          <p className="text-meta text-text-tertiary">
            {topic.screenId ?? 'Route'} · {topic.owningEpic} · {topic.path}
          </p>
        </div>
        <p className="text-meta text-text-secondary">{topic.summary}</p>
        <div className="flex flex-wrap gap-1">
          {topic.controllerActions.map((action) => (
            <span
              key={action}
              className="rounded-sm border border-border bg-surface-raised px-2 py-1 text-meta text-text-secondary"
            >
              {action}
            </span>
          ))}
        </div>
        <p className="text-meta text-text-tertiary">{topic.restoreBehavior}</p>
        <ControllerButton variant="secondary" onClick={onOpen}>
          Open screen
        </ControllerButton>
      </section>
    </NdxSpatialLockup>
  )
}
