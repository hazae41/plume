import { Cleaner } from "@hazae41/cleaner"
import { Future } from "@hazae41/future"
import { Some } from "@hazae41/option"
import { Err, Ok } from "@hazae41/result"
import { SuperEventTarget } from "./target.js"

export class AbortError extends Error {
  readonly #class = AbortError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new AbortError(`Aborted`, { cause })
  }

  static wait(signal: AbortSignal) {
    const future = new Future<Err<AbortError>>()

    const onAbort = (event: Event) => {
      future.resolve(new Err(AbortError.from(event)))
    }

    signal.addEventListener("abort", onAbort, { passive: true })
    const off = () => signal.removeEventListener("abort", onAbort)

    return new Cleaner(future.promise, off)
  }

}

export class ErrorError extends Error {
  readonly #class = ErrorError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new ErrorError(`Errored`, { cause })
  }

  static wait<M extends { error: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("error", (event) => {
      const error = ErrorError.from(event)
      return new Ok(new Some(new Err(error)))
    })
  }
}

export class CloseError extends Error {
  readonly #class = CloseError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new CloseError(`Closed`, { cause })
  }

  static wait<M extends { close: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("close", (event) => {
      const error = CloseError.from(event)
      return new Ok(new Some(new Err(error)))
    })
  }
}