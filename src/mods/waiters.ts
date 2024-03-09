import { AbortSignals, CloseEvents, ErrorEvents } from "./errors.js"
import { SuperEventMap, SuperEventTarget, SuperEventWaiter } from "./target.js"

export async function waitOrSignal<M extends SuperEventMap, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>, signal: AbortSignal): Promise<R> {
  using abort = AbortSignals.waitOrThrow(signal)
  using event = target.wait(type, callback)

  return await Promise.race([abort.get(), event.get()])
}

export async function waitOrCloseOrError<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>): Promise<R> {
  using error = ErrorEvents.waitOrThrow(target)
  using close = CloseEvents.waitOrThrow(target)
  using event = target.wait(type, callback)

  return await Promise.race([error.get(), close.get(), event.get()])
}

export async function waitOrCloseOrErrorOrSignal<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>, signal: AbortSignal): Promise<R> {
  using abort = AbortSignals.waitOrThrow(signal)
  using error = ErrorEvents.waitOrThrow(target)
  using close = CloseEvents.waitOrThrow(target)
  using event = target.wait(type, callback)

  return await Promise.race([abort.get(), error.get(), close.get(), event.get()])
}