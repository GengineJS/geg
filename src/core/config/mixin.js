import { mergeOptions } from '../utils/index.js'

export function initMixin (Gengine) {
    Gengine.mixin = function (mixin) {
        this.options = mergeOptions(this.options, mixin)
        return this
    }
}
