import { Option } from "@hazae41/option"
import { Result } from "@hazae41/result"
import { Cleanable } from "libs/cleanable/cleanable.js"
import { AbortError, CloseError, ErrorError } from "./errors.js"
import { SuperEventTarget } from "./target.js"

export async function tryWait<M, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Result<Option<Result<R>>, unknown>, signal: AbortSignal) {
  const abort = AbortError.wait(signal)
  const event = target.wait(type, callback)

  return await Cleanable.race<Result<R, unknown>>([abort, event])
}

export type StreamEvents = {
  close: unknown,
  error: unknown
}

export async function tryWaitStream<M extends StreamEvents, K extends keyof M, R>(target: SuperEventTarget<M>, type: K, callback: (e: M[K]) => Result<Option<Result<R>>, unknown>, signal: AbortSignal) {
  const abort = AbortError.wait(signal)
  const error = ErrorError.wait(target)
  const close = CloseError.wait(target)
  const event = target.wait(type, callback)

  return await Cleanable.race<Result<R, unknown>>([abort, error, close, event])
}