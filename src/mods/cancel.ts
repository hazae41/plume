export class Cancel<T> {
  readonly #class = Cancel

  constructor(
    readonly inner: T
  ) { }

  get() {
    return this.inner
  }

}