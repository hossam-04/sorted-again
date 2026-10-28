import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'lib'))
import tracer  # noqa: E402

TWO = '''def two_sum_sorted(nums, target):
    l, r = 0, len(nums) - 1          # @ Start at both ends: l = 0 and r = {r}.
    while l < r:
        s = nums[l] + nums[r]        # @ {nums[l]} + {nums[r]} = {s}.
        if s == target:
            return [l + 1, r + 1]    # @ Found it.
        if s < target:
            l += 1
        else:
            r -= 1
    return []
'''
SPEC = {'function': 'two_sum_sorted', 'layout': [
    {'type': 'array', 'bind': {'values': 'nums', 'pointers': "{'l': l, 'r': r}", 'found': '[l, r] if __line__ == 6 else []'}},
    {'type': 'vars', 'bind': {'s': 's'}}]}


class Tracer(unittest.TestCase):
    def test_after_line_semantics_and_captions(self):
        out = tracer.trace({'code': TWO, 'spec': SPEC, 'args': {'nums': [1, 3, 4, 6, 8, 11, 15], 'target': 14}}, None)
        f = out['frames']
        self.assertEqual(f[0]['line'], 2)
        self.assertEqual(f[0]['caption'], 'Start at both ends: l = 0 and r = 6.')
        self.assertEqual(f[0]['channels'][0]['pointers'], {'l': 0, 'r': 6})
        s_frame = next(x for x in f if x['line'] == 4)
        self.assertEqual(s_frame['caption'], '1 + 15 = 16.')
        self.assertEqual(s_frame['channels'][1]['s'], 16)
        last = f[-1]
        self.assertEqual(last['line'], 6)
        self.assertEqual(last['channels'][0]['found'], [1, 5])
        self.assertEqual(out['result'], [2, 6])
        self.assertNotIn('# @', '\n'.join(out['code']))
        self.assertEqual(len(out['code']), len(TWO.split('\n')))

    def test_generator_expressions_are_not_traced(self):
        code = ('def hours(piles, k):\n'
                '    total = sum((p + k - 1) // k for p in piles)  # @ {total} hours at speed {k}.\n'
                '    return total\n')
        spec = {'function': 'hours', 'layout': [{'type': 'vars', 'bind': {'k': 'k', 'piles': 'piles'}}]}
        out = tracer.trace({'code': code, 'spec': spec, 'args': {'piles': [4, 9, 2], 'k': 3}}, None)
        self.assertEqual([f['line'] for f in out['frames']], [2, 3])
        self.assertEqual(out['frames'][0]['caption'], '6 hours at speed 3.')
        self.assertEqual(out['frames'][0]['channels'][0], {'k': 3, 'piles': [4, 9, 2]})

    def test_module_level_helpers_are_not_traced(self):
        code = ('class Node:\n'
                '    def __init__(self, val, next=None):\n'
                '        self.val, self.next = val, next\n'
                '\n'
                'def build(values):\n'
                '    head = None\n'
                '    for v in reversed(values):\n'
                '        head = Node(v, head)\n'
                '    return head\n'
                '\n'
                'def length(values):\n'
                '    head = build(values)\n'
                '    def walk(node):\n'
                '        return 0 if node is None else 1 + walk(node.next)\n'
                '    return walk(head)\n')
        spec = {'function': 'length', 'layout': [{'type': 'list', 'bind': {'nodes': 'nodes(reach(head))'}}]}
        out = tracer.trace({'code': code, 'spec': spec, 'args': {'values': [5, 6, 7]}}, None)
        lines = [f['line'] for f in out['frames']]  # numbered from the def line of length()
        self.assertEqual(lines[:2], [2, 3])
        self.assertIn(4, lines)  # the nested helper is traced; build() is not
        self.assertEqual(out['code'][0], 'def length(values):')
        self.assertEqual([n['val'] for n in out['frames'][0]['channels'][0]['nodes']], [5, 6, 7])
        self.assertEqual(out['result'], 3)

    def test_reach_follows_next_and_stops_on_cycles(self):
        class N:
            def __init__(self, nxt=None):
                self.next = nxt
        c = N()
        b = N(c)
        a = N(b)
        c.next = b  # a cycle b -> c -> b
        self.assertEqual(tracer.reach(a), [a, b, c])
        self.assertEqual(tracer.reach(None, c, a), [c, b, a])

    def test_truncates_long_traces(self):
        src = 'def spin(n):\n    i = 0\n    while i < n:\n        i += 1\n    return i\n'
        out = tracer.trace({'code': src, 'spec': {'function': 'spin', 'layout': []}, 'args': {'n': 10_000}}, None)
        self.assertTrue(out['truncated'])
        self.assertEqual(len(out['frames']), tracer.MAX_FRAMES)

    def test_call_tree_mode(self):
        src = 'def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n'
        spec = {'function': 'fib', 'mode': 'calls', 'call_label': "f'fib({n})'", 'layout': []}
        out = tracer.trace({'code': src, 'spec': spec, 'args': {'n': 4}}, None)
        tree = out['frames'][-1]['calls']
        self.assertEqual(len(tree), 9)
        self.assertEqual(tree[0]['label'], 'fib(4)')
        self.assertEqual(tree[0]['ret'], 3)
        self.assertTrue(all(c['state'] == 'done' for c in tree))

    def test_calls_of_a_nested_function(self):
        src = ('def subsets(nums):\n    out, path = [], []\n    def explore(i):\n        if i == len(nums):\n'
               '            out.append(path[:])\n            return\n        path.append(nums[i])\n        explore(i + 1)\n'
               '        path.pop()\n        explore(i + 1)\n    explore(0)\n    return out\n')
        spec = {'function': 'subsets', 'mode': 'calls', 'calls_of': 'explore', 'call_label': 'str(path)', 'layout': []}
        out = tracer.trace({'code': src, 'spec': spec, 'args': {'nums': [1, 2]}}, None)
        tree = out['frames'][-1]['calls']
        self.assertEqual([c['label'] for c in tree], ['[]', '[1]', '[1, 2]', '[1]', '[]', '[2]', '[]'])
        self.assertEqual([c['parent'] for c in tree], [None, 0, 1, 1, 0, 4, 4])
        self.assertTrue(all(c['state'] == 'done' for c in tree))
        self.assertEqual(out['result'], [[1, 2], [1], [2], []])

    def test_forest_and_outer_scope(self):
        src = ('def groups(n, pairs):\n    parent = list(range(n))\n    def find(x):\n        while parent[x] != x:\n'
               '            x = parent[x]\n        return x\n    for a, b in pairs:\n        parent[find(b)] = find(a)\n'
               '    return len({find(i) for i in range(n)})\n')
        layout = [{'type': 'tree', 'bind': {'tree': 'forest(parent)'}}, {'type': 'vars', 'bind': {'n': 'n'}}]
        plain = tracer.trace({'code': src, 'spec': {'function': 'groups', 'layout': layout}, 'args': {'n': 4, 'pairs': [[0, 1], [2, 3]]}}, None)
        inside = [f for f in plain['frames'] if f['line'] in (4, 5)]  # lines of find
        self.assertTrue(inside and all(f['channels'][1]['n'] is None for f in inside))  # n isn't find's own variable
        spec = {'function': 'groups', 'see_outer': True, 'layout': layout}
        out = tracer.trace({'code': src, 'spec': spec, 'args': {'n': 4, 'pairs': [[0, 1], [2, 3]]}}, None)
        inside = [f for f in out['frames'] if f['line'] in (4, 5)]
        self.assertTrue(inside and all(f['channels'][1]['n'] == 4 for f in inside))
        t = out['frames'][-1]['channels'][0]['tree']
        self.assertEqual(sorted(t['roots']), [0, 2])
        kids = {nd['id']: nd['kids'] for nd in t['nodes']}
        self.assertEqual(kids[0], [1])
        self.assertEqual(kids[2], [3])
        self.assertEqual(out['result'], 2)

    def test_node_ids_are_stable(self):
        src = ('class N:\n    def __init__(self, v, nxt=None):\n        self.val, self.next = v, nxt\n'
               'def rev(vals):\n    head = None\n    for v in reversed(vals):\n        head = N(v, head)\n'
               '    all_nodes = []\n    n = head\n    while n:\n        all_nodes.append(n)\n        n = n.next\n'
               '    prev, cur = None, head\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n'
               '        prev, cur = cur, nxt\n    return prev.val\n')
        spec = {'function': 'rev', 'layout': [{'type': 'list', 'bind': {'nodes': 'nodes(all_nodes)', 'cur': 'node_id(cur)'}}]}
        out = tracer.trace({'code': src, 'spec': spec, 'args': {'vals': [1, 2, 3]}}, None)
        frames = [x for x in out['frames'] if x['channels'][0]['nodes'] and len(x['channels'][0]['nodes']) == 3]
        first_ids = [n['id'] for n in frames[0]['channels'][0]['nodes']]
        last = frames[-1]['channels'][0]['nodes']
        self.assertEqual([n['id'] for n in last], first_ids)
        self.assertIsNone(last[0]['next'])
        self.assertEqual(last[2]['next'], first_ids[1])

    def test_trie_snapshot_and_path(self):
        src = ('class T:\n    def __init__(self):\n        self.children, self.end = {}, False\n'
               'def build(words):\n    root = T()\n    for w in words:\n        node = root\n        for ch in w:\n'
               '            node = node.children.setdefault(ch, T())\n        node.end = True\n    return len(words)\n')
        spec = {'function': 'build', 'layout': [{'type': 'tree', 'bind': {'tree': 'trie(root)', 'path': "trie_path(root, locals().get('node'))"}}]}
        out = tracer.trace({'code': src, 'spec': spec, 'args': {'words': ['to', 'tea', 'i']}}, None)
        ch = out['frames'][-1]['channels'][0]
        by = {n['id']: n for n in ch['tree']['nodes']}
        root = by[ch['tree']['root']]
        self.assertIsNone(root['val'])
        self.assertEqual([by[k]['val'] for k in root['kids']], ['i', 't'])  # children in letter order
        words, todo = [], [(root, '')]
        while todo:
            n, prefix = todo.pop()
            if n['end']:
                words.append(prefix)
            todo += [(by[k], prefix + by[k]['val']) for k in n['kids']]
        self.assertEqual(sorted(words), ['i', 'tea', 'to'])
        self.assertEqual([by[k]['val'] for k in ch['path']], [None, 'i'])  # root, then the last word's node
        first = out['frames'][0]['channels'][0]
        self.assertEqual(first['path'], [])  # no node variable yet


if __name__ == '__main__':
    unittest.main()
