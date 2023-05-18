import { Future } from "@hazae41/future";
import { Option } from "@hazae41/option";
import { Err, Ok, Result } from "@hazae41/result";
import { Cleanable } from "libs/cleanable/cleanable.js";
import { Promiseable } from "libs/promises/promiseable.js";

export type SuperEventListener<T> =
  (e: T) => Promiseable<Result<void, unknown>>

export interface SuperEventListenerOptions {
  once?: boolean;
  passive?: boolean;
  signal?: AbortSignal
}

interface InternalSuperEventListenerOptions extends SuperEventListenerOptions {
  off: () => void
}

export class EventError extends Error {
  readonly #class = EventError

  constructor(cause: unknown) {
    super(`Event failed`, { cause })
  }

  static new(cause: unknown) {
    return new EventError(cause)
  }

}

export class SuperEventTarget<M> {

  readonly #listeners = new Map<keyof M, Map<SuperEventListener<any>, InternalSuperEventListenerOptions>>()

  /**
   * Add a listener to an event
   * @param type Event type //  "abort", "error", "message", "close"
   * @param listener Event listener // (e) => console.log("hello")
   * @param options Options // { passive: true }
   * @returns 
   */
  on<K extends keyof M>(type: K, listener: SuperEventListener<M[K]>, options: AddEventListenerOptions = {}) {
    let listeners = this.#listeners.get(type)

    if (listeners === undefined) {
      listeners = new Map<SuperEventListener<any>, InternalSuperEventListenerOptions>()
      this.#listeners.set(type, listeners)
    }

    const off = () => this.off(type, listener)

    const internalOptions: InternalSuperEventListenerOptions = { ...options, off }
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
  off<K extends keyof M>(type: K, listener: SuperEventListener<M[K]>) {
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
   * @param value The object to emit
   * @returns `value`
   * @throws `EventError`
   */
  async emit<K extends keyof M>(type: K, value: M[K]): Promise<M[K]> {
    return await this.tryEmit(type, value).then(r => r.unwrap())
  }

  /**
   * Dispatch an event to its listeners
   * 
   * - Dispatch to active listeners sequencially
   * - Return false if the event has been cancelled
   * - Dispatch to passive listeners concurrently
   * - Return true
   * @param value The object to emit
   * @returns `Ok(value)` or `Err<EventError>`
   */
  async tryEmit<K extends keyof M>(type: K, value: M[K]): Promise<Result<M[K], EventError>> {
    const listeners = this.#listeners.get(type)

    if (!listeners)
      return new Ok(value)

    const promises = new Array<Promise<Result<void, unknown>>>()

    for (const [listener, options] of listeners) {
      if (options.passive)
        continue
      if (options.once)
        this.off(type, listener)

      const returned = await listener(value)

      if (returned.isErr())
        return returned.mapErrSync(EventError.new)
      continue
    }

    for (const [listener, options] of listeners) {
      if (!options.passive)
        continue
      if (options.once)
        this.off(type, listener)

      const returned = listener(value)

      if (returned instanceof Promise) {
        promises.push(returned)
        continue
      }

      if (returned.isErr())
        return returned.mapErrSync(EventError.new)
      continue
    }

    const results = await Promise.all(promises)

    for (const result of results)
      if (result.isErr())
        return result.mapErrSync(EventError.new)

    return new Ok(value)
  }

  wait<K extends keyof M, R>(type: K, callback: (e: M[K]) => Promiseable<Result<Option<R>, unknown>>) {
    const future = new Future<R>()

    const onEvent = async (event: M[K]) => {
      try {
        const result = await callback(event)

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