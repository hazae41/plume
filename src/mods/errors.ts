import { Disposer } from "@hazae41/cleaner"
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

  static waitOrThrow(signal: AbortSignal) {
    const future = new Future<never>()

    if (signal.aborted) {
      future.reject(AbortedError.from(signal))
      return new Disposer(future.promise, () => { })
    }

    const onAbort = (event: Event) => {
      future.reject(AbortedError.from(event))
    }

    signal.addEventListener("abort", onAbort, { passive: true })
    const dispose = () => signal.removeEventListener("abort", onAbort)
    const promise = future.promise.finally(dispose)

    return new Disposer(promise, dispose)
  }

  static tryWait(signal: AbortSignal) {
    const future = new Future<Err<AbortedError>>()

    if (signal.aborted) {
      future.resolve(new Err(AbortedError.from(signal)))
      return new Disposer(future.promise, () => { })
    }

    const onAbort = (event: Event) => {
      future.resolve(new Err(AbortedError.from(event)))
    }

    signal.addEventListener("abort", onAbort, { passive: true })
    const dispose = () => signal.removeEventListener("abort", onAbort)
    const promise = future.promise.finally(dispose)

    return new Disposer(promise, dispose)
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

  static waitOrThrow<M extends ErrorEvents>(target: SuperEventTarget<M>) {
    return target.wait("error", (future: Future<never>, event) => {
      future.reject(ErroredError.from(event))
      return new None()
    })
  }

  static tryWait<M extends ErrorEvents>(target: SuperEventTarget<M>) {
    return target.wait("error", (future: Future<Err<ErroredError>>, event) => {
      future.resolve(new Err(ErroredError.from(event)))
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

  static waitOrThrow<M extends CloseEvents>(target: SuperEventTarget<M>) {
    return target.wait("close", (future: Future<never>, event) => {
      future.reject(ClosedError.from(event))
      return new None()
    })
  }

  static tryWait<M extends CloseEvents>(target: SuperEventTarget<M>) {
    return target.wait("close", (future: Future<Err<ClosedError>>, event) => {
      future.resolve(new Err(ClosedError.from(event)))
      return new None()
    })
  }

}