def longest_unique(s):
    last = {}                                # @ last remembers the most recent position of each character.
    left = best = 0                          # @ The window s[left..right] never holds a repeat. It starts at left = 0.
    for right, c in enumerate(s):            # @ Next character: s[{right}] = {repr(c)}.
        if c in last and last[c] >= left:    # @ {(repr(c) + ' was last seen at ' + str(last[c]) + (', inside the window.' if last[c] >= left else ', before the window, so it is no problem.')) if c in last else repr(c) + ' has not been seen before.'}
            left = last[c] + 1               # @ Move left just past the earlier copy, to {left}. Everything before it can go.
        last[c] = right                      # @ Remember that {repr(c)} is now at position {right}.
        best = max(best, right - left + 1)   # @ The window {repr(s[left:right + 1])} has length {right - left + 1}. Best so far: {best}.
    return best                              # @ The longest stretch without a repeat has length {best}.
