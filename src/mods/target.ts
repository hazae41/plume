import { Cleaner } from "@hazae41/cleaner";
import { Future } from "@hazae41/future";
import { None, Option } from "@hazae41/option";
import { Promiseable } from "libs/promises/promiseable.js";

export type SuperEventMap =
  Record<string, (...args: any) => any>

export type SuperEventListener<T extends (...args: any) => any> =
  (...params: Parameters<T>) => Promiseable<Option<ReturnType<T>>>

export type SuperEventWaiter<T extends (...args: any) => any, R> =
  (future: Future<R>, ...params: Parameters<T>) => Promiseable<Option<ReturnType<T>>>

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
  readonly name = this.#class.name

  constructor(cause: unknown) {
    super(`Event failed`, { cause })
  }

  static new(cause: unknown) {
    return new EventError(cause)
  }

}

export class SuperEventTarget<M extends Record<string, (...args: any) => any>> {

  readonly #listeners = new Map<keyof M, Map<SuperEventListener<any>, InternalSuperEventListenerOptions>>()

  get listeners() {
    return this.#listeners
  }

  /**
   * Add a listener to an event
   * @param type Event type //  "abort", "error", "message", "close"
   * @param listener Event listener // (e) => new Some(123)
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

    if (listeners.size > 0)
      return

    this.#listeners.delete(type)
  }

  /**
   * Dispatch an event to its listeners
   * 
   * - Dispatch to active listeners sequencially
   * - Return if one of the listeners returned something
   * - Dispatch to passive listeners concurrently
   * - Return if one of the listeners returned something
   * - Return nothing
   * @param value The object to emit
   * @returns `Some` if the event 
   */
  async emit<K extends keyof M>(type: K, value: Parameters<M[K]>): Promise<Option<ReturnType<M[K]>>> {
    const listeners = this.#listeners.get(type) as Map<SuperEventListener<M[K]>, InternalSuperEventListenerOptions> | undefined

    if (!listeners)
      return new None()

    const promises = new Array<Promise<Option<ReturnType<M[K]>>>>()

    for (const [listener, options] of listeners) {
      if (options.passive)
        continue
      if (options.once)
        this.off(type, listener)

      const returned = await listener(...value)

      if (returned.isNone())
        continue

      return returned
    }

    for (const [listener, options] of listeners) {
      if (!options.passive)
        continue
      if (options.once)
        this.off(type, listener)

      const returned = listener(...value)

      if (returned instanceof Promise) {
        promises.push(returned)
        continue
      }

      if (returned.isNone())
        continue

      return returned
    }

    const returneds = await Promise.all(promises)

    for (const returned of returneds)
      if (returned.isSome())
        return returned

    return new None()
  }

  /**
   * Like `.on`, but instead of returning to the target, capture the returned value in a future, and return nothing to the target
   * @param type 
   * @param callback 
   * @returns 
   */
  wait<K extends keyof M, R>(type: K, callback: SuperEventWaiter<M[K], R>) {
    const future = new Future<R>()

    const onEvent = async (...params: Parameters<M[K]>) => {
      try {
        return await callback(future, ...params)
      } catch (e: unknown) {
        future.reject(e)
        throw e
      }
    }

    const off = this.on(type, onEvent, { passive: true })

    return new Cleaner(future.promise, off)
  }

}