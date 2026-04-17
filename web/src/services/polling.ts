export interface PollingHandle {
  stop: () => void;
  tickNow: () => void;
}

export function startPolling(intervalMs: number, onTick: () => void | Promise<void>): PollingHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      if (stopped) return;
      try {
        await onTick();
      } finally {
        schedule();
      }
    }, intervalMs);
  };

  // immediate first tick
  (async () => {
    try {
      await onTick();
    } finally {
      schedule();
    }
  })();

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    tickNow() {
      if (timer) clearTimeout(timer);
      (async () => {
        try {
          await onTick();
        } finally {
          schedule();
        }
      })();
    },
  };
}
