export class Cleanable<T> {

  constructor(
    readonly inner: T,
    readonly cleanup: () => void
  ) { }

  /**
   * Cleanly await `this.inner`
   * @returns 
   */
  async await(): Promise<Awaited<T>> {
    try {
      return await this.inner
    } finally {
      this.cleanup()
    }
  }
}

export namespace Cleanable {

  export async function race<T>(cleanables: Cleanable<Promise<T>>[]) {
    const promises = new Array<Promise<T>>(cleanables.length)
    const cleanups = new Array<() => void>(cleanables.length)

    for (let i = 0; i < cleanables.length; i++) {
      promises[i] = cleanables[i].inner
      cleanups[i] = cleanables[i].cleanup
    }

    try {
      return await Promise.race(promises)
    } finally {
      cleanups.forEach(it => it())
    }
  }

}