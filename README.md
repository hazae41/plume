# Plume

Respondable and extendable events for the web

```bash
npm i @hazae41/plume
```

[**NPM 📦**](https://www.npmjs.com/package/@hazae41/plume)

## Features

### Current features
- 100% TypeScript and ESM
- No external dependency
- Web-like patterns

## Usage

Plume provides a few events:
- DataEvent, an Event with some data
- ExtendableEvent, an Event with waitUntil
- RespondableEvent, an ExtendableEvent with respondWith
- DataExtendableEvent, an ExtendableEvent and DataEvent
- DataRespondableEvent, a RespondableEvent and DataEvent

You can create some event target with its own events

```tsx
import { DataRespondableEvent } from "@hazae41/plume" 

export interface MyTargetEventMap {
  close: CloseEvent

  error: ErrorEvent

  request: DataRespondableEvent<Request, Response>,
}

export class MyTarget extends EventTarget {

  close(reason?: string) {
    this.dispatchEvent(new CloseEvent("close", { reason }))
  }

  error(error?: unknown) {
    this.dispatchEvent(new ErrorEvent("error", { error }))
  }

  async request(data: Request): Promise<Response> {
    const event = new DataRespondableEvent<Request, Response>("request", { data })

    this.dispatchEvent(event)

    /**
     * Wait for all extensions
     */
    await event.extension

    /**
     * Wait for the response if any
     */
    if (event.response != null)
      return await event.response

    /**
     * Throw if no response
     */
    throw new Error("Unhandled")
  }

  addEventListener<K extends keyof MyTargetEventMap>(type: K, listener: (e: MyTargetEventMap[K]) => void, options?: AddEventListenerOptions): void

  addEventListener(type: string, callback: (e: Event) => void, options?: AddEventListenerOptions): void

  addEventListener(type: string, callback: (e: Event) => void, options?: AddEventListenerOptions): void {
    return super.addEventListener(type, callback, options)
  }

}
```

And then plug some listeners to it

```tsx
const target = new MyTarget()

target.addEventListener("request", event => {
  /**
   * Wait for 1 second
   */
  event.waitUntil(new Promise(ok => setTimeout(ok, 1000)))
})

target.addEventListener("request", event => {
  /**
   * Respond synchronously
   */
  event.respondWith(new Response("Hello, world!"))
})

const request = new Request("https://example.com/")
const response = await target.request(request)

console.log(await response.text())
```