def count_ones(n):
    count = 0          # @ Count the 1 bits of {n} by clearing them one at a time.
    while n:
        below = n - 1  # @ n - 1 = {below}: the lowest 1 bit of n becomes 0, and every 0 below it becomes 1.
        n = n & below  # @ n & (n - 1) keeps only the bits set in both, so the lowest 1 bit is gone: n = {n}.
        count += 1     # @ One more bit cleared: {count} so far.
    return count       # @ n is 0. Each round cleared one 1 bit, so there were {count}.
