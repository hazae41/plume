import { Ok, Result } from "@hazae41/result"
import { AbortedError, CloseEvents, ClosedError, ErrorEvents, ErroredError } from "./errors.js"
import { SuperEventMap, SuperEventTarget, SuperEventWaiter } from "./target.js"

export async function waitOrSignal<M extends SuperEventMap, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>, signal: AbortSignal): Promise<R> {
  using abort = AbortedError.waitOrThrow(signal)
  using event = target.wait(type, callback)

  return await Promise.race([abort.get(), event.get()])
}

export async function tryWaitOrSignal<M extends SuperEventMap, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>, signal: AbortSignal): Promise<Result<R, Error>> {
  using abort = AbortedError.tryWait(signal)
  using event = target.wait(type, callback)

  return await Promise.race([abort.get(), event.get()])
}

export async function waitOrCloseOrError<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>): Promise<R> {
  using error = ErroredError.waitOrThrow(target)
  using close = ClosedError.waitOrThrow(target)
  using event = target.wait(type, callback)

  return await Promise.race([error.get(), close.get(), event.get()])
}

export async function tryWaitOrCloseOrError<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>): Promise<Result<R, Error>> {
  using error = ErroredError.tryWait(target)
  using close = ClosedError.tryWait(target)
  using event = target.wait(type, callback)

  return await Promise.race([error.get(), close.get(), event.get()])
}

export async function waitOrCloseOrErrorOrSignal<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>, signal: AbortSignal): Promise<R> {
  using abort = AbortedError.waitOrThrow(signal)
  using error = ErroredError.waitOrThrow(target)
  using close = ClosedError.waitOrThrow(target)
  using event = target.wait(type, callback)

  return await Promise.race([abort.get(), error.get(), close.get(), event.get()])
}

export async function tryWaitOrCloseOrErrorOrSignal<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>, signal: AbortSignal): Promise<Result<R, Error>> {
  using abort = AbortedError.tryWait(signal)
  using error = ErroredError.tryWait(target)
  using close = ClosedError.tryWait(target)
  using event = target.wait(type, callback)

  return await Promise.race([abort.get(), error.get(), close.get(), event.get()])
}