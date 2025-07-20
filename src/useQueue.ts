import PQueue from "p-queue";
import { useDebounceCallback } from 'usehooks-ts'
import { useRef, useEffect } from "react";

export type QueueReturn = {
    queue: PQueue;
    pause: () => void;
    restart: () => void;
}

/**
 * Hook to create a queue with a specified concurrency limit and pause functionality.
 * @param concurrencyLimit Maximum number of concurrent tasks in the queue
 * @param pauseTime Time in milliseconds to wait before restarting the queue after a pause
 * @param onLoadingChange Optional callback to handle loading state changes. For example, you can use it to show a loading spinner when the queue is processing tasks.
 * @returns A tuple containing the queue, a function to pause the queue, and a function to restart the queue.
 */
export function useQueue(concurrencyLimit: number = 5, pauseTime: number = 1000, onLoadingChange?: (loading: boolean) => void): QueueReturn {
    const queue = useRef<PQueue>(new PQueue({ concurrency: concurrencyLimit }));

    useEffect(() => {
        if (concurrencyLimit != queue.current.concurrency) {
            queue.current = new PQueue({ concurrency: concurrencyLimit });
        }
        
        if (onLoadingChange) {
            queue.current.on("add", () => {
                onLoadingChange(true)
        });
            queue.current.on("idle", () => {
                onLoadingChange(false)
        });
        }
    }, [concurrencyLimit, onLoadingChange]);
    // We only want one restart queued at a time
    const restart = useDebounceCallback(() => queue.current.start(), 1000, {trailing: true});
    // Multiple pauses in succession will create multiple restarts, so we debounce the pause
    const pause = useDebounceCallback(() => {
        // When a pause is requested, we pause the queue and restart it after a delay
        queue.current.pause()
        setTimeout(restart, pauseTime);
    }, 1000, {leading: true});

    return {
        queue: queue.current,
        pause,
        restart
    };
}
