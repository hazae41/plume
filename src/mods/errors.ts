import { Cleaner } from "@hazae41/cleaner"
import { Future } from "@hazae41/future"
import { Some } from "@hazae41/option"
import { Err, Ok } from "@hazae41/result"
import { SuperEventTarget } from "./target.js"

export class AbortedError extends Error {
  readonly #class = AbortedError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new AbortedError(`Aborted`, { cause })
  }

  static wait(signal: AbortSignal) {
    const future = new Future<Err<AbortedError>>()

    const onAbort = (event: Event) => {
      future.resolve(new Err(AbortedError.from(event)))
    }

    signal.addEventListener("abort", onAbort, { passive: true })
    const off = () => signal.removeEventListener("abort", onAbort)

    return new Cleaner(future.promise, off)
  }

}

export class ErroredError extends Error {
  readonly #class = ErroredError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new ErroredError(`Errored`, { cause })
  }

  static wait<M extends { error: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("error", (event) => {
      const error = ErroredError.from(event)
      return new Ok(new Some(new Err(error)))
    })
  }
}

export class ClosedError extends Error {
  readonly #class = ClosedError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new ClosedError(`Closed`, { cause })
  }

  static wait<M extends { close: unknown }>(target: SuperEventTarget<M>) {
    return target.wait("close", (event) => {
      const error = ClosedError.from(event)
      return new Ok(new Some(new Err(error)))
    })
  }
}