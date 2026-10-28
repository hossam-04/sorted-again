def min_speed(piles, h):
    lo, hi = 1, max(piles)                            # @ The answer is a speed from 1 to {hi}: at {hi} per hour, every pile takes one hour.
    while lo < hi:                                    # @ Speeds {lo}..{hi} are still possible answers.
        k = (lo + hi) // 2                            # @ Try the middle speed, k = {k}.
        hours = sum((p + k - 1) // k for p in piles)  # @ At {k} per hour the piles take {' + '.join([str((p + k - 1) // k) for p in piles])} = {hours} hours.
        if hours <= h:                                # @ {(str(hours) + ' ≤ ' + str(h) + ': fast enough, so the answer is ' + str(k) + ' or slower.') if hours <= h else str(hours) + ' > ' + str(h) + ': too slow, so the answer is faster than ' + str(k) + '.'}
            hi = k                                    # @ Keep {k} as a candidate: hi = {hi}.
        else:
            lo = k + 1                                # @ Rule out {k} and every slower speed: lo = {lo}.
    return lo                                         # @ lo met hi: the slowest speed that works is {lo}.
