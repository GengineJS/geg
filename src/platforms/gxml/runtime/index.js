/* @flow */

import Gengine from '../../../core/index.js'
import { config } from '../../../core/config/config.js'
import { extend } from '../../../core/utils/index.js'
import { mountComponent } from '../../../core/base/lifecycle.js'
import { devtools, inBrowser } from '../../../core/utils/env.js'

import {
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from '../util/index.js'

import { patch } from './patch.js'
import platformDirectives from './directives/index.js'
import platformComponents from './components/index.js'

// install platform specific utils
Gengine.config.mustUseProp = mustUseProp
Gengine.config.isReservedTag = isReservedTag
Gengine.config.isReservedAttr = isReservedAttr
Gengine.config.getTagNamespace = getTagNamespace
Gengine.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
extend(Gengine.options.directives, platformDirectives)
extend(Gengine.options.components, platformComponents)

// install platform patch function
Gengine.prototype.__patch__ = patch

// public mount method
Gengine.prototype.$mount = function (
  el,
  hydrating
) {
  // el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Gengine)
      }
    }
  }, 0)
}

export default Gengine
