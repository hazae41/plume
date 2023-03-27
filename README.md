# Plume

DOM-like async events with both sequenced and parallel dispatching

```bash
npm i @hazae41/plume
```

[**Node Package 📦**](https://www.npmjs.com/package/@hazae41/plume)

## Features

### Current features
- 100% TypeScript and ESM
- No external dependency
- DOM-like syntax: addEventListener, dispatchEvent
- Type-safe event dispatching and listening
- Sequenced and parallel dispatching
- Helpers to wait for an event using future

## Usage

### Typed async event target

```tsx
type MyObjectEvents = {
  close: CloseEvent,
  error: ErrorEvent,
  message: MessageEvent<string>
}

class MyObject extends AsyncEventTarget<MyObjectEvents> {

  async close() {
    /**
     * Dispatch a CloseEvent on "close", the second argument is optional and is only for type checking
     **/
    await this.dispatchEvent(new CloseEvent("close"), "close")
  }

  async error(error?: unknown) {
    /**
     * Dispatch an ErrorEvent on "error", the second argument is optional and is only for type checking
     **/
    await this.dispatchEvent(new ErrorEvent("error", { error }), "error")
  }

  async message(data: string) {
    /**
     * Dispatch a MessageEvent on "message", the second argument is optional and is only for type checking
     **/
    await this.dispatchEvent(new MessageEvent("message", { data }), "message")
  }

}
```

### Sequenced and parallel dispatching

When using `passive: false` (default), the listener will be called sequencially, so it will block other active listeners and block passive listeners

When using `passive: true`, the listener will be called in parallel, so it won't block any other listener (think of Promise.all but for events)

```tsx
const myObject = new MyObject()

/**
 * Sequenced listening using passive: false
 **/

myObject.addEventListener("message", async (e: MessageEvent<string>) => {
  /**
   * This will be called first
   **/
  await doSometing(e.data)
}, { passive: false })

/**
 * Parallel listening using passive: true
 **/

myObject.addEventListener("message", async (e: MessageEvent<string>) => {
  /**
   * This will be called after, at the same time as below
   **/
  await doSometing(e.data)
}, { passive: true })

myObject.addEventListener("message", async (e: MessageEvent<string>) => {
  /**
   * This will be called after, at the same time as above
   **/
  await doSometing(e.data)
}, { passive: true })
```

### Waiting for an event

In this example we have an AsyncEventTarget called MySocket which has a `send()` method and a `message` event

We want to send a message with some ID and wait for a reply with the same ID, and clean afterward

```tsx
import { Plume } from "@hazae41/plume"
import { Future } from "@hazae41/future"

async function sendMessageAndWaitForReply(id: number, text: string): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text })

  const future = new Future<string>()

  /**
   * Filter and map events based on the ID
   **/
  const onEvent = (e: MessageEvent<{ id: number, text: string }>) => {
    if (e.data.id !== id) return
    future.resolve(e.data.text)
  }

  try {
    socket.addEventListener("message", onEvent)

    return await future.promise /*string*/
  } finally {
    socket.removeEventListener("message", onEvent)
  }
}
```

### Waiting for an event with an abort signal

```tsx
import { Plume } from "@hazae41/plume"
import { Future } from "@hazae41/future"

async function sendMessageAndWaitForReply(id: number, text: string, signal?: AbortSignal): Promise<string> {
  const socket = new MySocket()

  socket.send({ id, text })

  const future = new Future<string>()

  /**
   * Filter and map events based on the ID
   **/
  const onEvent = (e: MessageEvent<{ id: number, text: string }>) => {
    if (e.data.id !== id) return
    future.resolve(e.data.text)
  }

  return await Plume.waitMap(socket, "message", { onEvent, future, signal })  /*string*/
}
```