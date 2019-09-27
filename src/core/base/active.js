import { pushTarget, popTarget } from '../observer/dep.js'
import { invokeWithErrorHandling } from '../utils/error.js'
function isInInactiveTree (gm) {
    while (gm && (gm = gm.$parent)) {
      if (gm._inactive) return true
    }
    return false
  }
  
export function activateChildComponent (gm, direct) {
    if (direct) {
      gm._directInactive = false
      if (isInInactiveTree(gm)) {
        return
      }
    } else if (gm._directInactive) {
      return
    }
    if (gm._inactive || gm._inactive === null) {
      gm._inactive = false
      for (let i = 0; i < gm.$children.length; i++) {
        activateChildComponent(gm.$children[i])
      }
      callHook(gm, 'activated')
    }
  }
  
export function deactivateChildComponent (gm, direct) {
    if (direct) {
      gm._directInactive = true
      if (isInInactiveTree(gm)) {
        return
      }
    }
    if (!gm._inactive) {
      gm._inactive = true
      for (let i = 0; i < gm.$children.length; i++) {
        deactivateChildComponent(gm.$children[i])
      }
      callHook(gm, 'deactivated')
    }
  }
  
export function callHook (gm, hook) {
    // #7573 disable dep collection when invoking lifecycle hooks
    pushTarget()
    const handlers = gm.$options[hook]
    const info = `${hook} hook`
    if (handlers) {
      for (let i = 0, j = handlers.length; i < j; i++) {
        invokeWithErrorHandling(handlers[i], gm, null, gm, info)
      }
    }
    if (gm._hasHookEvent) {
      gm.$emit('hook:' + hook)
    }
    popTarget()
  }
  