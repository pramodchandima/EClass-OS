/**
 * Telegram Message Queue & Rate Limiter
 * Strictly hardcoded to 25 messages per second (1 message every 40ms).
 * Handles 429 Too Many Requests by respecting retry_after.
 * 
 * FIX: Uses recursive setTimeout (tick pattern) to prevent RangeError: Maximum call stack size exceeded.
 */

type QueueTask = {
    fn: () => Promise<any>;
    resolve: (val: any) => void;
    reject: (err: any) => void;
};

class TelegramQueue {
    private queue: QueueTask[] = [];
    private isProcessing: boolean = false;
    private pauseUntil: number = 0;
    private readonly msBetweenTasks = 40; // 1000ms / 25 = 40ms

    constructor() {
        this.start();
    }

    private start() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.tick();
    }

    /**
     * Add a task to the queue
     */
    async enqueue<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
        });
    }

    /**
     * The background tick processing the queue.
     * Uses setTimeout to clear the call stack and prevent recursion overflows.
     */
    private async tick() {
        try {
            // 1. Check if we are paused (429 handling)
            const now = Date.now();
            if (now < this.pauseUntil) {
                setTimeout(() => this.tick(), Math.max(10, this.pauseUntil - now));
                return;
            }

            // 2. Get next task
            const task = this.queue.shift();
            if (!task) {
                setTimeout(() => this.tick(), 100); // Sleep if empty
                return;
            }

            // 3. Execute task
            try {
                const result = await task.fn();
                task.resolve(result);
            } catch (error: any) {
                // If 429, retry and pause
                if (error?.response?.body?.error_code === 429) {
                    const retryAfter = (error.response.body.parameters?.retry_after ?? 1) * 1000;
                    console.warn(`[TelegramQueue] 429 Detected. Pausing for ${retryAfter}ms`);

                    this.pauseUntil = Date.now() + retryAfter;
                    this.queue.unshift(task); // Put it back at the front
                } else {
                    task.reject(error);
                }
            }

            // 4. Schedule next tick with rate limit delay
            setTimeout(() => this.tick(), this.msBetweenTasks);

        } catch (fatalError) {
            console.error('[TelegramQueue] Critical Tick Error:', fatalError);
            // Ensure the loop continues even on unexpected errors
            setTimeout(() => this.tick(), 1000);
        }
    }
}

// Singleton Queue
export const telegramQueue = new TelegramQueue();
