export type AsyncResult<TData, TError> =
  | [data: undefined, error: TError]
  | [data: TData, error: undefined];

export function asyncResult<TData, TError = unknown>(
  promise: Promise<TData>,
): Promise<AsyncResult<TData, TError>> {
  return Promise.resolve(promise).then(
    (data) => [data, undefined] as [TData, undefined],
    (error) => [undefined, error] as [undefined, TError],
  );
}
