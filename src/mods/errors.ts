import { Future } from "@hazae41/future"
import { Some } from "@hazae41/option"
import { Err, Ok } from "@hazae41/result"
import { Cleanable } from "libs/cleanable/cleanable.js"
import { SuperEventTarget } from "./target.js"

export class AbortError extends Error {
  readonly #class = AbortError
  readonly name = this.#class.name

  constructor(options: ErrorOptions) {
    super(`Aborted`, options)
  }

  static wait(signal: AbortSignal) {
    const future = new Future<Err<AbortError>>()

    const onAbort = (event: Event) => {
      const error = new AbortError({ cause: event })
      future.resolve(new Err(error))
    }

    signal.addEventListener("abort", onAbort, { passive: true })
    const off = () => signal.removeEventListener("abort", onAbort)

    return new Cleanable(future.promise, off)
  }

}

export class ErrorError extends Error {
  readonly #class = ErrorError
  readonly name = this.#class.name

  constructor(options: ErrorOptions) {
    super(`Errored`, options)
  }

  static wait<M extends { error: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("error", (event) => {
      const error = new ErrorError({ cause: event })

      return new Ok(new Some(new Err(error)))
    })
  }
}

export class CloseError extends Error {
  readonly #class = CloseError
  readonly name = this.#class.name

  constructor(options: ErrorOptions) {
    super(`Closed`, options)
  }

  static wait<M extends { close: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("close", (event) => {
      const error = new CloseError({ cause: event })

      return new Ok(new Some(new Err(error)))
    })
  }
}