import { Nullable } from "@/libs/nullable/mod.ts";
import { Awaitable } from "@/libs/promises/mod.ts";

export interface DataEventInit<D> extends EventInit {
  readonly data: D
}

export class DataEvent<D> extends Event {

  readonly data: D

  constructor(type: string, init: DataEventInit<D>) {
    super(type, init)

    this.data = init.data

    return
  }

}

export class ExtendableEvent extends Event {

  #extension: Promise<unknown> = Promise.resolve()

  get extension(): Promise<unknown> {
    return this.#extension
  }

  waitUntil(promise: Promise<unknown>) {
    this.#extension = this.#extension.then(() => promise)
  }

}

export class RespondableEvent<R> extends ExtendableEvent {

  #response?: Promise<R>

  get response(): Nullable<Promise<R>> {
    return this.#response
  }

  respondWith(response: Awaitable<R>) {
    this.#response = Promise.resolve(response)
  }

}

export class DataRespondableEvent<D, R> extends RespondableEvent<R> {

  readonly data: D

  constructor(type: string, init: DataEventInit<D>) {
    super(type)

    this.data = init.data

    return
  }

}