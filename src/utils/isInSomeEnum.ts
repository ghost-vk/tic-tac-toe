export const isInSomeEnum =
  <T>(e: T) => (token: unknown): token is T[keyof T] => {
    return Object.values(e).includes(token as T[keyof T]);
  }
