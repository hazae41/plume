import { Future } from "@hazae41/future"
import { AbortEvent } from "./abort.js"
import { AsyncEventTarget } from "./target.js"

export interface WaitMapParams<M, K extends keyof M, R> {
  onEvent: (event: M[K]) => void,
  future: Future<R>,
  signal?: AbortSignal
}

/**
 * Short variant of `waitForCloseAndError` that does not filter nor map the event
 * @param target 
 * @param type 
 * @param signal 
 * @returns 
 */
export async function wait<T extends AsyncEventTarget<any>, M extends T["__map"], K extends keyof M>(target: T, type: K, signal?: AbortSignal) {
  const future = new Future<M[K]>()
  const onEvent = (event: M[K]) => future.resolve(event)
  return await waitMap(target, type, { future, onEvent, signal })
}

/**
 * Safely wait for the given event type, throwing when the signal is aborted, and finally cleaning the listeners, while allowing mapping or filtering events based on the given function
 * @param target 
 * @param type 
 * @param params 
 * @returns 
 */
export async function waitMap<T extends AsyncEventTarget<any>, M extends T["__map"], K extends keyof M, R>(target: T, type: K, params: WaitMapParams<M, K, R>) {
  const { future, onEvent, signal } = params

  const onAbort = (event: Event) => {
    const abortEvent = event as AbortEvent
    const error = new Error(`Aborted`, { cause: abortEvent.target.reason })
    future.reject(error)
  }

  try {
    signal?.addEventListener("abort", onAbort, { passive: true })
    target.addEventListener(type, onEvent, { passive: true })

    return await future.promise
  } finally {
    signal?.removeEventListener("abort", onAbort)
    target.removeEventListener(type, onEvent)
  }
}

export type CloseAndErrorEvents = {
  close: CloseEvent,
  error: ErrorEvent
}

/**
 * Short variant of `waitForCloseAndError` that does not filter nor map the event
 * @param target 
 * @param type 
 * @param signal 
 * @returns 
 */
export async function waitCloseOrError<T extends AsyncEventTarget<any>, M extends T["__map"], K extends keyof M>(target: T, type: K, signal?: AbortSignal) {
  const future = new Future<M[K]>()
  const onEvent = (event: M[K]) => future.resolve(event)
  return await waitMapCloseOrError(target, type, { future, onEvent, signal })
}

/**
 * Safely wait for the given event type, throwing when a close or error event happens or when the signal is aborted, and finally cleaning the listeners, while allowing mapping or filtering events based on the given function
 * @param target 
 * @param type 
 * @param params 
 * @returns 
 */
export async function waitMapCloseOrError<T extends AsyncEventTarget<any>, M extends T["__map"], K extends keyof M, R>(target: T, type: K, params: WaitMapParams<M, K, R>) {
  const { future, onEvent, signal } = params

  const onAbort = (event: Event) => {
    const abortEvent = event as AbortEvent
    const error = new Error(`Aborted`, { cause: abortEvent.target.reason })
    future.reject(error)
  }

  const onClose = (event: CloseEvent) => {
    const error = new Error(`Closed`, { cause: event })
    future.reject(error)
  }

  const onError = (event: ErrorEvent) => {
    const error = new Error(`Errored`, { cause: event })
    future.reject(error)
  }

  try {
    signal?.addEventListener("abort", onAbort, { passive: true })
    target.addEventListener("close", onClose, { passive: true })
    target.addEventListener("error", onError, { passive: true })
    target.addEventListener(type, onEvent, { passive: true })

    return await future.promise
  } finally {
    signal?.removeEventListener("abort", onAbort)
    target.removeEventListener("close", onClose)
    target.removeEventListener("error", onError)
    target.removeEventListener(type, onEvent)
  }
}