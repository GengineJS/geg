import { config } from '../config/config.js'
import { isPromise } from './tools.js'
import { pushTarget, popTarget } from '../observer/dep.js'
export function handleError (err, vm, info) {
    // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
    // See: https://github.com/vuejs/vuex/issues/1505
    pushTarget()
    try {
        if (vm) {
            let cur = vm
            while ((cur = cur.$parent)) {
                const hooks = cur.$options.errorCaptured
                if (hooks) {
                    for (let i = 0; i < hooks.length; i++) {
                        try {
                            const capture = hooks[i].call(cur, err, vm, info) === false
                            if (capture) return
                        } catch (e) {
                            globalHandleError(e, cur, 'errorCaptured hook')
                        }
                    }
                }
            }
        }
        globalHandleError(err, vm, info)
    } finally {
        popTarget()
    }
}
export function invokeWithErrorHandling (
    handler,
    context,
    args,
    gm,
    info
) {
    let res
    try {
        res = args ? handler.apply(context, args) : handler.call(context)
        if (res && !res._isGengine && isPromise(res) && !res._handled) {
            res.catch(e => handleError(e, gm, info + ` (Promise/async)`))
            // issue #9511
            // avoid catch triggering multiple times when nested calls
            res._handled = true
        }
    } catch (e) {
        handleError(e, gm, info)
    }
    return res
}
function globalHandleError (err, vm, info) {
    if (config.errorHandler) {
        try {
            return config.errorHandler.call(null, err, vm, info)
        } catch (e) {
            // if the user intentionally throws the original error in the handler,
            // do not log it twice
            if (e !== err) {
                logError(e, null, 'config.errorHandler')
            }
        }
    }
    logError(err, vm, info)
}
function logError (err, gm, info) {
    /* istanbul ignore else */
    if (typeof console !== 'undefined') {
        console.error(err)
    } else {
        throw err
    }
}