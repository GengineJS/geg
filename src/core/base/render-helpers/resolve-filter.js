/* @flow */

import { identity, resolveAsset } from '../../utils/index.js'

/**
 * Runtime helper for resolving filters
 */
export function resolveFilter (id) {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
