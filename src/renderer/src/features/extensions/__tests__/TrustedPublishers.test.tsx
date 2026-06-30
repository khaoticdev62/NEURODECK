import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, TrustedPublisherRecord } from '@shared/contracts'
import { TrustedPublishers } from '../TrustedPublishers'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const publisher: TrustedPublisherRecord = {
  fingerprint: 'abc123',
  publicKeyPem: '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----',
  publisherName: 'Demo Publisher',
  addedAt: 0,
  revoked: false
}

describe('TrustedPublishers', () => {
  it('shows an empty state when no publishers are trusted', async () => {
    stubBridge({
      trustedPublisher: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    render(<TrustedPublishers />)

    expect(await screen.findByText('No trusted publishers')).toBeInTheDocument()
  })

  it('lists real trusted publishers and toggles revocation', async () => {
    const revoke = vi.fn().mockResolvedValue({ ok: true, data: { ...publisher, revoked: true } })
    stubBridge({
      trustedPublisher: {
        list: vi
          .fn()
          .mockResolvedValueOnce({ ok: true, data: [publisher] })
          .mockResolvedValueOnce({ ok: true, data: [{ ...publisher, revoked: true }] }),
        revoke
      } as never
    })
    const user = userEvent.setup()

    render(<TrustedPublishers />)

    expect(await screen.findByText('Demo Publisher')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    expect(revoke).toHaveBeenCalledWith({ fingerprint: 'abc123' })
    expect(await screen.findByRole('button', { name: 'Unrevoke' })).toBeInTheDocument()
  })

  it('adds a new trusted publisher through the real form', async () => {
    const add = vi.fn().mockResolvedValue({ ok: true, data: publisher })
    stubBridge({
      trustedPublisher: {
        list: vi
          .fn()
          .mockResolvedValueOnce({ ok: true, data: [] })
          .mockResolvedValueOnce({ ok: true, data: [publisher] }),
        add
      } as never
    })
    const user = userEvent.setup()

    render(<TrustedPublishers />)
    await screen.findByText('No trusted publishers')

    await user.type(screen.getByLabelText('Publisher name'), 'Demo Publisher')
    await user.type(screen.getByLabelText('Public key (PEM)'), 'PEM-DATA')
    await user.click(screen.getByRole('button', { name: 'Add Trusted Publisher' }))

    expect(add).toHaveBeenCalledWith({ publisherName: 'Demo Publisher', publicKeyPem: 'PEM-DATA' })
    expect(await screen.findByText('Demo Publisher')).toBeInTheDocument()
  })
})
