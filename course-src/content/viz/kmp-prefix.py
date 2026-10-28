def prefix_function(s):
    pi = [0] * len(s)
    k = 0                              # @ pi[i] will be the length of the longest border of s[:i + 1]: a proper prefix that is also a suffix.
    for i in range(1, len(s)):
        while k and s[i] != s[k]:
            k = pi[k - 1]              # @ s[{i}] doesn't extend the border, so fall back to that border's own longest border: length {k}.
        if s[i] == s[k]:
            k += 1                     # @ s[{i}] = {s[i]} matches s[{k - 1}], so the border grows to length {k}.
        pi[i] = k                      # @ {('The longest border of ' + s[:i + 1] + ' is ' + s[:k] + ', length ' + str(k) + '.') if k else ('No border for ' + s[:i + 1] + ': length 0.')}
    return pi                          # @ The prefix function: {pi}. The last value says {s} has a border of length {pi[-1]}.
