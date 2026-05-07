import { config, GuiGroupNames } from '@l.x/ui/src/gui.config'

type Conf = typeof config

declare module '@hanzo/gui' {
  // oxlint-disable-next-line typescript/no-empty-interface
  interface GuiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): GuiGroupNames
  }
}
