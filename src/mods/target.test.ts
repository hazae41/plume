import { None, Some } from "@hazae41/option";
import { assert, test } from "@hazae41/phobos";
import { Debug, Ok } from "@hazae41/result";
import { relative, resolve } from "path";
import { SuperEventTarget } from "./target.js";
import { tryWaitOrSignal } from "./waiters.js";

const directory = resolve("./dist/test/")
const { pathname } = new URL(import.meta.url)
console.log(relative(directory, pathname.replace(".mjs", ".ts")))

Debug.debug = true

test("AsyncEventTarget", async ({ test }) => {
  const target = new SuperEventTarget<{
    test: (order: "first" | "second") => number
  }>()

  const stack = new Array<string>()

  target.on("test", async (order) => {
    if (order !== "first")
      return new None()

    console.log("first", order)
    stack.push(order)
    return new Some(123)
  }, { passive: true })

  target.on("test", async (order) => {
    console.log("second", order)

    if (order !== "second")
      return new None()

    stack.push(order)
    return new Some(456)
  }, { passive: true })

  test("wait", async () => {
    const signal = AbortSignal.timeout(1000)

    const first = await tryWaitOrSignal(target, "test", order => {
      return new Some(new Ok(order))
    }, signal).then(r => r.unwrap())

    console.log("got", first)

    const second = await tryWaitOrSignal(target, "test", order => {
      return new Some(new Ok(order))
    }, signal).then(r => r.unwrap())

    console.log("got", second)
  })

  // await new Promise(ok => setTimeout(ok, 1000))

  const first = await target.emit("test", ["first"])
  console.log("returned", first)
  assert(first.isSome(), "Event has not been handled")

  const second = await target.emit("test", ["second"])
  console.log("returned", second)
  assert(second.isSome(), "Event has not been handled")

  stack.push("done")

  assert(stack.length === 3)
  assert(stack[0] === "first")
  assert(stack[1] === "second")
  assert(stack[2] === "done")
})