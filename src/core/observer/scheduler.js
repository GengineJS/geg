import { config } from '../config/config.js'
import { callHook, activateChildComponent } from '../base/active.js'
import { devtools } from '../utils/env.js'
import { nextTick } from '../utils/next-tick.js'
let flushing = false
const queue = []
let waiting = false
let index = 0
let has = {}
const activatedChildren = []
export let currentFlushTimestamp = 0
// Async edge case fix requires storing an event listener's attach timestamp.
let getNow = () => Date.now

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
    index = queue.length = activatedChildren.length = 0
    has = {}
    waiting = flushing = false
}

function callActivatedHooks (queue) {
    for (let i = 0; i < queue.length; i++) {
      queue[i]._inactive = true
      activateChildComponent(queue[i], true /* true */)
    }
}

function callUpdatedHooks (queue) {
    let i = queue.length
    while (i--) {
      const watcher = queue[i]
      const gm = watcher.gm
      if (gm._watcher === watcher && gm._isMounted && !gm._isDestroyed) {
        callHook(gm, 'updated')
      }
    }
  }
/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
    currentFlushTimestamp = getNow()
    flushing = true
    let watcher, id
    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child)
    // 2. A component's user watchers are run before its render watcher (because
    //    user watchers are created before the render watcher)
    // 3. If a component is destroyed during a parent component's watcher run,
    //    its watchers can be skipped.
    queue.sort((a, b) => a.id - b.id)
    // do not cache length because more watchers might be pushed
    // as we run existing watchers
    for (index = 0; index < queue.length; index++) {
        watcher = queue[index]
        if (watcher.before) {
            watcher.before()
        }
        id = watcher.id
        has[id] = null
        watcher.run()
    }
    // keep copies of post queues before resetting state
    const activatedQueue = activatedChildren.slice()
    const updatedQueue = queue.slice()

    resetSchedulerState()

    // call component updated and activated hooks
    callActivatedHooks(activatedQueue)
    callUpdatedHooks(updatedQueue)

    // devtool hook
    /* istanbul ignore if */
    if (devtools && config.devtools) {
        devtools.emit('flush')
    }
}
/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (gm) {
    // setting _inactive to false here so that a render function can
    // rely on checking whether it's in an inactive tree (e.g. router-view)
    gm._inactive = false
    activatedChildren.push(gm)
}
/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher) {
    const id = watcher.id
    if (has[id] == null) {
        has[id] = true
        if (!flushing) {
            queue.push(watcher)
        } else {
            // if already flushing, splice the watcher based on its id
            // if already past its id, it will be run next immediately.
            let i = queue.length - 1
            while (i > index && queue[i].id > watcher.id) {
                i--
            }
            queue.splice(i + 1, 0, watcher)
        }
        // queue the flush
        if (!waiting) {
            waiting = true
            nextTick(flushSchedulerQueue)
        }
    }
}
