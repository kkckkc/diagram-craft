import { describe, expect, test } from 'vitest';
import { query } from './query.ts';

// See https://github.com/jqlang/jq/blob/master/tests/jq.test

describe('jqtest', () => {
  test('{a: 1}', () => {
    expect(query('{a: 1}', [undefined])).toEqual([{ a: 1 }]);
  });

  test('{a,b,(.d):.a,e:.b}', () => {
    expect(query('{a,b,(.d):.a,e:.b}', [{ a: 1, b: 2, d: 'c' }])).toEqual([
      { a: 1, b: 2, c: 1, e: 2 }
    ]);
  });

  test('.foo', () => {
    expect(query('.foo', [{ foo: 42, bar: 43 }])).toEqual([42]);
  });

  test('.foo | .bar', () => {
    expect(query('.foo | .bar', [{ foo: { bar: 42 }, bar: 'badvalue' }])).toEqual([42]);
  });

  test('.foo.bar', () => {
    expect(query('.foo.bar', [{ foo: { bar: 42 }, bar: 'badvalue' }])).toEqual([42]);
  });

  test('.foo_bar', () => {
    expect(query('.foo_bar', [{ foo_bar: 2 }])).toEqual([2]);
  });

  test('.["foo"].bar', () => {
    expect(query('.["foo"].bar', [{ foo: { bar: 42 }, bar: 'badvalue' }])).toEqual([42]);
  });

  test('."foo"."bar"', () => {
    expect(query('."foo"."bar"', [{ foo: { bar: 42 }, bar: 'badvalue' }])).toEqual([42]);
  });

  // TODO: Note the original test used (.e0, .E1, .E-1, .E+1)
  test('.e0, .E1, .E - 1, .E + 1', () => {
    expect(query('.e0, .E1, .E - 1, .E + 1', [{ e0: 1, E1: 2, E: 3 }])).toEqual([1, 2, 2, 4]);
  });

  test('[.[]|.foo?]', () => {
    expect(query('[.[]|.foo?]', [[1, [2], { foo: 3, bar: 4 }, {}, { foo: 5 }]])).toEqual([
      [3, undefined, 5]
    ]);
  });

  test('[.[]|.foo?.bar?]', () => {
    expect(query('[.[]|.foo?.bar?]', [[1, [2], [], { foo: 3 }, { foo: { bar: 4 } }, {}]])).toEqual([
      [4, undefined]
    ]);
  });

  test('[..]', () => {
    expect(query('[..]', [[1, [[2]], { a: [1] }]])).toEqual([
      [[1, [[2]], { a: [1] }], 1, [[2]], [2], 2, { a: [1] }, [1], 1]
    ]);
  });

  test('.[]', () => {
    expect(query('.[]', [[1, 2, 3]])).toEqual([1, 2, 3]);
  });

  test('1,1', () => {
    expect(query('1,1', [[]])).toEqual([1, 1]);
  });

  test('1,.', () => {
    expect(query('1,.', [[]])).toEqual([1, []]);
  });

  test('[.]', () => {
    expect(query('[.]', [[2]])).toEqual([[[2]]]);
  });

  test('[[2]]', () => {
    expect(query('[[2]]', [[3]])).toEqual([[[2]]]);
  });

  test('[{}]', () => {
    expect(query('[{}]', [[]])).toEqual([[{}]]);
  });

  test('[.[]]', () => {
    expect(query('[.[]]', [['a']])).toEqual([['a']]);
  });

  test('[(.,1),((.,.[]),(2,3))]', () => {
    expect(query('[(.,1),((.,.[]),(2,3))]', [['a', 'b']])).toEqual([
      [['a', 'b'], 1, ['a', 'b'], 'a', 'b', 2, 3]
    ]);
  });

  // TODO: Fix
  test.skip('[([5,5][]),.,.[]]', () => {
    expect(query('[([5,5][]),.,.[]]', [[1, 2, 3]])).toEqual([[5, 5, [1, 2, 3], 1, 2, 3]]);
  });

  // TODO: Fix
  test.skip('{x: (1,2)},{x:3} | .x', () => {
    expect(query('{x: (1,2)},{x:3} | .x', [undefined])).toEqual([1, 2, 3]);
  });

  test('[range(0;10)]', () => {
    expect(query('[range(0;10)]', [[]])).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]);
  });

  test('[range(0,1;3,4)]', () => {
    expect(query('[range(0,1;3,4)]', [[]])).toEqual([[0, 1, 2, 0, 1, 2, 3, 1, 2, 1, 2, 3]]);
  });

  test('[range(0;10;3)]', () => {
    expect(query('[range(0;10;3)]', [[]])).toEqual([[0, 3, 6, 9]]);
  });

  test('[range(0;10;-1)]', () => {
    expect(query('[range(0;10;-1)]', [[]])).toEqual([[]]);
  });

  test('[range(0;-5;-1)]', () => {
    expect(query('[range(0;-5;-1)]', [[]])).toEqual([[0, -1, -2, -3, -4]]);
  });

  test('[range(0,1;4,5;1,2)]', () => {
    expect(query('[range(0,1;4,5;1,2)]', [[]])).toEqual([
      [0, 1, 2, 3, 0, 2, 0, 1, 2, 3, 4, 0, 2, 4, 1, 2, 3, 1, 3, 1, 2, 3, 4, 1, 3]
    ]);
  });

  test('[limit(3; .[])]', () => {
    expect(query('[limit(3; .[])]', [[11, 22, 33, 44, 55, 66, 77, 88, 99]])).toEqual([
      [11, 22, 33]
    ]);
  });

  test('def f(x): x | x; f([.], . + [42])', () => {
    expect(query('def f(x): x | x; f([.], . + [42])', [[1, 2, 3]])).toEqual([
      [[[1, 2, 3]]],
      [[1, 2, 3], 42],
      [[1, 2, 3, 42]],
      [1, 2, 3, 42, 42]
    ]);
  });
});
