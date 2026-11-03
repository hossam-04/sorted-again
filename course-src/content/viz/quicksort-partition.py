def partition(nums):
    lo, hi = 0, len(nums) - 1
    pivot = nums[hi]                                 # @ The pivot is the last number, {pivot}. Everything else will end up on its left or its right.
    i = lo                                           # @ i marks where the next number smaller than {pivot} will go. Positions before i hold the small ones.
    for j in range(lo, hi):
        if nums[j] < pivot:                          # @ {(str(nums[j]) + ' < ' + str(pivot) + ', so it belongs on the left.') if nums[j] < pivot else (str(nums[j]) + ' ≥ ' + str(pivot) + ', so it stays on the right. Only j moves on.')}
            nums[i], nums[j] = nums[j], nums[i]      # @ Swap it into position {i}, the end of the small part.
            i += 1                                   # @ The small part now covers {'position 0' if i == 1 else 'positions 0 to ' + str(i - 1)}.
    nums[i], nums[hi] = nums[hi], nums[i]            # @ Finally, swap the pivot into position {i}, between the two parts.
    return i                                         # @ {pivot} is at position {i}, where it will be in the sorted list: smaller numbers on its left, the rest on its right. Quicksort now sorts each side on its own.
