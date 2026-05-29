import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * fetcher({ limit, cursor, signal }) => {
 *   items: [],
 *   nextCursor,
 *   hasMore
 * }
 */

export default function useInfiniteList(
  fetcher,
  { limit = 20, autoLoad = true } = {}
) {
  // -------------------------
  // STATE MACHINE CORE
  // -------------------------
  const [status, setStatus] = useState("idle");
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  // -------------------------
  // REFS (single source of truth for runtime)
  // -------------------------
  const cursorRef = useRef(null);
  const itemsRef = useRef([]);
  const hasMoreRef = useRef(true);
  const statusRef = useRef("idle");
  const fetcherRef = useRef(fetcher);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // -------------------------
  // SAFE FETCH CORE
  // -------------------------
  const runFetch = useCallback(async ({ cursor = null, append = false }) => {
    if (inFlightRef.current) return;
    if (statusRef.current === "loading" || statusRef.current === "loadingMore") return;
    if (append && !hasMoreRef.current) return;
    if (!append && didInitRef.current && statusRef.current !== "idle") return;

    const isInitial = !append;

    if (isInitial) {
      didInitRef.current = true;
    }

    if (append && !hasMoreRef.current) return;

    statusRef.current = isInitial ? "loading" : "loadingMore";
    setStatus(isInitial ? "loading" : "loadingMore");
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    try {
      const res = await fetcherRef.current({
        limit,
        cursor,
        signal: controller.signal,
      });

      const newItems = res.items || res.notifications || [];
      const next = res.nextCursor || null;
      const hasMore = res.hasMore ?? newItems.length === limit;

      setItems(prev => {
        const merged = append ? [...prev, ...newItems] : newItems;
        itemsRef.current = merged;
        return merged;
      });

      cursorRef.current = next;
      hasMoreRef.current = hasMore;

      statusRef.current = hasMore ? "ready" : "done";
      setStatus(hasMore ? "ready" : "done");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err);
      statusRef.current = "error";
      setStatus("error");
    } finally {
      inFlightRef.current = false;
      abortRef.current = null;
    }
  }, [limit]);

  // -------------------------
  // INITIAL LOAD
  // -------------------------
  const loadInitial = useCallback(() => {
    cursorRef.current = null;
    itemsRef.current = [];
    hasMoreRef.current = true;
    didInitRef.current = true;
    setItems([]);
    return runFetch({ cursor: null, append: false });
  }, [runFetch]);

  // -------------------------
  // LOAD MORE (PAGINATION)
  // -------------------------
  const loadMore = useCallback(() => {
    if (statusRef.current !== "ready") return;
    if (statusRef.current === "loading" || statusRef.current === "loadingMore") return;
    if (!hasMoreRef.current) return;
    if (abortRef.current) return;

    return runFetch({
      cursor: cursorRef.current,
      append: true,
    });
  }, [runFetch]);

  // -------------------------
  // RESET (SAFE ENTRY POINT)
  // -------------------------
  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    didInitRef.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;
    statusRef.current = "idle";
    setStatus("idle");
    setItems([]);
    setError(null);

    queueMicrotask(() => {
      if (autoLoad) loadInitial();
    });
  }, [autoLoad, loadInitial]);

  // -------------------------
  // PREPEND (SSE SAFE)
  // -------------------------
  const prependItems = useCallback((incoming = []) => {
    if (!incoming.length) return;

    setItems(prev => {
      const ids = new Set(prev.map(i => i?.id));
      const filtered = incoming.filter(i => i && !ids.has(i.id));
      const merged = [...filtered, ...prev];
      itemsRef.current = merged;
      return merged;
    });
  }, []);

  const updateItem = useCallback((id, patch = {}) => {
    if (!id) return;

    setItems(prev => {
      const next = prev.map(item => (
        item?.id === id ? { ...item, ...patch } : item
      ));
      itemsRef.current = next;
      return next;
    });
  }, []);

  const updateItems = useCallback((updates = []) => {
    if (!updates.length) return;

    setItems(prev => {
      const updatesById = new Map(updates.filter(item => item?.id).map(item => [item.id, item]));
      const next = prev.map(item => (
        updatesById.has(item?.id) ? { ...item, ...updatesById.get(item.id) } : item
      ));
      itemsRef.current = next;
      return next;
    });
  }, []);

  // -------------------------
  // OBSERVER (ONLY 1 LIFECYCLE)
  // -------------------------
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;

    // disconnect any existing observer before attaching a new one
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (statusRef.current === "ready") loadMore();
      }
    });

    observer.observe(el);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, [loadMore]);

  // -------------------------
  // AUTO INIT (STRICT, ONCE ONLY)
  // -------------------------
  useEffect(() => {
    if (!autoLoad) return;
    if (didInitRef.current) return;

    loadInitial();
  }, [autoLoad, loadInitial]);

  return {
    items,
    error,
    status,
    sentinelRef,

    loadInitial,
    loadMore,
    reset,

    prependItems,
    updateItem,
    updateItems,

    hasMore: hasMoreRef.current,
    loading: status === "loading",
    isLoading: status === "loading",
    isLoadingMore: status === "loadingMore",
  };
}
