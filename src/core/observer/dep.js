import { remove } from '../utils/tools.js'
import { config } from '../config/config.js'
let uid = 0
export class Dep {
    constructor() {
        this.id = uid++
        this.subs = []
    }
    addSub(sub) {
        this.subs.push(sub)
    }
    depend() {
        if (Dep.target) {
            Dep.target.addDep(this)
        }
    }
    removeSub(sub) {
        remove(this.subs, sub)
    }
    notify() {
        const subs = this.subs.slice()
        if (!config.async) {
            subs.sort((a, b) => a.id - b.id)
        }
        subs.forEach(function(sub) {
            sub.update()
        })
    }
}
Dep.target = null
const targetStack = []

export function pushTarget (target) {
    targetStack.push(target)
    Dep.target = target
}

export function popTarget () {
    targetStack.pop()
    Dep.target = targetStack[targetStack.length - 1]
}