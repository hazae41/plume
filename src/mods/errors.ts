import { Future } from "@hazae41/future"
import { None } from "@hazae41/option"
import { SuperEventTarget } from "./target.js"

export class AbortedError extends Error {
  readonly #class = AbortedError
  readonly name = this.#class.name

  constructor(options?: ErrorOptions) {
    super("Aborted", options)
  }

  static from(cause: unknown) {
    return new AbortedError({ cause })
  }

}

export class ErroredError extends Error {
  readonly #class = ErroredError
  readonly name = this.#class.name

  constructor(options?: ErrorOptions) {
    super("Errored", options)
  }

  static from(cause: unknown) {
    return new ErroredError({ cause })
  }

}

export type ErrorEvents = {
  error: (reason?: unknown) => void
}

export namespace ErrorEvents {

  export function waitOrThrow<M extends ErrorEvents>(target: SuperEventTarget<M>) {
    return target.wait("error", (future: Future<never>, ...[reason]) => {
      future.reject(ErroredError.from(reason))
      return new None()
    })
  }

}

export class ClosedError extends Error {
  readonly #class = ClosedError
  readonly name = this.#class.name

  constructor(options?: ErrorOptions) {
    super("Closed", options)
  }

  static from(cause: unknown) {
    return new ClosedError({ cause })
  }

}

export type CloseEvents = {
  close: (reason?: unknown) => void
}

export namespace CloseEvents {

  export function waitOrThrow<M extends CloseEvents>(target: SuperEventTarget<M>) {
    return target.wait("close", (future: Future<never>, ...[reason]) => {
      future.reject(ClosedError.from(reason))
      return new None()
    })
  }

}
