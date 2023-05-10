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
- Sequenced and parallel dispatching
- Helpers to safely wait for an event

## Usage

### Typed async event target

```tsx
type MyEvents = {
  message: string,
  close: unknown,
  error: unknown,
}

class MyObject {
  readonly events = new SuperEventTarget<MyEvents>()

  async message(data: string) {
    /**
     * Dispatch a "message" event and throw if one of the listeners returned an error
     **/
    await this.events.tryEmit("message", data).unwrap()
  }

  async error(error?: unknown) {
    /**
     * Dispatch an "error" event with an Error and throw if one of the listeners returned an error
     **/
    await this.events.tryEmit("error", new Error("MyObject errored", { cause })).unwrap()
  }

  async close() {
    /**
     * Dispatch a "close" event with an Error and throw if one of the listeners returned an error
     **/
    await this.event.tryEmit("close", new Error("MyObject closed")).unwrap()
  }

}
```

### Sequenced and parallel dispatching

When using `passive: false` (default), the listener will be called sequencially, so it will block other active listeners and block passive listeners

When using `passive: true`, the listener will be called in parallel, so it won't block any other listener (think of Promise.all but for events)

```tsx
const myObject = new MyObject()
```

#### Sequenced dispatching

Sequenced listening using `passive: false`

The listeners will be called one after the other

```tsx
myObject.events.on("message", async (message: string) => {
  await doSometing(message)

  /**
   * Return Ok if the event has been handled successfully
   **/
  return Ok.void()
}, { passive: false })

myObject.events.on("message", async (message: string) => {
  await doSometing(message)

  return Ok.void()
}, { passive: false })
```

#### Parallel dispatching

Parallel listening using `passive: true`

Both listeners will be called at the same time

```tsx
myObject.events.on("message", async (message: string) => {
  await doSometing(message)

  return Ok.void()
}, { passive: true })

myObject.events.on("message", async (message: string) => {
  await doSometing(e.data)

  return Ok.void()
}, { passive: true })
```

### Waiting for an event

In this example we have an AsyncEventTarget called MySocket which has a `send()` method and a `message` event

We want to send a message with some ID and wait for a reply with the same ID, skipping replies with other ID

We use `Ok` to signal to the dispatcher that the event has been successfully handled

We use `Some` to signal to the waiter we want to stop listening and return something

```tsx
import { Plume } from "@hazae41/plume"
import { Future } from "@hazae41/future"

async function sendMessageAndWaitForReply(id: number, text: string): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text })

  const reply = await socket.wait("message", async (msg) => {
    if (msg.id === id)
      return new Ok(new Some(msg.text)) // Return msg.text and stop listening for events
    return new Ok(new None()) // Continue and wait for next event
  }).await()

  return reply
}
```

### Waiting for an event with an abort signal

Same as above but this time the event is raced with an AbortSignal, if the signal is aborted before we get a reply, it will stop listening and return an error

This time, we wrap `msg.text` in an extra `Ok` to signal to the waiter that the listening has not been aborted (the signal will return `Err` if aborted)

```tsx
import { Plume } from "@hazae41/plume"
import { Future } from "@hazae41/future"

async function sendMessageAndWaitForReply(id: number, text: string, signal: AbortSignal): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text })

  const reply = await tryWait(socket, "message", async (msg) => {
    if (msg.id === id)
      return new Ok(new Some(new Ok(msg.text))) // Return msg.text and stop listening for events
    return new Ok(new None()) // Continue and wait for next event
  }, signal).then(r => r.unwrap())
  
  return reply
}
```