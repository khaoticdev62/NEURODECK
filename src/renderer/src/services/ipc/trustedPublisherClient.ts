import type {
  AddTrustedPublisherRequest,
  NdxResult,
  TrustedPublisherFingerprintRequest,
  TrustedPublisherRecord
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listTrustedPublishers(): Promise<NdxResult<TrustedPublisherRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.trustedPublisher) return bridgeUnavailableError()
  return bridge.trustedPublisher.list()
}

export async function addTrustedPublisher(
  request: AddTrustedPublisherRequest
): Promise<NdxResult<TrustedPublisherRecord>> {
  const bridge = getNdxBridge()
  if (!bridge?.trustedPublisher) return bridgeUnavailableError()
  return bridge.trustedPublisher.add(request)
}

export async function revokeTrustedPublisher(
  request: TrustedPublisherFingerprintRequest
): Promise<NdxResult<TrustedPublisherRecord>> {
  const bridge = getNdxBridge()
  if (!bridge?.trustedPublisher) return bridgeUnavailableError()
  return bridge.trustedPublisher.revoke(request)
}

export async function unrevokeTrustedPublisher(
  request: TrustedPublisherFingerprintRequest
): Promise<NdxResult<TrustedPublisherRecord>> {
  const bridge = getNdxBridge()
  if (!bridge?.trustedPublisher) return bridgeUnavailableError()
  return bridge.trustedPublisher.unrevoke(request)
}
