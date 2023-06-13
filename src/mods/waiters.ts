import { Cleaner } from "@hazae41/cleaner"
import { Option } from "@hazae41/option"
import { Ok, Result } from "@hazae41/result"
import { Promiseable } from "libs/promises/promiseable.js"
import { AbortedError, ClosedError, ErroredError } from "./errors.js"
import { SuperEventTarget } from "./target.js"

export type WaitError =
  | AbortedError

export async function tryWaitOrSignal<M, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Promiseable<Result<Option<Ok<R>>, unknown>>, signal: AbortSignal) {
  const abort = AbortedError.wait(signal)
  const event = target.wait(type, callback)

  return await Cleaner.race<Promise<Result<R, WaitError>>>([abort, event])
}

export type StreamEvents = {
  close: unknown,
  error: unknown
}

export type WaitStreamError =
  | AbortedError
  | ClosedError
  | ErroredError

export async function tryWaitOrStream<M extends StreamEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Promiseable<Result<Option<Ok<R>>, unknown>>) {
  const error = ErroredError.wait(target)
  const close = ClosedError.wait(target)
  const event = target.wait(type, callback)

  return await Cleaner.race<Promise<Result<R, ErroredError | ClosedError>>>([error, close, event])
}

export async function tryWaitOrStreamOrSignal<M extends StreamEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Promiseable<Result<Option<Ok<R>>, unknown>>, signal: AbortSignal) {
  const abort = AbortedError.wait(signal)
  const error = ErroredError.wait(target)
  const close = ClosedError.wait(target)
  const event = target.wait(type, callback)

  return await Cleaner.race<Promise<Result<R, WaitStreamError>>>([abort, error, close, event])
}