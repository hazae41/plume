import { Future } from "@hazae41/future"
import { SuperEventTarget } from "./target.js"

export type ErrorEvents = {
  error: (reason?: unknown) => void
}

export function rejectOnError<M extends ErrorEvents>(target: SuperEventTarget<M>) {
  return target.wait("error", (future: Future<never>, ...[cause]) => future.reject(new Error("Errored", { cause })))
}