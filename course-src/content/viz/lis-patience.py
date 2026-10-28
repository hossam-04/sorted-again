from bisect import bisect_left


def lis_length(nums):
    tails = []                          # tails[k]: the smallest ending of an increasing subsequence of length k + 1
    for i, x in enumerate(nums):
        k = bisect_left(tails, x)       # @ {'No ending is at least ' + str(x) + ', so ' + str(x) + ' can extend the longest subsequence.' if k == len(tails) else 'The first ending that is at least ' + str(x) + ' is ' + str(tails[k]) + ', for length ' + str(k + 1) + '.'}
        if k == len(tails):
            tails.append(x)             # @ {x} makes an increasing subsequence of length {len(tails)}, the longest so far.
        else:
            tails[k] = x                # @ {x} replaces it: a subsequence of length {k + 1} can now end with the smaller {x}.
    return len(tails)                   # @ The longest increasing subsequence has length {len(tails)}.
