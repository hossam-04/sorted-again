class TrieNode:
    def __init__(self):
        self.children = {}  # letter -> TrieNode
        self.end = False    # does a stored word end here?


def insert_then_find(words, query):
    root = TrieNode()
    for word in words:
        node = root                              # @ Insert "{word}": start at the root.
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()   # @ There's no "{ch}" below this node yet, so add one.
            node = node.children[ch]             # @ Step down to "{ch}".
        node.end = True                          # @ "{word}" ends here, so mark the node (the double ring).{' Longer words continue below it, which is fine.' if node.children else ''}

    node = root                                  # @ Every word is in. Now look up "{query}", starting at the root.
    for ch in query:
        if ch not in node.children:
            return "absent"                      # @ There's no "{ch}" below this node, so no stored word starts with "{query}".
        node = node.children[ch]                 # @ Step down to "{ch}".
    if node.end:
        return "word"                            # @ The path ends at a marked node, so "{query}" itself was inserted.
    return "prefix only"                         # @ The path exists but its last node isn't marked: "{query}" only begins longer words.
