import { NavigationRail } from '../navigation/NavigationRail'

export interface NdxActivityBarProps {
  hidden?: boolean
}

export function NdxActivityBar({ hidden = false }: NdxActivityBarProps): React.JSX.Element | null {
  return <NavigationRail hidden={hidden} />
}
