import "@hazae41/symbol-dispose-polyfill";

import { Future } from "@hazae41/future";
import { Some } from "@hazae41/option";
import { assert, test } from "@hazae41/phobos";
import { relative, resolve } from "path";
import { SuperEventTarget } from "./target.js";
import { waitWithCloseAndErrorOrThrow } from "./waiters.js";

const directory = resolve("./dist/test/")
const { pathname } = new URL(import.meta.url)
console.log(relative(directory, pathname.replace(".mjs", ".ts")))

test("AsyncEventTarget", async ({ test, wait }) => {
  const target = new SuperEventTarget<{
    test: (order: "first" | "second") => number
    error: (reason: unknown) => void
    close: (reason: unknown) => void
  }>()

  const stack = new Array<string>()

  target.on("test", async (order) => {
    console.log("on first", order)

    if (order !== "first")
      return

    stack.push(order)

    return new Some(123)
  }, { passive: true })

  target.on("test", async (order) => {
    console.log("on second", order)

    if (order !== "second")
      return

    stack.push(order)

    return new Some(456)
  }, { passive: true })

  test("wait", async () => {
    const signal = AbortSignal.timeout(1000)

    const first = await waitWithCloseAndErrorOrThrow(target, "test", (future: Future<string>, order) => {
      future.resolve(order)
    }, signal)

    console.log("wait first", first)

    const signal2 = AbortSignal.timeout(1000)

    const second = await waitWithCloseAndErrorOrThrow(target, "test", (future: Future<string>, order) => {
      future.resolve(order)
    }, signal2)

    console.log("wait second", second)
  })

  await new Promise(ok => setTimeout(ok, 100))

  const first = await target.emit("test", "first")
  console.log("emit first", first)
  assert(first.isSome(), "Event has not been handled")

  await new Promise(ok => setTimeout(ok, 100))

  const second = await target.emit("test", "second")
  console.log("emit second", second)
  assert(second.isSome(), "Event has not been handled")

  stack.push("done")

  await wait()

  assert(stack.length === 3)
  assert(stack[0] === "first")
  assert(stack[1] === "second")
  assert(stack[2] === "done")
})