/* @flow */

import { ASSET_TYPES } from './constants.js'
import { isPlainObject } from '../utils/index.js'

export function initAssetRegisters (Gengine) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach((type) => {
    Gengine[type] = function (
      id,
      definition
    ) {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
