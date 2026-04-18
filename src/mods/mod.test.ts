import { DataRespondableEvent } from "@/mod.ts";

export interface MyTargetEventMap {
  request: DataRespondableEvent<Request, Response>,

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

    await event.extension

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

const target = new MyTarget()

target.addEventListener("request", event => {
  event.waitUntil(event.extension.then(async () => {
    console.log("Waiting 1 second...")

    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log("Done waiting")
  }))
})

target.addEventListener("request", event => {
  event.waitUntil(event.extension.then(async () => {
    console.log("Waiting 1 second again...")

    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log("Done waiting again")
  }))
})

target.addEventListener("request", event => {
  event.stopImmediatePropagation()
  event.respondWith(new Response("Hello, world!"))
})

const response = await target.request(new Request("https://example.com/"))

console.log(await response.text())
