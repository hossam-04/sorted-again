def kth_ancestor(parent, node, k):
    n = len(parent)
    up = [parent[:]]                     # @ Row 0 is every node's parent: where a jump of 1 step lands. -1 means "past the root".
    for j in range(1, max(1, (n - 1).bit_length())):
        row = []
        for v in range(n):
            mid = up[j - 1][v]
            row.append(-1 if mid == -1 else up[j - 1][mid])  # @ A jump of {2 ** j} from {v} is two jumps of {2 ** (j - 1)}: to {mid}, then on to {row[-1]}.
        up.append(row)
    start = node                         # @ The table is built. Now the ancestor {k} steps above {node}: {k} is {format(k, 'b')} in binary.
    for j in range(len(up)):
        if k >> j & 1 and node != -1:
            frm = node
            node = up[j][frm]            # @ Bit {j} of {k} is set: jump {2 ** j} step{'' if j == 0 else 's'} from {frm}, landing on {node}.
    return node                          # @ {('The ancestor ' + str(k) + ' steps above ' + str(start) + ' is ' + str(node) + '.') if node != -1 else ('Node ' + str(start) + ' has fewer than ' + str(k) + ' ancestors: -1.')}
