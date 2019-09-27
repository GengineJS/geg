/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index.js'

import modules from './modules/index.js'
import directives from './directives/index.js'
import { genStaticKeys } from '../../../core/utils/tools.js'
import { isUnaryTag, canBeLeftOpenTag } from './util.js'

export const baseOptions = {
  expectHTML: true,
  modules,
  directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules)
}
