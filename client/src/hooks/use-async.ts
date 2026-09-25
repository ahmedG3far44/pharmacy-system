import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncState<T> = { data: T | null; loading: boolean; error: string | null };
export function useAsync<T>(task: () => Promise<T>, dependencies: unknown[] = [], immediate = true) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: immediate, error: null });
  const taskRef = useRef(task); taskRef.current = task;
  const run = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try { const data = await taskRef.current(); setState({ data, loading: false, error: null }); return data; }
    catch (error) { const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'; setState((current) => ({ ...current, loading: false, error: message })); throw error; }
  }, dependencies);
  useEffect(() => { if (immediate) void run().catch(() => undefined); }, [run, immediate]);
  return { ...state, run, setData: (data: T) => setState({ data, loading: false, error: null }) };
}
