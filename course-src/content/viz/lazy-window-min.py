from collections import Counter
from heapq import heappop, heappush


def window_minimums(nums, k):
    heap = []         # every number pushed so far, smallest on top
    gone = Counter()  # numbers that left the window but may still be in the heap
    mins = []
    for i, x in enumerate(nums):
        heappush(heap, x)                 # @ {x} enters the window, so it's pushed onto the heap.
        if i >= k:
            gone[nums[i - k]] += 1        # @ {nums[i - k]} leaves the window. Digging it out of the heap would be slow, so it stays there, marked as gone.
        while gone[heap[0]]:
            gone[heap[0]] -= 1
            heappop(heap)                 # @ The number on top had been marked as gone, so it's popped now, at no extra cost.
        if i >= k - 1:
            mins.append(heap[0])          # @ The top is still in the window, so it's the minimum: {heap[0]}. The heap holds {len(heap)} entries for {k} live numbers.
    return mins                           # @ The minimum of every window: {mins}.
