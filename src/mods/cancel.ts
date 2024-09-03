export class Cancel<T> {

  constructor(
    readonly inner: T
  ) { }

  get() {
    return this.inner
  }

}