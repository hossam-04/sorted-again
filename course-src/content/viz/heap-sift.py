from heapq import heapify


def push_then_pop(heap, value):
    heapify(heap)                            # @ The numbers arranged as a min-heap: every parent is at most its children.
    heap.append(value)                       # @ Push {value}: it goes in the next free spot, at the end of the list.
    i = len(heap) - 1
    while i > 0:
        p = (i - 1) // 2  # the parent's index
        if heap[p] <= heap[i]:
            break                            # @ {heap[p]} ≤ {heap[i]}: the parent is no larger, so the heap is in order again.
        heap[p], heap[i] = heap[i], heap[p]  # @ {heap[p]} was smaller than its parent, {heap[i]}, so they swap: it moves up a level.
        i = p
    top = heap[0]                            # @ Now pop. The smallest number, {top}, is always at the root.
    last = heap.pop()                        # @ Take the last number, {last}, off the end of the list...
    if heap:
        heap[0] = last                       # @ ...and put it at the root, where the smallest was. Now sift it down.
        i, n = 0, len(heap)
        while 2 * i + 1 < n:
            c = 2 * i + 1  # the left child
            if c + 1 < n and heap[c + 1] < heap[c]:
                c += 1                       # @ The right child, {heap[c]}, is the smaller of the two.
            if heap[i] <= heap[c]:
                break                        # @ {heap[i]} ≤ {heap[c]}, its smaller child, so the heap is in order again.
            heap[i], heap[c] = heap[c], heap[i]  # @ {heap[c]} was larger than its smaller child, {heap[i]}, so they swap: it moves down.
            i = c
    return top                               # @ The pop returns {top}. Both operations followed one path: O(log n) steps.
