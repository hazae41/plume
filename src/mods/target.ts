import { Future } from "@hazae41/future";
import { Option } from "@hazae41/option";
import { Err, Ok, Result } from "@hazae41/result";
import { Cleanable } from "libs/cleanable/cleanable.js";
import { Promiseable } from "libs/promises/promiseable.js";

export type EventListener<T> =
  (e: T) => Promiseable<Result<void, unknown>>

export interface EventListenerOptions {
  once?: boolean;
  passive?: boolean;
  signal?: AbortSignal
}

export interface EventWaitParams {
  signal?: AbortSignal
}

interface InternalEventListenerOptions extends EventListenerOptions {
  off: () => void
}

export class SuperEventTarget<M> {
  readonly __map: M = undefined as any

  readonly #listeners = new Map<keyof M, Map<EventListener<any>, InternalEventListenerOptions>>()

  /**
   * Add a listener to an event
   * @param type Event type //  "abort", "error", "message", "close"
   * @param listener Event listener // (e) => console.log("hello")
   * @param options Options // { passive: true }
   * @returns 
   */
  on<K extends keyof M>(type: K, listener: EventListener<M[K]>, options: AddEventListenerOptions = {}) {
    let listeners = this.#listeners.get(type)

    if (listeners === undefined) {
      listeners = new Map<EventListener<any>, InternalEventListenerOptions>()
      this.#listeners.set(type, listeners)
    }

    const off = () => this.off(type, listener)

    const internalOptions: InternalEventListenerOptions = { ...options, off }
    internalOptions.signal?.addEventListener("abort", off, { passive: true })
    listeners.set(listener, internalOptions)

    return off
  }

  /**
   * Remove a listener from an event
   * @param type Event type //  "abort", "error", "message", "close"
   * @param listener Event listener // (e) => console.log("hello")
   * @param options Just to look like DOM's EventTarget
   * @returns 
   */
  off<K extends keyof M>(type: K, listener: EventListener<M[K]>) {
    const listeners = this.#listeners.get(type)

    if (!listeners)
      return

    const options = listeners.get(listener)

    if (!options)
      return

    options.signal?.removeEventListener("abort", options.off)

    listeners.delete(listener)

    if (!listeners.size)
      return
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
  async tryEmit<K extends keyof M>(type: K, event: M[K]): Promise<Result<M[K], unknown>> {
    const listeners = this.#listeners.get(type)

    if (!listeners)
      return new Ok(event)

    const promises = new Array<Promise<Result<void, unknown>>>(listeners.size)

    for (const [listener, options] of listeners) {
      if (!options.passive)
        continue
      if (options.once)
        this.off(type, listener)

      const promise = (listener as EventListener<M[typeof type]>)(event)

      if (options.passive && promise instanceof Promise) {
        promises.push(promise)
        continue
      }

      const result = await promise

      if (result?.isErr())
        return result
      continue
    }

    const results = await Promise.all(promises)

    for (const result of results)
      if (result?.isErr())
        return result

    return new Ok(event)
  }

  wait<K extends keyof M, R>(type: K, callback: (e: M[K]) => Result<Option<R>, unknown>) {
    const future = new Future<R>()

    const onEvent = async (event: M[K]) => {
      try {
        const result = callback(event)

        if (result.isErr())
          return result

        if (result.inner.isSome())
          future.resolve(result.inner.inner)

        return Ok.void()
      } catch (e: unknown) {
        future.reject(e)
        return new Err(e)
      }
    }

    const off = this.on(type, onEvent, { passive: true })

    return new Cleanable(future.promise, off)
  }

}