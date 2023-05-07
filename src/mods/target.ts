import { Future } from "@hazae41/future";
import { Option, Some } from "@hazae41/option";
import { Err, Ok, Result } from "@hazae41/result";
import { Promiseable } from "libs/promises/promiseable.js";
import { AbortEvent } from "../libs/abort/abort.js";
import { AbortError, CloseError, ErrorError } from "./errors.js";

export type EventListener<T extends [unknown, unknown]> =
  (e: T[0]) => Promiseable<Result<void, T[1]>>

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

export class SuperEventTarget<M extends { [P: string | number | symbol]: [unknown, unknown] }> {
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
  async tryEmit<K extends keyof M>(type: K, event: M[K][0]): Promise<Result<M[K][0], M[K][1]>> {
    const listeners = this.#listeners.get(type)

    if (!listeners)
      return new Ok(event)

    const promises = new Array<Promise<Result<void, M[typeof type][1]>>>(listeners.size)

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

  /**
   * Return `Ok` when the given event type happens, or `Err` when the signal is aborted
   * @param type 
   * @param signal 
   * @returns 
   */
  async tryWaitAnyEvent<K extends keyof M>(type: K, params: { signal?: AbortSignal }) {
    return this.tryWaitEvent(type, (e) => new Some(e), params)
  }

  /**
   * Call the callback when the given event type happens, return whatever the future resolves, or `Err` when the signal is aborted
   * @param type 
   * @param callback
   * @param params 
   * @returns 
   */
  async tryWaitEvent<K extends keyof M, T>(type: K, callback: (event: M[K][0]) => Option<T>, params: { signal?: AbortSignal }) {
    const { signal } = params

    const future = new Future<Result<T, AbortError>>()

    const onAbort = (event: Event) => {
      const abortEvent = event as AbortEvent
      const error = new AbortError(`Aborted`, { cause: abortEvent.target.reason })
      future.resolve(new Err(error))
      return Ok.void()
    }

    const onEvent = async (event: M[typeof type][0]) => {
      try {
        const option = callback(event)
        if (option.isSome())
          future.resolve(option.ok())
        return Ok.void()
      } catch (e: unknown) {
        future.reject(e)
        return Ok.void()
      }
    }

    try {
      signal?.addEventListener("abort", onAbort, { passive: true })
      this.on(type, onEvent, { passive: true })

      return await future.promise
    } finally {
      signal?.removeEventListener("abort", onAbort)
      this.off(type, onEvent)
    }
  }

  /**
   * Return `Ok` when the given event type happens, or `Err` when a close or error event happens or when the signal is aborted
   * @param type 
   * @param signal 
   * @returns 
   */
  async tryWaitAnyEventOrCloseOrError<K extends keyof M>(type: K, params: { signal?: AbortSignal }) {
    return this.tryWaitEventOrCloseOrError(type, (e) => new Some(e), params)
  }

  /**
   * Call the callback when the given event type happens, return whatever the future resolves, or `Err` when a close or error event happens or when the signal is aborted
   * @param type 
   * @param callback
   * @param params 
   * @returns 
   */
  async tryWaitEventOrCloseOrError<K extends keyof M, T>(type: K, callback: (event: M[K][0]) => Option<T>, params: { signal?: AbortSignal }) {
    const { signal } = params

    const future = new Future<Result<T, AbortError | CloseError | ErrorError>>()

    const onAbort = (event: Event) => {
      const abortEvent = event as AbortEvent
      const error = new AbortError(`Aborted`, { cause: abortEvent.target.reason })
      future.resolve(new Err(error))
      return Ok.void()
    }

    const onClose = (event: M["close"][0]) => {
      const error = new CloseError(`Closed`, { cause: event })
      future.resolve(new Err(error))
      return Ok.void()
    }

    const onError = (event: M["error"][0]) => {
      const error = new ErrorError(`Errored`, { cause: event })
      future.resolve(new Err(error))
      return Ok.void()
    }

    const onEvent = async (event: M[K][0]) => {
      try {
        const option = callback(event)
        if (option.isSome())
          future.resolve(option.ok())
        return Ok.void()
      } catch (e: unknown) {
        future.reject(e)
        return Ok.void()
      }
    }

    try {
      signal?.addEventListener("abort", onAbort, { passive: true })
      this.on("close", onClose, { passive: true })
      this.on("error", onError, { passive: true })
      this.on(type, onEvent, { passive: true })

      return await future.promise
    } finally {
      signal?.removeEventListener("abort", onAbort)
      this.off("close", onClose)
      this.off("error", onError)
      this.off(type, onEvent)
    }
  }

}