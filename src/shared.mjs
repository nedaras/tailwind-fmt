"use strict"

/**
  * @template T
  * @param {() => T} f
  * @param {(reason?: any) => T} on_error
  */
export function _try(f, on_error) {
    try {
        return f()
    } catch (reason) {
        return on_error(reason)
    }
}

/**
  * @template T
  * @param {number} n
  * @returns {(func: () => PromiseLike<T>) => Promise<T>}
  */
export function limited(n) {
    const queue = []
    let amt = 0

    const next = () => {
        if (queue.length == 0 || amt >= n) return

        const { func, resolve, reject  } = queue.shift()
        amt++

        func().then(resolve, reject).finally(() => {
            amt--
            next()
        })
    }

    return (func) => {
        const { promise, resolve, reject } = withResolvers()
        queue.push({ func, resolve, reject })
        next()
        return promise
    }
}

/**
  * @template T
  * @returns {{ promise: Promise<T>, resolve: (val: T | PromiseLike<T>) => void, reject: (reason?: any) => void }}
  */
export function withResolvers() {
    let resolve
    let reject

    const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })

    return { promise, resolve, reject }
}
