import { Promiseable } from "libs/promises/promiseable.js"

export type AsyncEventListener<T = unknown> =
  (e: T) => Promiseable<void>

interface InternalEventListenerOptions extends AddEventListenerOptions {
  onabort: () => void
}

export class AsyncEventTarget<M extends { [P: string]: Event }> {
  readonly __map: M = undefined as any

  readonly #listeners = new Map<keyof M, Map<AsyncEventListener, InternalEventListenerOptions>>()

  constructor() { }

  #get<K extends keyof M>(type: K) {
    let listeners = this.#listeners.get(type)

    if (listeners === undefined) {
      listeners = new Map<AsyncEventListener, InternalEventListenerOptions>()
      this.#listeners.set(type, listeners)
    }

    return listeners
  }

  /**
   * Add a listener to an event
   * @param type Event type //  "abort", "error", "message", "close"
   * @param listener Event listener // (e) => console.log("hello")
   * @param options Options // { passive: true }
   * @returns 
   */
  addEventListener<K extends keyof M>(type: K, listener: AsyncEventListener<M[K]> | null, options: boolean | AddEventListenerOptions = {}) {
    if (!listener) return

    const listeners = this.#get(type)

    const onabort = () => this.removeEventListener(type, listener)

    const internalOptions: InternalEventListenerOptions = typeof options === "boolean"
      ? { capture: options, onabort }
      : { ...options, onabort }

    listeners.set(listener as AsyncEventListener, internalOptions)

    internalOptions.signal?.addEventListener("abort", onabort, { passive: true })
  }

  /**
   * Remove a listener from an event
   * @param type Event type //  "abort", "error", "message", "close"
   * @param listener Event listener // (e) => console.log("hello")
   * @param options Just to look like DOM's EventTarget
   * @returns 
   */
  removeEventListener<K extends keyof M>(type: K, listener: AsyncEventListener<M[K]> | null, options: boolean | EventListenerOptions = {}) {
    if (!listener) return

    const listeners = this.#get(type)

    const internalOptions = listeners.get(listener as AsyncEventListener)
    if (!internalOptions) return

    internalOptions.signal?.removeEventListener("abort", internalOptions.onabort)

    listeners.delete(listener as AsyncEventListener)

    if (listeners.size) return
    this.#listeners.delete(type)
  }

  /**
   * Dispatch an event to its listeners
   * 
   * - Dispatch to active listeners sequencially
   * - Return false if the event has been cancelled
   * - Dispatch to passive listeners concurrently
   * - Return true
   * @param event Event
   * @returns 
   */
  async dispatchEvent<K extends keyof M>(event: M[K], type: K = event.type as K) {
    const listeners = this.#listeners.get(type)

    if (!listeners) return true

    for (const [listener, options] of listeners) {
      if (options.passive) continue

      const onsettle = () => {
        if (!options.once) return

        this.removeEventListener(type, listener)
      }

      try {
        await listener(event)
      } finally {
        onsettle()
      }
    }

    if (event.cancelable && event.defaultPrevented)
      return false

    const promises = new Array<Promise<void>>(listeners.size)

    for (const [listener, options] of listeners) {
      if (!options.passive) continue

      const onsettle = () => {
        if (!options.once) return

        this.removeEventListener(type, listener)
      }

      const promise = listener(event)

      if (promise)
        promises.push(promise.finally(onsettle))
      else
        onsettle()
    }

    await Promise.all(promises)

    return true
  }
}