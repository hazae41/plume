import { Disposable } from "@hazae41/cleaner"
import { Ok, Result } from "@hazae41/result"
import { AbortedError, CloseEvents, ClosedError, ErrorEvents, ErroredError } from "./errors.js"
import { SuperEventMap, SuperEventTarget, SuperEventWaiter } from "./target.js"

export async function waitOrSignal<M extends SuperEventMap, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>, signal: AbortSignal) {
  const abort = AbortedError.waitOrThrow(signal)
  const event = target.wait(type, callback)

  return await Disposable.raceSync<R>([abort, event])
}

export async function tryWaitOrSignal<M extends SuperEventMap, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>, signal: AbortSignal) {
  const abort = AbortedError.tryWait(signal)
  const event = target.wait(type, callback)

  return await Disposable.raceSync<Result<R, AbortedError>>([abort, event])
}

export async function waitOrCloseOrError<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>) {
  const error = ErroredError.waitOrThrow(target)
  const close = ClosedError.waitOrThrow(target)
  const event = target.wait(type, callback)

  return await Disposable.raceSync<R>([error, close, event])
}

export async function tryWaitOrCloseOrError<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>) {
  const error = ErroredError.tryWait(target)
  const close = ClosedError.tryWait(target)
  const event = target.wait(type, callback)

  return await Disposable.raceSync<Result<R, ErroredError | ClosedError>>([error, close, event])
}

export async function waitOrCloseOrErrorOrSignal<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], R>, signal: AbortSignal) {
  const abort = AbortedError.waitOrThrow(signal)
  const error = ErroredError.waitOrThrow(target)
  const close = ClosedError.waitOrThrow(target)
  const event = target.wait(type, callback)

  return await Disposable.raceSync<R>([abort, error, close, event])
}

export async function tryWaitOrCloseOrErrorOrSignal<M extends SuperEventMap & CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>, signal: AbortSignal) {
  const abort = AbortedError.tryWait(signal)
  const error = ErroredError.tryWait(target)
  const close = ClosedError.tryWait(target)
  const event = target.wait(type, callback)

  return await Disposable.raceSync<Result<R, AbortedError | ClosedError | ErroredError>>([abort, error, close, event])
}