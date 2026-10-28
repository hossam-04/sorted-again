import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'lib'))
import harness  # noqa: E402

TWO_SUM_II = {
    'id': 167, 'kind': 'function', 'method': 'twoSum',
    'params': [{'name': 'numbers', 'conv': 'any'}, {'name': 'target', 'conv': 'any'}], 'ret': 'any', 'compare': 'exact',
    'examples': [{'args': [[1, 3, 4, 6, 8, 11], 10], 'out': [3, 4]}, {'args': [[5, 5], 10], 'out': [1, 2]}],
    'edge': [{'name': 'pair at the very end', 'args': [[-8, 0, 3, 9, 12], 21], 'out': [4, 5]}],
    'gen': ('def gen(rng, size):\n'
            '    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 60)\n'
            '    while True:\n'
            '        nums = sorted(rng.randint(-50, 50) for _ in range(n))\n'
            '        i, j = sorted(rng.sample(range(n), 2))\n'
            '        t = nums[i] + nums[j]\n'
            '        if sum(1 for a in range(n) for b in range(a + 1, n) if nums[a] + nums[b] == t) == 1:\n'
            '            return [nums, t]\n'),
    'perf': ('def perf(rng):\n'
             '    xs = sorted(4 * x for x in rng.sample(range(-250_000_000, 250_000_000), 20_000))\n'
             '    a, b = 4 * rng.randint(-100, 0) + 1, 4 * rng.randint(0, 100) + 1\n'
             '    return [sorted(xs + [a, b]), a + b]\n'),
    'reference': ('class Solution:\n'
                  '    def twoSum(self, numbers, target):\n'
                  '        l, r = 0, len(numbers) - 1\n'
                  '        while l < r:\n'
                  '            s = numbers[l] + numbers[r]\n'
                  '            if s == target:\n'
                  '                return [l + 1, r + 1]\n'
                  '            if s < target:\n'
                  '                l += 1\n'
                  '            else:\n'
                  '                r -= 1\n'),
    'limits': {'perf_ms': 3000},
}


def call(fn, payload, events=None):
    sink = (lambda s: events.append(json.loads(s))) if events is not None else None
    return json.loads(harness.entry(fn, json.dumps(payload), sink))


class Structures(unittest.TestCase):
    def test_list_round_trip_and_cycle_guard(self):
        head = harness.build_list([1, 2, 3])
        self.assertEqual(harness.dump_list(head), [1, 2, 3])
        head.next.next.next = head
        with self.assertRaises(harness.HarnessError):
            harness.dump_list(head, limit=50)

    def test_tree_round_trip_trims_trailing_none(self):
        level = [3, 9, 20, None, None, 15, 7]
        self.assertEqual(harness.dump_tree(harness.build_tree(level)), level)
        self.assertEqual(harness.dump_tree(harness.build_tree([1, None, 2, None, None])), [1, None, 2])
        self.assertIsNone(harness.build_tree([]))

    def test_deep_skewed_tree_needs_no_recursion(self):
        level = [0]
        for i in range(1, 50_000):
            level += [None, i]
        self.assertEqual(len(harness.dump_tree(harness.build_tree(level))), len(level))


class Compare(unittest.TestCase):
    def test_exact_is_type_aware(self):
        same = harness.same
        self.assertTrue(same([1, 2], [1, 2], 1e-5))
        self.assertFalse(same(True, 1, 1e-5))
        self.assertTrue(same(2.5, 2.500001, 1e-5))
        self.assertFalse(same(1_000_000_000, 1_000_000_001, 1e-5))

    def test_unordered_modes(self):
        spec = {'compare': 'unordered'}
        p = harness.Problem({**TWO_SUM_II, **spec})
        self.assertTrue(p.compare([[1, 2], [3]], [[3], [1, 2]], None)[0])
        self.assertFalse(p.compare([[1, 2], [3]], [[3], [2, 1]], None)[0])
        p = harness.Problem({**TWO_SUM_II, 'compare': 'unordered-deep'})
        self.assertTrue(p.compare([[1, 2], [3]], [[3], [2, 1]], None)[0])
        self.assertFalse(p.compare([[1, 2]], [[1, 2], [1, 2]], None)[0])


class RunAndCheck(unittest.TestCase):
    def test_reference_is_accepted_with_progress_events(self):
        events = []
        out = call('check', {'problem': TWO_SUM_II, 'code': TWO_SUM_II['reference']}, events)
        self.assertEqual(out['status'], 'accepted', out)
        self.assertEqual([g['name'] for g in out['groups']], ['examples', 'edge', 'random', 'perf'])
        self.assertEqual(out['groups'][2]['total'], 40)
        self.assertIn('ref_ms', out['perf'])
        starts = [e for e in events if e['event'] == 'start']
        self.assertEqual(starts[-1]['group'], 'perf')
        self.assertEqual(starts[-1]['limit_ms'], 3000)

    def test_wrong_answer_stops_at_first_failing_group(self):
        wrong = TWO_SUM_II['reference'].replace('return [l + 1, r + 1]', 'return [l, r]')
        out = call('check', {'problem': TWO_SUM_II, 'code': wrong})
        self.assertEqual(out['status'], 'wrong')
        self.assertEqual(len(out['groups']), 1)
        self.assertEqual(out['failure']['group'], 'examples')
        self.assertEqual(out['failure']['expected'], [3, 4])
        self.assertEqual(out['failure']['got'], [2, 3])
        self.assertEqual(out['failure']['input'], 'numbers = [1, 3, 4, 6, 8, 11], target = 10')

    def test_compile_error_has_line(self):
        out = call('run', {'problem': TWO_SUM_II, 'code': 'class Solution:\n    def twoSum(self, numbers, target)\n        pass\n'})
        self.assertEqual(out['status'], 'compile_error')
        self.assertEqual(out['error']['type'], 'SyntaxError')
        self.assertEqual(out['error']['line'], 2)

    def test_runtime_error_points_at_user_line(self):
        code = 'class Solution:\n    def twoSum(self, numbers, target):\n        return [numbers[99]]\n'
        out = call('run', {'problem': TWO_SUM_II, 'code': code})
        t = out['tests'][0]
        self.assertEqual(t['status'], 'error')
        self.assertEqual(t['error']['type'], 'IndexError')
        self.assertEqual(t['error']['line'], 3)

    def test_prints_are_captured_and_capped(self):
        code = ('class Solution:\n    def twoSum(self, numbers, target):\n'
                '        for i in range(5000):\n            print("x" * 10)\n        return [1, 2]\n')
        t = call('run', {'problem': TWO_SUM_II, 'code': code})['tests'][1]
        self.assertEqual(t['status'], 'pass')
        self.assertLessEqual(len(t['stdout']), harness.STDOUT_CAP + 80)
        self.assertIn('more characters of output not shown', t['stdout'])

    def test_missing_return_hint(self):
        code = 'class Solution:\n    def twoSum(self, numbers, target):\n        x = 1\n'
        t = call('run', {'problem': TWO_SUM_II, 'code': code})['tests'][0]
        self.assertEqual(t['status'], 'fail')
        self.assertIn('return', t['message'])

    def test_oracle_mode_uses_oracle_for_random_expected(self):
        bad_oracle = 'def oracle(numbers, target):\n    return [0, 0]\n'
        out = call('check', {'problem': {**TWO_SUM_II, 'oracle': bad_oracle}, 'code': TWO_SUM_II['reference'],
                             'opts': {'random_expected': 'oracle', 'groups': ['random']}})
        self.assertEqual(out['status'], 'wrong')
        self.assertEqual(out['failure']['group'], 'random')


class Kinds(unittest.TestCase):
    def test_design_min_stack(self):
        spec = {'id': 155, 'kind': 'design', 'class': 'MinStack', 'compare': 'exact',
                'examples': [{'ops': ['MinStack', 'push', 'push', 'getMin', 'pop', 'getMin'], 'args': [[], [1], [3], [], [], []],
                              'out': [None, None, None, 1, None, 1]}],
                'reference': ''}
        code = ('class MinStack:\n    def __init__(self):\n        self.s = []\n'
                '    def push(self, v):\n        self.s.append((v, min(v, self.s[-1][1]) if self.s else v))\n'
                '    def pop(self):\n        self.s.pop()\n'
                '    def top(self):\n        return self.s[-1][0]\n'
                '    def getMin(self):\n        return self.s[-1][1]\n')
        out = call('run', {'problem': spec, 'code': code})
        self.assertEqual(out['tests'][0]['status'], 'pass', out)
        bad = code.replace('return self.s[-1][1]', 'return self.s[-1][0]')
        t = call('run', {'problem': spec, 'code': bad})['tests'][0]
        self.assertEqual(t['status'], 'fail')
        self.assertIn('Call 4', t['message'])

    def test_codec_strings_round_trip_and_type_check(self):
        spec = {'id': 271, 'kind': 'codec', 'codec': 'strings', 'compare': 'exact',
                'examples': [{'args': [['a#b', '', '4:x']]}], 'reference': ''}
        good = ('class Codec:\n    def encode(self, strs):\n        return "".join(f"{len(s)}#{s}" for s in strs)\n'
                '    def decode(self, s):\n        out, i = [], 0\n        while i < len(s):\n'
                '            j = s.index("#", i)\n            n = int(s[i:j])\n            out.append(s[j + 1:j + 1 + n])\n'
                '            i = j + 1 + n\n        return out\n')
        self.assertEqual(call('run', {'problem': spec, 'code': good})['tests'][0]['status'], 'pass')
        naive = 'class Codec:\n    def encode(self, strs):\n        return "#".join(strs)\n    def decode(self, s):\n        return s.split("#")\n'
        self.assertEqual(call('run', {'problem': spec, 'code': naive})['tests'][0]['status'], 'fail')

    def test_codec_check_runs_every_group(self):
        spec = {'id': 271, 'kind': 'codec', 'codec': 'strings', 'compare': 'exact',
                'examples': [{'args': [['a', '#']]}], 'edge': [{'name': 'empty', 'args': [[]]}],
                'gen': 'def gen(rng, size):\n    return [[rng.choice("ab#") * rng.randint(0, 3) for _ in range(3)]]\n',
                'perf': 'def perf(rng):\n    return [["x" * 5] * 1000]\n'}
        code = ('class Codec:\n'
                '    def encode(self, strs):\n'
                '        return "".join(f"{len(s)}#{s}" for s in strs)\n'
                '    def decode(self, s):\n'
                '        out, i = [], 0\n'
                '        while i < len(s):\n'
                '            j = s.index("#", i)\n'
                '            n = int(s[i:j])\n'
                '            out.append(s[j + 1:j + 1 + n])\n'
                '            i = j + 1 + n\n'
                '        return out\n')
        r = call('check', {'problem': spec, 'code': code, 'opts': {'random_small': 3, 'random_medium': 1}})
        self.assertEqual(r['status'], 'accepted')
        self.assertEqual([g['name'] for g in r['groups']], ['examples', 'edge', 'random', 'perf'])

    def test_cycle_list_adapter(self):
        spec = {'id': 141, 'kind': 'function', 'method': 'hasCycle', 'adapter': 'cycle-list',
                'params': [{'name': 'head', 'conv': 'ListNode'}], 'ret': 'any', 'compare': 'exact',
                'examples': [{'args': [[3, 2, 0, -4], 1], 'out': True}, {'args': [[1], -1], 'out': False}], 'reference': ''}
        code = ('class Solution:\n    def hasCycle(self, head):\n        slow = fast = head\n'
                '        while fast and fast.next:\n            slow, fast = slow.next, fast.next.next\n'
                '            if slow is fast:\n                return True\n        return False\n')
        self.assertEqual([t['status'] for t in call('run', {'problem': spec, 'code': code})['tests']], ['pass', 'pass'])

    def test_random_list_copy_must_not_share_nodes(self):
        spec = {'id': 138, 'kind': 'function', 'method': 'copyRandomList', 'adapter': 'random-list', 'node': 'random',
                'params': [{'name': 'head', 'conv': 'any'}], 'ret': 'any', 'compare': 'exact',
                'examples': [{'args': [[[7, None], [13, 0], [11, 0]]], 'out': [[7, None], [13, 0], [11, 0]]}], 'reference': ''}
        cheat = 'class Solution:\n    def copyRandomList(self, head):\n        return head\n'
        t = call('run', {'problem': spec, 'code': cheat})['tests'][0]
        self.assertEqual(t['status'], 'error')
        self.assertIn('new', t['error']['message'])

    def test_in_place_and_no_mutation(self):
        rot = {'id': 48, 'kind': 'function', 'method': 'rotate', 'adapter': 'in-place', 'inplace': 0,
               'params': [{'name': 'matrix', 'conv': 'any'}], 'ret': 'any', 'compare': 'exact',
               'examples': [{'args': [[[1, 2], [3, 4]]], 'out': [[3, 1], [4, 2]]}], 'reference': ''}
        code = ('class Solution:\n    def rotate(self, matrix):\n        matrix[:] = [list(r) for r in zip(*matrix[::-1])]\n')
        self.assertEqual(call('run', {'problem': rot, 'code': code})['tests'][0]['status'], 'pass')
        dup = {'id': 287, 'kind': 'function', 'method': 'findDuplicate', 'no_mutation': ['nums'],
               'params': [{'name': 'nums', 'conv': 'any'}], 'ret': 'any', 'compare': 'exact',
               'examples': [{'args': [[1, 3, 4, 2, 2]], 'out': 2}], 'reference': ''}
        sorts = ('class Solution:\n    def findDuplicate(self, nums):\n        nums.sort()\n'
                 '        return next(a for a, b in zip(nums, nums[1:]) if a == b)\n')
        t = call('run', {'problem': dup, 'code': sorts})['tests'][0]
        self.assertEqual(t['status'], 'error')
        self.assertIn('nums', t['error']['message'])

    def test_tree_ref_and_val_return(self):
        lca = {'id': 235, 'kind': 'function', 'method': 'lowestCommonAncestor',
               'params': [{'name': 'root', 'conv': 'TreeNode'}, {'name': 'p', 'conv': 'TreeNodeRef'}, {'name': 'q', 'conv': 'TreeNodeRef'}],
               'ret': 'TreeNode.val', 'compare': 'exact',
               'examples': [{'args': [[6, 2, 8, 0, 4, 7, 9], 2, 8], 'out': 6}], 'reference': ''}
        code = ('class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        node = root\n'
                '        while node:\n            if p.val < node.val and q.val < node.val:\n                node = node.left\n'
                '            elif p.val > node.val and q.val > node.val:\n                node = node.right\n'
                '            else:\n                return node\n')
        self.assertEqual(call('run', {'problem': lca, 'code': code})['tests'][0]['status'], 'pass')


class Misc(unittest.TestCase):
    def test_exec_captures_output_and_errors(self):
        out = call('exec', {'code': 'print(sum(range(10)))\nprint(1/0)'})
        self.assertEqual(out['stdout'], '45\n')
        self.assertEqual(out['error']['type'], 'ZeroDivisionError')
        self.assertEqual(out['error']['line'], 2)

    def test_describe_signature(self):
        d = call('describe', {'signature': 'def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]'})
        self.assertEqual(d['method'], 'mergeKLists')
        self.assertEqual(d['params'], [{'name': 'lists', 'annotation': 'List[Optional[ListNode]]', 'conv': 'ListNode[]'}])
        self.assertEqual(d['ret'], 'ListNode')

    def test_grid_inputs_print_one_row_per_line(self):
        spec = {'id': 1, 'kind': 'function', 'method': 'f', 'params': [{'name': 'grid', 'conv': 'any'}, {'name': 'k', 'conv': 'any'}]}
        text = harness.Problem(spec).describe_input([[['1', '0'], ['0', '1']], 3])
        self.assertEqual(text, 'grid = [\n    ["1", "0"],\n    ["0", "1"],\n], k = 3')
        self.assertIsNone(harness.grid_lit([[1, 2], [3]]))  # ragged
        self.assertIsNone(harness.grid_lit([[1, 2, 3]]))  # one row

    def test_long_strings_are_abbreviated(self):
        text = harness.pylit('ab' * 1000)
        self.assertTrue(text.startswith('"abab') and text.endswith('bab"'))
        self.assertIn('1,925 more characters', text)
        self.assertEqual(harness.pylit('short'), '"short"')

    def test_big_ints_survive_json(self):
        out = call('exec', {'code': 'print(2**70)'})
        self.assertEqual(out['stdout'], '1180591620717411303424\n')
        self.assertEqual(json.loads(harness.entry('run', json.dumps({'problem': {
            'id': 1, 'kind': 'function', 'method': 'f', 'params': [], 'ret': 'any', 'compare': 'exact',
            'examples': [{'args': [], 'out': 1}], 'reference': ''}, 'code': 'class Solution:\n    def f(self):\n        return 2**70\n'})))['tests'][0]['got'], {'$big': '1180591620717411303424'})

    def test_perf_time_and_repeat(self):
        spec = {**TWO_SUM_II, 'perf_repeat': 5}
        out = call('perf_time', {'problem': spec, 'code': TWO_SUM_II['reference'], 'runs': 2})
        self.assertGreater(out['ms'], 0)


if __name__ == '__main__':
    unittest.main()


class SmallStack(unittest.TestCase):
    """The page's Worker has a small native stack; these helpers keep the harness off it (see harness.py)."""

    def test_release_drops_every_traceback_entry(self):
        def r(k):
            if k == 3000:
                raise ValueError('deep')
            return r(k + 1)
        try:
            try:
                r(0)
            except ValueError:
                raise KeyError('while handling')
        except KeyError as e:
            context = e.__context__
            harness.release(e)
            self.assertIsNone(e.__traceback__)
            self.assertIsNone(context.__traceback__)

    def test_dispose_unlinks_course_nodes_and_empties_owned(self):
        head = harness.build_list(range(5))
        tail = head
        while tail.next:
            tail = tail.next
        tail.next = head.next  # a cycle
        root = harness.build_tree([1, 2, 3, None, 4])
        graph, _ = harness.build_graph([[2], [1, 3], [2]])

        class Trie:
            def __init__(self):
                self.children, self.end = {}, False

        trie = Trie()
        node = trie
        for _ in range(50):
            node.children['a'] = Trie()
            node = node.children['a']
        owned = [head, root, graph, trie, [1, 2, 3], {'k': (head, 'x')}]
        harness.dispose(owned)
        self.assertEqual(owned, [])
        self.assertEqual(vars(tail), {})
        self.assertEqual(vars(root), {})
        self.assertEqual(vars(graph), {})
        self.assertEqual(len(trie.children), 1)  # the learner's own objects are left intact

    def test_reachable_skips_modules_and_classes(self):
        import collections
        order = harness._reachable([{'m': collections, 'cls': harness.ListNode, 'x': [1, [2]]}])
        self.assertNotIn(collections, order)
        self.assertNotIn(harness.ListNode, order)
        self.assertEqual(len(order), 3)  # the dict and the two lists

    def test_pure_python_caches_behave_like_functools(self):
        import functools
        self.assertIs(functools.cache, harness.cache)

        @functools.cache
        def fib(n):
            return n if n < 2 else fib(n - 1) + fib(n - 2)
        self.assertEqual(fib(200), 280571172992510140037611932413038677189525)
        self.assertEqual(fib.cache_info().misses, 201)

        @functools.lru_cache(maxsize=2)
        def double(x):
            return 2 * x
        self.assertEqual([double(i) for i in (1, 2, 1, 3, 2)], [2, 4, 2, 6, 4])
        self.assertEqual(double.cache_info()[:2], (1, 4))
        double.cache_clear()
        self.assertEqual(double.cache_info().currsize, 0)

        @functools.lru_cache
        def ident(x, *, scale=1):
            return x * scale
        self.assertEqual((ident(3), ident(3, scale=2), ident(3)), (3, 6, 3))
        self.assertEqual(ident.cache_parameters(), {'maxsize': 128, 'typed': False})
        with self.assertRaises(TypeError):
            ident([1])

        class Grid:
            @functools.cache
            def paths(self, r, c):
                return 1 if r == 0 or c == 0 else self.paths(r - 1, c) + self.paths(r, c - 1)
        self.assertEqual(Grid().paths(10, 10), 184756)

    def test_cached_recursion_is_python_level(self):
        out = call('exec', {'code': 'from functools import cache\n@cache\ndef f(k):\n    return 0 if k == 0 else f(k - 1) + 1\nprint(f(20000))'})
        self.assertEqual(out['stdout'], '20000\n')

    def test_setrecursionlimit_is_capped_and_reset(self):
        out = call('exec', {'code': 'import sys\nsys.setrecursionlimit(10**7)\nprint(sys.getrecursionlimit())\nsys.setrecursionlimit(50)'})
        self.assertEqual(out['stdout'], '100000\n')
        out = call('exec', {'code': 'import sys\nprint(sys.getrecursionlimit())'})
        self.assertEqual(out['stdout'], '100000\n')

    def test_deep_recursion_error_is_reported(self):
        out = call('exec', {'code': 'def r(k):\n    return r(k + 1)\nr(0)'})
        self.assertEqual(out['error']['type'], 'RecursionError')
        self.assertEqual(out['error']['line'], 2)
