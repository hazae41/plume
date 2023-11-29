# Plume

Typed async events with sequenced and parallel dispatching

```bash
npm i @hazae41/plume
```

[**Node Package 📦**](https://www.npmjs.com/package/@hazae41/plume)

## Features

### Current features
- 100% TypeScript and ESM
- No external dependency
- Rust-like patterns
- Type-safe event dispatching and listening
- Event listeners can return values
- Sequenced and parallel dispatching
- Wait for events with composition

## Usage

### Emitters

```tsx
/**
 * Events are described as functions that can accept multiple parameters and return something
 */
type MyEvents = {
  /**
   * This will handle a request and return a response
   */
  request: (data: string) => string,

  /**
   * This will handle a close and return nothing
   */
  close: (reason?: unknown) => void,

  /**
   * This will handle an error and return nothing
   */
  error: (reason?: unknown) => void,
}
```

```tsx
class MyObject {
  /**
   * Composition over inheritance
   */
  readonly events = new SuperEventTarget<MyEvents>()

  /**
   * Dispatch an "error" event with a reason
   **/
  async onError(reason?: unknown) {
    await this.events.emit("error", [reason])
  }

  /**
   * Dispatch a "close" event without a reason
   **/
  async onClose() {
    await this.event.emit("close", [undefined])
  }

  /**
   * Dispatch a "request" event and return the returned response
   */
  async request(data: string): string {
    const response = await this.events.emit("request", [data])

    /**
     * When a listener has returned something
     */
    if (response.isSome())
      return response.get()

    /**
     * When no listener has returned
     */
    throw new Error(`Unhandled`)
  }

}
```

### Listeners

```tsx
const object = new MyObject()

object.on("request", (request: string) => {
  if (request === "hello")
    /**
     * Return something and skip next listeners
     */
    return new Some("world")

  /**
   * Unhandled by this listener
   */
  return new None()
})

object.on("request", (request: string) => {
  if (request === "it")
    /**
     * Return something and skip next listeners
     */
    return new Some("works")

  /**
   * Unhandled by this listener
   */
  return new None()
})

object.on("request", (request: string) => {
  if (request === "have")
    /**
     * Return something and skip next listeners
     */
    return new Some("fun")

  /**
   * Unhandled by this listener
   */
  return new None()
})
```

### Sequenced dispatching (default)

You can use sequenced listening using `passive: false` (or `passive: undefined`)

The listeners will be called one after the other

When a listener returns something, it will skip all other listeners

```tsx
for (const listener of listeners) {
  const returned = await listener(...)

  if (returned.isSome())
    return returned

  continue
}

return new None()
```

```tsx
/**
 * This listener will be called first
 */
myObject.events.on("message", async (message: string) => {
  await doSometing(message)

  return new Some(1)
}, { passive: false })

/**
 * This listener will be skipped
 */
myObject.events.on("message", async (message: string) => {
  await doSometing2(message)

  return new Some(2)
}, { passive: false })

/**
 * Some(1)
 */
console.log(await myObject.emit("message", ["hello world"]))
```

### Parallel dispatching

Parallel listening using `passive: true`

Both listeners will be called at the same time

Their result will be retrieved with `Promise.all`

```tsx
const promises = new Array<Promise<...>>()

for (const listener of listeners)
  promises.push(listener(...))

const returneds = await Promise.all(promises)

for (const returned of returneds)
  if (returned.isSome())
    return returned

return new None()
```

```tsx
/**
 * This listener will be called first
 */
myObject.events.on("message", async (message: string) => {
  await doSometing(message)

  return new Some(1)
}, { passive: true })

/**
 * This listener will be called too
 */
myObject.events.on("message", async (message: string) => {
  await doSometing(e.data)

  return new Some(2)
}, { passive: true })

/**
 * Some(1)
 */
console.log(await myObject.emit("message", ["hello world"]))
```

### Waiting for an event

In this example we have a target with a `send()` method and a `message` event

We want to send a message with some ID and wait for a reply with the same ID, skipping replies with other ID

Waiting is always done using `passive: true`

```tsx
import { Future } from "@hazae41/future"

async function requestAndWait(id: number, request: string): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text: request })

  const response = await socket.wait("message", async (future: Future<string>, message) => {
    /**
     * Only wait for a message with the same id
     */
    if (message.id === id) {
      /**
       * Resolve with the text
       */
      future.resolve(message.text)

      /**
       * Do not skip other listeners
       */
      return new None()
    }

    /**
     * Do not skip other listeners
     */
    return new None()
  })

  return response
}
```

### Composing waiters with automatic disposal

Same as above but this time the event is raced with other events in a composable way

When one event is resolved or rejected, it will stop listening to the other (it is disposed by the `using` keyword)

```tsx
import { Future } from "@hazae41/future"

async function requestAndWaitOrClose(id: number, request: string): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text: request })

  /**
   * Resolve on message
   */
  using event = socket.wait("message", async (future: Future<string>, message) => {
    if (message.id === id) {
      future.resolve(message.text)
      return new None()
    }

    return new None()
  })

  /**
   * Reject on close
   */
  using close = socket.wait("close", (future: Future<never>) => {
    future.reject(new Error("Closed"))
    return new None()
  })
  
  return await Promise.race([event, close])
}
```

Plume provides some helper functions for doing this with fewer lines of code

```tsx
import { Future } from "@hazae41/future"

async function requestAndWaitOrCloseOrErrorOrSignal(id: number, request: string, signal: AbortSignal): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text: request })

  /**
   * Resolve on message
   */
  using event = socket.wait("message", async (future: Future<string>, message) => {
    if (message.id === id) {
      future.resolve(message.text)
      return new None()
    }

    return new None()
  })

  /**
   * Reject on signal
   */
  using abort = Plume.AbortedError.waitOrThrow(signal)

  /**
   * Reject on error (only if the target has an "error" event)
   */
  using error = Plume.ErroredError.waitOrThrow(socket)

  /**
   * Reject on close (only if the target has a "close" event)
   */
  using close = Plume.ClosedError.waitOrThrow(socket)

  return await Promise.race([event, close, error, abort])
}
```

And it provides helpers for common error-close-signal patterns

```tsx
import { Future } from "@hazae41/future"

async function requestAndWaitOrCloseOrErrorOrSignal(id: number, request: string, signal: AbortSignal): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text: request })

  const response = await Plume.waitOrCloseOrErrorOrSignal(socket, "message", async (future: Future<string>, message) => {
    if (message.id === id) {
      future.resolve(message.text)
      return new None()
    }

    return new None()
  }, signal)

  return response
}
```