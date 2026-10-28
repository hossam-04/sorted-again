def subsets(nums):
    out, path = [], []

    def explore(i):                       # @ {('explore(' + str(i) + '): take ' + str(nums[i]) + ' or not? path is ' + str(path) + ' so far.' if i < len(nums) else 'explore(' + str(i) + '): every number has been decided.') if 'i' in locals() else 'explore(i) decides about nums[i], then about the numbers after it.'}
        if i == len(nums):
            out.append(path[:])           # @ A leaf: every number is decided, so {path} is a subset. Record a copy.
            return
        path.append(nums[i])              # @ Choose: take {nums[i]}, then explore everything that follows.
        explore(i + 1)
        path.pop()                        # @ Un-choose: drop {nums[i]} again, and explore without it.
        explore(i + 1)

    explore(0)
    return out                            # @ All {len(out)} subsets: one per leaf of the decision tree.
