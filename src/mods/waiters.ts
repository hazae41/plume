import { Cleaner } from "@hazae41/cleaner"
import { Ok, Result } from "@hazae41/result"
import { AbortedError, CloseEvents, ClosedError, ErrorEvents, ErroredError } from "./errors.js"
import { SuperEventMap, SuperEventTarget, SuperEventWaiter } from "./target.js"

export type WaitError =
  | AbortedError

export async function tryWaitOrSignal<M extends SuperEventMap, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>, signal: AbortSignal) {
  const abort = AbortedError.wait(signal)
  const event = target.wait(type, callback)

  return await Cleaner.race<Promise<Result<R, WaitError>>>([abort, event])
}

export type StreamEvents = {
  close: (event: unknown) => void,
  error: (event: unknown) => void
}

export type WaitStreamError =
  | AbortedError
  | ClosedError
  | ErroredError

export async function tryWaitOrCloseOrError<M extends CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>) {
  const error = ErroredError.wait(target)
  const close = ClosedError.wait(target)
  const event = target.wait(type, callback)

  return await Cleaner.race<Promise<Result<R, ErroredError | ClosedError>>>([error, close, event])
}

export async function tryWaitOrCloseOrErrorOrSignal<M extends CloseEvents & ErrorEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: SuperEventWaiter<M[K], Ok<R>>, signal: AbortSignal) {
  const abort = AbortedError.wait(signal)
  const error = ErroredError.wait(target)
  const close = ClosedError.wait(target)
  const event = target.wait(type, callback)

  return await Cleaner.race<Promise<Result<R, WaitStreamError>>>([abort, error, close, event])
}