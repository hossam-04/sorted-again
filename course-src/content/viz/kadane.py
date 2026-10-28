def max_subarray(nums):
    best = cur = nums[0]                  # @ Start with the first number: the best run so far is just {nums[0]}.
    start = lo = hi = 0
    for i in range(1, len(nums)):
        if cur < 0:
            cur, start = nums[i], i       # @ The run so far adds up to less than 0, so drop it and start fresh at {nums[i]}.
        else:
            cur += nums[i]                # @ The run so far is worth keeping: adding {nums[i]} makes it {cur}.
        if cur > best:
            best, lo, hi = cur, start, i  # @ {cur} is the best sum so far: indices {lo} to {hi}.
    return best                           # @ The largest sum of a run is {best}.
