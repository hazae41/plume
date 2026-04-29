import { DataRespondableEvent } from "@/mod.ts";

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

    await event.extension

    if (event.response != null)
      return await event.response

    throw new Error("Unhandled")
  }

  addEventListener<K extends keyof MyTargetEventMap>(type: K, listener: (e: MyTargetEventMap[K]) => void, options?: AddEventListenerOptions): void

  addEventListener(type: string, callback: (e: Event) => void, options?: AddEventListenerOptions): void

  addEventListener(type: string, callback: (e: Event) => void, options?: AddEventListenerOptions): void {
    return super.addEventListener(type, callback, options)
  }

}

const target = new MyTarget()

target.addEventListener("request", event => {
  event.waitUntil(Promise.try(async () => {
    console.log("Waiting for 1 second...")

    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log("Done waiting")
  }))
})

target.addEventListener("request", event => {
  event.waitUntil(event.extension.then(async () => {
    console.log("Waiting for 1 second again...")

    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log("Done waiting again")
  }))
})

target.addEventListener("request", event => {
  event.respondWith(new Response("Hello, world!"))
})

const response = await target.request(new Request("https://example.com/"))

console.log(await response.text())
