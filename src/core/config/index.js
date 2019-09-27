import { observe, set, del, defineReactive } from '../observer/index.js'
import { mergeOptions, extend, nextTick } from '../utils/index.js'
import builtInComponents from '../components/index.js'
import { initUse } from './use.js'
import { initMixin } from './mixin.js'
import { initExtend } from './extend.js'
import { initAssetRegisters } from './assets.js'
import { ASSET_TYPES} from './constants.js'
import { config } from './config.js'
export * from './constants.js'

function configurable(Gengine) {
    // config
    const configDef = {}
    configDef.get = () => config
    Object.defineProperty(Gengine, 'config', configDef)

    // exposed util methods.
    // NOTE: these are not considered part of the public API - avoid relying on
    // them unless you are aware of the risk.
    Gengine.util = {
        extend,
        mergeOptions,
        defineReactive
    }

    Gengine.set = set
    Gengine.delete = del
    Gengine.nextTick = nextTick

    // 2.6 explicit observable API
    Gengine.observable = (obj) => {
        observe(obj)
        return obj
    }

    Gengine.options = Object.create(null)
    ASSET_TYPES.forEach((type) => {
        Gengine.options[type + 's'] = Object.create(null)
    })

    // this is used to identify the "base" constructor to extend all plain-object
    // components with in Weex's multi-instance scenarios.
    Gengine.options._base = Gengine

    extend(Gengine.options.components, builtInComponents)
    initUse(Gengine)
    initMixin(Gengine)
    initExtend(Gengine)
    initAssetRegisters(Gengine)
}
export default configurable
