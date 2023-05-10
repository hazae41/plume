import { Future } from "@hazae41/future"
import { Some } from "@hazae41/option"
import { Err, Ok } from "@hazae41/result"
import { AbortEvent } from "libs/abort/abort.js"
import { Cleanable } from "libs/cleanable/cleanable.js"
import { SuperEventTarget } from "./target.js"

export class AbortError extends Error {
  readonly #class = AbortError

  static wait(signal: AbortSignal) {
    const future = new Future<Err<AbortError>>()

    const onAbort = (event: Event) => {
      const abortEvent = event as AbortEvent
      const error = new AbortError(`Aborted`, { cause: abortEvent })
      future.resolve(new Err(error))
    }

    signal.addEventListener("abort", onAbort, { passive: true })
    const off = () => signal.removeEventListener("abort", onAbort)

    return new Cleanable(future.promise, off)
  }

}

export class ErrorError extends Error {
  readonly #class = ErrorError

  static wait<M extends { error: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("error", (event) => {
      const error = new ErrorError(`Errored`, { cause: event })

      return new Ok(new Some(new Err(error)))
    })
  }
}

export class CloseError extends Error {
  readonly #class = CloseError

  static wait<M extends { close: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("close", (event) => {
      const error = new CloseError(`Closed`, { cause: event })

      return new Ok(new Some(new Err(error)))
    })
  }
}