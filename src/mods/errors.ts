import { PromiseDisposer } from "@hazae41/cleaner"
import { Future } from "@hazae41/future"
import { None } from "@hazae41/option"
import { Err } from "@hazae41/result"
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

    return new PromiseDisposer(future.promise, off)
  }

}

export type ErrorEvents = {
  error: (reason: unknown) => void
}

export class ErroredError extends Error {
  readonly #class = ErroredError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new ErroredError(`Errored`, { cause })
  }

  static wait<M extends ErrorEvents>(target: SuperEventTarget<M>) {
    return target.wait("error", (future: Future<Err<ErroredError>>, event) => {
      const error = ErroredError.from(event)
      future.resolve(new Err(error))
      return new None()
    })
  }
}

export type CloseEvents = {
  close: (reason: unknown) => void
}

export class ClosedError extends Error {
  readonly #class = ClosedError
  readonly name = this.#class.name

  static from(cause: unknown) {
    return new ClosedError(`Closed`, { cause })
  }

  static wait<M extends CloseEvents>(target: SuperEventTarget<M>) {
    return target.wait("close", (future: Future<Err<ClosedError>>, event) => {
      const error = ClosedError.from(event)
      future.resolve(new Err(error))
      return new None()
    })
  }
}