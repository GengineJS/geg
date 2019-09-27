import { extend, mergeOptions } from '../utils/index.js'
export function resolveConstructorOptions (Ctor) {
    let options = Ctor.options
    if (Ctor.super) {
      const superOptions = resolveConstructorOptions(Ctor.super)
      const cachedSuperOptions = Ctor.superOptions
      if (superOptions !== cachedSuperOptions) {
        // super option changed,
        // need to resolve new options.
        Ctor.superOptions = superOptions
        // check if there are any late-modified/attached options (#4976)
        const modifiedOptions = resolveModifiedOptions(Ctor)
        // update base extend options
        if (modifiedOptions) {
          extend(Ctor.extendOptions, modifiedOptions)
        }
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
        if (options.name) {
          options.components[options.name] = Ctor
        }
      }
    }
    return options
  }
  
  function resolveModifiedOptions (Ctor) {
    let modified
    const latest = Ctor.options
    const sealed = Ctor.sealedOptions
    for (const key in latest) {
      if (latest[key] !== sealed[key]) {
        if (!modified) modified = {}
        modified[key] = latest[key]
      }
    }
    return modified
  }