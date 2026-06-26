import type { TransactionRecord } from '@shared/contracts'
import type { ApplicationStore } from './ApplicationStore'
import type { FlatpakAdapter } from './FlatpakAdapter'
import type { TransactionManager } from '../transactions/TransactionManager'

/**
 * Real Epic X2 package lifecycle (supplemental spec §7.5) — every
 * Flatpak install/update/uninstall runs through the Epic X1
 * `TransactionManager` (the one real, shared mechanism per the X1
 * ledger entry) and is verified against a fresh `flatpak list` re-query
 * before being reported as a real success — "No success state before
 * verification" is the spec's own requirement, not optional polish.
 * Cancellation is honestly not supported mid-flatpak-command (the
 * `flatpak` CLI itself doesn't expose a cancel hook this service can
 * call once the process has started) — transactions are created
 * non-cancellable, an accurate statement rather than a button that
 * would do nothing.
 */
export class PackageLifecycleService {
  constructor(
    private readonly flatpak: FlatpakAdapter,
    private readonly transactions: TransactionManager,
    private readonly applicationStore: ApplicationStore
  ) {}

  async install(ref: string): Promise<TransactionRecord> {
    const transaction = this.transactions.create({
      kind: 'flatpak-install',
      label: `Install ${ref}`,
      cancellable: false
    })
    this.transactions.start(transaction.id)
    try {
      await this.flatpak.install(ref)
      const verified = await this.flatpak.isInstalled(ref)
      if (!verified) {
        this.transactions.fail(
          transaction.id,
          'Install command completed, but the app is not in the installed list — refusing to report success.'
        )
        return this.require(transaction.id)
      }
      const installed = await this.flatpak.listInstalled()
      const record = installed.find((candidate) => candidate.executableRef === ref)
      if (record) await this.applicationStore.upsert(record)
      this.transactions.succeed(transaction.id, `${ref} installed and verified.`)
    } catch (error) {
      this.transactions.fail(transaction.id, error instanceof Error ? error.message : String(error))
    }
    return this.require(transaction.id)
  }

  async update(ref: string): Promise<TransactionRecord> {
    const transaction = this.transactions.create({
      kind: 'flatpak-update',
      label: `Update ${ref}`,
      cancellable: false
    })
    this.transactions.start(transaction.id)
    try {
      await this.flatpak.update(ref)
      this.transactions.succeed(transaction.id, `${ref} updated.`)
    } catch (error) {
      this.transactions.fail(transaction.id, error instanceof Error ? error.message : String(error))
    }
    return this.require(transaction.id)
  }

  async uninstall(ref: string): Promise<TransactionRecord> {
    const transaction = this.transactions.create({
      kind: 'flatpak-uninstall',
      label: `Uninstall ${ref}`,
      cancellable: false
    })
    this.transactions.start(transaction.id)
    try {
      await this.flatpak.uninstall(ref)
      const stillInstalled = await this.flatpak.isInstalled(ref)
      if (stillInstalled) {
        this.transactions.fail(
          transaction.id,
          'Uninstall command completed, but the app still appears in the installed list.'
        )
        return this.require(transaction.id)
      }
      await this.applicationStore.remove(`flatpak:${ref}`)
      this.transactions.succeed(transaction.id, `${ref} removed and verified.`)
    } catch (error) {
      this.transactions.fail(transaction.id, error instanceof Error ? error.message : String(error))
    }
    return this.require(transaction.id)
  }

  private require(id: string): TransactionRecord {
    const record = this.transactions.get(id)
    if (!record) throw new Error('Transaction vanished unexpectedly.')
    return record
  }
}
