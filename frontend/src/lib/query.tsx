import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type QueryKey = readonly unknown[];

type QueryCache = {
  values: Map<string, unknown>;
  listeners: Map<string, Set<() => void>>;
};

const QueryContext = createContext<QueryCache | null>(null);

export function QueryProvider({ children }: { children: ReactNode }) {
  const cache = useMemo<QueryCache>(() => ({ values: new Map(), listeners: new Map() }), []);
  return <QueryContext.Provider value={cache}>{children}</QueryContext.Provider>;
}

function useQueryCache(): QueryCache {
  const cache = useContext(QueryContext);
  if (!cache) throw new Error("QueryProvider is missing.");
  return cache;
}

function serializeKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

export function useQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  retry?: boolean;
}) {
  const cache = useQueryCache();
  const key = serializeKey(queryKey);
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const [data, setData] = useState<T | undefined>(() => cache.values.get(key) as T | undefined);
  const [error, setError] = useState<unknown>(null);
  const [isFetching, setIsFetching] = useState(false);

  const execute = useCallback(async () => {
    if (!enabled) return undefined;
    setIsFetching(true);
    setError(null);
    try {
      const value = await queryFnRef.current();
      cache.values.set(key, value);
      setData(value);
      return value;
    } catch (nextError) {
      setError(nextError);
      return undefined;
    } finally {
      setIsFetching(false);
    }
  }, [cache, enabled, key]);

  useEffect(() => {
    const cached = cache.values.get(key) as T | undefined;
    setData(cached);
    setError(null);
    if (enabled && cached === undefined) void execute();

    const listeners = cache.listeners.get(key) ?? new Set<() => void>();
    listeners.add(execute);
    cache.listeners.set(key, listeners);
    return () => {
      listeners.delete(execute);
      if (listeners.size === 0) cache.listeners.delete(key);
    };
  }, [cache, enabled, execute, key]);

  return {
    data,
    error,
    isError: error != null,
    isFetching,
    isLoading: enabled && data === undefined && error == null,
    refetch: execute,
  };
}

export function useMutation<TData, TVariables = void>({
  mutationFn,
  onSuccess,
  onError,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => unknown | Promise<unknown>;
  onError?: (error: Error, variables: TVariables) => unknown | Promise<unknown>;
}) {
  const [isPending, setIsPending] = useState(false);
  const [variables, setVariables] = useState<TVariables | undefined>();

  const mutateAsync = useCallback(
    async (nextVariables: TVariables) => {
      setVariables(nextVariables);
      setIsPending(true);
      try {
        const data = await mutationFn(nextVariables);
        await onSuccess?.(data, nextVariables);
        return data;
      } catch (value) {
        const error = value instanceof Error ? value : new Error("Request failed.");
        await onError?.(error, nextVariables);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, onError, onSuccess],
  );

  const mutate = useCallback(
    (nextVariables: TVariables) => {
      void mutateAsync(nextVariables).catch(() => undefined);
    },
    [mutateAsync],
  );

  return { isPending, mutate, mutateAsync, variables };
}

export function useQueryClient() {
  const cache = useQueryCache();
  return useMemo(
    () => ({
      async invalidateQueries({ queryKey }: { queryKey: QueryKey }) {
        const prefix = serializeKey(queryKey).slice(0, -1);
        const matches = [...cache.listeners.entries()].filter(([key]) => key.startsWith(prefix));
        await Promise.all(
          matches.flatMap(([, listeners]) => [...listeners].map((listener) => listener())),
        );
      },
    }),
    [cache],
  );
}
