def merge(intervals):
    intervals = sorted(intervals)                    # @ Sort by start, so intervals that overlap end up next to each other.
    merged = []
    for i, (start, end) in enumerate(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)  # @ [{start}, {end}] starts before the last merged interval ends, so it joins it: now {merged[-1]}.
        else:
            merged.append([start, end])              # @ [{start}, {end}] starts after the last merged interval ends, so it begins a new one.
    return merged                                    # @ {len(merged)} interval{'s' if len(merged) != 1 else ''} after merging.
