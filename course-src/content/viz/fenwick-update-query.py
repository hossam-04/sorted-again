def build(nums):  # the O(n) build, untraced: each block passes its total to the next block containing it
    tree = [0] * (len(nums) + 1)
    for i, x in enumerate(nums, 1):
        tree[i] += x
        if i + (i & -i) <= len(nums):
            tree[i + (i & -i)] += tree[i]
    return tree


def update_then_sum(nums, index, change, count):
    tree = build(nums)                   # @ Block i holds the sum of the (i & -i) numbers ending at position i: its lowest set bit says how many.
    i = index + 1                        # @ Number {index + 1} changes by {change}. Every block that contains it must change too.
    while i <= len(nums):
        tree[i] += change                # @ Block {i} (binary {format(i, 'b')}) covers numbers {i - (i & -i) + 1} to {i}, including number {index + 1}: it gains {change}.
        i += i & -i                      # @ {'Adding the lowest set bit gives the next, larger block that contains it: ' + str(i) + '.' if i <= len(nums) else 'Adding the lowest set bit goes past the end: the update is done.'}
    total, i = 0, count                  # @ Now the sum of the first {count} numbers: one block per set bit of {count} (binary {format(count, 'b')}).
    while i > 0:
        total += tree[i]                 # @ Block {i} (binary {format(i, 'b')}) covers numbers {i - (i & -i) + 1} to {i}. Running total: {total}.
        i -= i & -i                      # @ {'Removing the lowest set bit gives the next block to the left: ' + str(i) + '.' if i else 'No set bits are left, so every number is covered.'}
    return total                         # @ The first {count} numbers add up to {total}, from {bin(count).count('1')} block{'' if bin(count).count('1') == 1 else 's'}.
