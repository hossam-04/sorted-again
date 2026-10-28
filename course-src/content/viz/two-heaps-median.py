from heapq import heappop, heappush


def running_median(nums):
    low = []   # the smaller half: a max-heap, stored negated
    high = []  # the larger half: a min-heap
    medians = []
    for x in nums:
        if not low or x <= -low[0]:
            heappush(low, -x)                    # @ {x} joins the lower half{': it is the first number' if len(low) + len(high) == 1 else ', since it is no larger than the largest number there'}.
        else:
            heappush(high, x)                    # @ {x} is larger than everything in the lower half, so it joins the upper half.
        if len(low) > len(high) + 1:
            heappush(high, -heappop(low))        # @ The lower half has two numbers too many. Its largest, {high[0]}, moves to the upper half.
        elif len(high) > len(low):
            heappush(low, -heappop(high))        # @ The upper half is bigger. Its smallest, {-low[0]}, moves to the lower half.
        if len(low) > len(high):
            medians.append(-low[0])              # @ An odd count: the median is the top of the lower half, {-low[0]}.
        else:
            medians.append((-low[0] + high[0]) / 2)  # @ An even count: the median is halfway between the two tops, {-low[0]} and {high[0]}: {(-low[0] + high[0]) / 2}.
    return medians
