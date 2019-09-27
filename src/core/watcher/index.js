import { pushTarget, popTarget } from '../observer/dep.js'
import { queueWatcher } from '../observer/scheduler.js'
import { traverse } from '../observer/traverse.js'
import { _Set as Set } from '../utils/env.js'
import { parsePath } from '../utils/lang.js'
import { handleError } from '../utils/error.js'
import { isObject, remove } from '../utils/tools.js'
let uid = 0
class Watcher {
    constructor(gm, expOrFn, cb, options, isRenderWatcher) {
        this.gm = gm
        if (isRenderWatcher) {
            gm._watcher = this
        }
        gm._watchers.push(this)
        if (options) {
            this.deep = !!options.deep
            this.user = !!options.user
            this.lazy = !!options.lazy
            this.sync = !!options.sync
            this.before = options.before
        } else {
            this.deep = this.user = this.lazy = this.sync = false
        }
        this.cb = cb
        this.id = ++uid
        this.active = true
        this.dirty = this.lazy
        this.deps = []
        this.newDeps = []
        this.depIds = new Set()
        this.newDepIds = new Set()
        this.expOrFn = expOrFn
        if (typeof expOrFn === 'function') {
            this.getter = expOrFn
        } else {
            this.getter = this.parseGetter(expOrFn.trim())
        }
        this.value = this.lazy
            ? undefined
            : this.get()
    }
    update() {
        /* istanbul ignore else */
        if (this.lazy) {
            this.dirty = true
        } else if (this.sync) {
            this.run()
        } else {
            queueWatcher(this)
        }
    }
    run() {
        if (this.active) {
            const value = this.get()
            if (
                value !== this.value ||
                // Deep watchers and watchers on Object/Arrays should fire even
                // when the value is the same, because the value may
                // have mutated.
                isObject(value) ||
                this.deep
            ) {
                // set new value
                const oldValue = this.value
                this.value = value
                if (this.user) {
                    try {
                        this.cb.call(this.gm, value, oldValue)
                    } catch (e) {
                        handleError(e, this.gm, `callback for watcher "${this.expression}"`)
                    }
                } else {
                    this.cb.call(this.gm, value, oldValue)
                }
            }
        }
    }
    /**
     * Evaluate the value of the watcher.
     * This only gets called for lazy watchers.
     */
    evaluate () {
        this.value = this.get()
        this.dirty = false
    }
    /**
     * Depend on all deps collected by this watcher.
     */
    depend () {
        let i = this.deps.length
        while (i--) {
            this.deps[i].depend()
        }
    }
    addDep(dep) {
        const id = dep.id
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id)
            this.newDeps.push(dep)
            if (!this.depIds.has(id)) {
                dep.addSub(this)
            }
        }
    }
    get() {
        pushTarget(this)
        let value
        const gm = this.gm
        try {
            value = this.getter.call(gm, gm)
        } catch (e) {
            if (this.user) {
                handleError(e, gm, `getter for watcher "${this.expression}"`)
            } else {
                throw e
            }
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value)
            }
            popTarget()
            this.cleanupDeps()
        }
        return value
    }

    /**
     * Clean up for dependency collection.
     */
    cleanupDeps () {
        let i = this.deps.length
        while (i--) {
            const dep = this.deps[i]
            if (!this.newDepIds.has(dep.id)) {
                dep.removeSub(this)
            }
        }
        let tmp = this.depIds
        this.depIds = this.newDepIds
        this.newDepIds = tmp
        this.newDepIds.clear()
        tmp = this.deps
        this.deps = this.newDeps
        this.newDeps = tmp
        this.newDeps.length = 0
    }

    parseGetter(exp) {
        return parsePath(exp)
    }
    /**
     * Remove self from all dependencies' subscriber list.
     */
    teardown () {
        if (this.active) {
            // remove self from gm's watcher list
            // this is a somewhat expensive operation so we skip it
            // if the gm is being destroyed.
            if (!this.gm._isBeingDestroyed) {
                remove(this.gm._watchers, this)
            }
            let i = this.deps.length
            while (i--) {
                this.deps[i].removeSub(this)
            }
            this.active = false
        }
    }
}
export default Watcher
