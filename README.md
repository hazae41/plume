# Plume

Typed async events with sequenced and parallel dispatching

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

Create some event target with its own events

```tsx
import { DataRespondableEvent } from "@hazae41/plume" 

export interface MyTargetEventMap {
  request: DataRespondableEvent<Request, Response>

  close: CloseEvent

  error: ErrorEvent
}

export class MyTarget extends EventTarget {

  error(error?: unknown) {
    this.dispatchEvent(new ErrorEvent("error", { error }))
  }

  close(reason?: string) {
    this.dispatchEvent(new CloseEvent("close", { reason }))
  }

  async request(data: Request): Promise<Response> {
    const event = new DataRespondableEvent<Request, Response>("request", { data })

    this.dispatchEvent(event)

    if (event.response != null)
      return await event.response

    throw new Error("Unhandled")
  }

  addEventListener<K extends keyof MyTargetEventMap>(type: K, listener: (e: MyTargetEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    return super.addEventListener(type, callback, options)
  }

}
```

Plug some listeners

```tsx
const target = new MyTarget()

target.addEventListener("request", event => {
  event.waitUntil(new Promise(ok => setTimeout(ok, 1000)))
})

target.addEventListener("request", event => {
  event.stopImmediatePropagation()
  event.respondWith(event.extension.then(() => new Response("Hello, world!")))
})

const request = new Request("https://example.com/")
const response = await target.request(request)

console.log(await response.text())
```