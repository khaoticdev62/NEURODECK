// Real, minimal fixture child process used only by ExtensionHost.test.ts —
// implements the same message protocol extensionHostEntry.ts uses
// ('init' -> 'activated'/'fault', 'capability-call' -> 'capability-result'),
// so the test exercises ExtensionHost's real fork()/IPC/fault-tracking
// logic against a genuinely separate Node process, not a mock.
process.on('message', (message) => {
  if (message.type === 'init') {
    if (message.entrypointMain === 'crash.js') {
      process.send({ type: 'fault', message: 'Simulated activation crash.' })
      return
    }
    if (message.entrypointMain === 'crash-twice.js') {
      process.send({ type: 'fault', message: 'Simulated activation crash.' })
      setTimeout(() => {
        process.send({ type: 'fault', message: 'Simulated activation crash.' })
      }, 20)
      return
    }
    if (message.entrypointMain === 'call-capability.js') {
      // A real extension making a real capability call right after
      // activation — exercises ExtensionHost's actual child->broker->child
      // round trip, not a mock.
      process.send({
        type: 'capability-call',
        requestId: 'req-1',
        capability: 'show-notification',
        method: 'show',
        args: { title: 'Hello from fixture' }
      })
      return
    }
    process.send({ type: 'activated' })
    return
  }

  if (message.type === 'capability-result') {
    // Re-broadcast what came back so the test can assert on the real
    // round-trip result this fixture received from the real host.
    process.send({ type: 'fixture-capability-result', received: message })
    return
  }

  if (message.type === 'deactivate') {
    process.exit(0)
  }
})
