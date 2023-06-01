import { Cleaner } from "@hazae41/cleaner"
import { Option } from "@hazae41/option"
import { Ok, Result } from "@hazae41/result"
import { Promiseable } from "libs/promises/promiseable.js"
import { AbortError, CloseError, ErrorError } from "./errors.js"
import { SuperEventTarget } from "./target.js"

export type WaitError =
  | AbortError

export async function tryWaitOrSignal<M, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Promiseable<Result<Option<Ok<R>>, unknown>>, signal: AbortSignal) {
  const abort = AbortError.wait(signal)
  const event = target.wait(type, callback)

  return await Cleaner.race<Result<R, WaitError>>([abort, event])
}

export type StreamEvents = {
  close: unknown,
  error: unknown
}

export type WaitStreamError =
  | AbortError
  | CloseError
  | ErrorError

export async function tryWaitOrStream<M extends StreamEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Promiseable<Result<Option<Ok<R>>, unknown>>) {
  const error = ErrorError.wait(target)
  const close = CloseError.wait(target)
  const event = target.wait(type, callback)

  return await Cleaner.race<Result<R, ErrorError | CloseError>>([error, close, event])
}

export async function tryWaitOrStreamOrSignal<M extends StreamEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Promiseable<Result<Option<Ok<R>>, unknown>>, signal: AbortSignal) {
  const abort = AbortError.wait(signal)
  const error = ErrorError.wait(target)
  const close = CloseError.wait(target)
  const event = target.wait(type, callback)

  return await Cleaner.race<Result<R, WaitStreamError>>([abort, error, close, event])
}