import { Some } from "@hazae41/option";
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
  const target = new SuperEventTarget<{ test: "hello" }>()

  const stack = new Array<string>()

  target.on("test", async () => {
    stack.push("first")
    return Ok.void()
  }, { passive: true })

  target.on("test", async () => {
    stack.push("second")
    return Ok.void()
  }, { passive: true })

  test("wait", async () => {
    const signal = AbortSignal.timeout(1000)

    const r = await tryWaitOrSignal(target, "test", e => {
      return new Ok(new Some(new Ok(`${e} world`)))
    }, signal).then(r => r.unwrap())

    console.log(r)
  })

  // await new Promise(ok => setTimeout(ok, 1000))

  const result = await target.tryEmit("test", "hello")

  assert(result.isOk(), "Event is Ok")

  result.ignore()

  stack.push("done")

  assert(stack.length === 3)
  assert(stack[0] === "first")
  assert(stack[1] === "second")
  assert(stack[2] === "done")
})