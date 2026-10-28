def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1      # @ If {target} is in the list, it's somewhere in positions {lo}..{hi}.
    while lo <= hi:                # @ {('Positions ' + str(lo) + '..' + str(hi) + ' still hold ' + str(hi - lo + 1) + ' candidate(s).') if lo <= hi else 'lo has passed hi: no candidates are left.'}
        mid = (lo + hi) // 2       # @ Check the middle: position {mid} holds {nums[mid]}.
        if nums[mid] == target:    # @ {'That is the target.' if nums[mid] == target else str(nums[mid]) + ' is not ' + str(target) + '.'}
            return mid             # @ Found {target} at position {mid}.
        if nums[mid] < target:     # @ {(str(nums[mid]) + ' < ' + str(target) + ': the target can only be to the right of ' + str(mid) + '.') if nums[mid] < target else str(nums[mid]) + ' > ' + str(target) + ': the target can only be to the left of ' + str(mid) + '.'}
            lo = mid + 1           # @ Positions up to {mid} are too small, so lo jumps to {lo}.
        else:
            hi = mid - 1           # @ Positions from {mid} on are too big, so hi drops to {hi}.
    return -1                      # @ Nothing is left to check: {target} isn't in the list.
