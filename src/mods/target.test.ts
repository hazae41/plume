import { Some } from "@hazae41/option";
import { assert, test } from "@hazae41/phobos";
import { Ok } from "@hazae41/result";
import { relative, resolve } from "path";
import { SuperEventTarget } from "./target.js";

const directory = resolve("./dist/test/")
const { pathname } = new URL(import.meta.url)
console.log(relative(directory, pathname.replace(".mjs", ".ts")))

test("AsyncEventTarget", async ({ test }) => {
  const target = new SuperEventTarget<{
    test: ["hello", DOMException],
    123: [123, "nooo"]
  }>()

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
    const r = await target.tryWaitEvent("test", (e) => new Some(e.slice(0, 4)), {})
    assert(r.isOk())
    console.log(r.inner)
  })

  const result = await target.tryEmit("test", "hello")

  assert(result.isOk())

  stack.push("done")

  assert(stack.length === 3)
  assert(stack[0] === "first")
  assert(stack[1] === "second")
  assert(stack[2] === "done")
})