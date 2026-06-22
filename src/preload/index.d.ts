import type { NdxBridge } from '../shared/contracts'

declare global {
  interface Window {
    ndx: NdxBridge
  }
}
