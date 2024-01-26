import { describe, expect, test } from 'vitest';
import {
  ArrayConstructor,
  ArrayIndexOp,
  ArrayOp,
  ArraySliceOp,
  Concatenation,
  FilterSequence,
  OObjects,
  PropertyLookupOp,
  query,
  queryOne,
  RecursiveDescentGenerator,
  ResultSet
} from './query.ts';

describe('OObject', () => {
  test('parse OString', () => {
    expect(OObjects.parse('"lorem"').val()).toEqual('lorem');
  });

  test('parse ONumber', () => {
    expect(OObjects.parse('1234').val()).toEqual(1234);
  });

  test('parse OBoolean', () => {
    expect(OObjects.parse('true').val()).toEqual(true);
    expect(OObjects.parse('false').val()).toEqual(false);
  });

  test('parse OArray', () => {
    expect(OObjects.parse('[1, 2, 3]').val()).toEqual([1, 2, 3]);
    expect(OObjects.parse('["a", "b"]').val()).toEqual(['a', 'b']);
    expect(OObjects.parse('[1, "b"]').val()).toEqual([1, 'b']);
  });

  test('parse OObject', () => {
    expect(OObjects.parse('{ ab: 1, b: 2}').val()).toEqual({ ab: 1, b: 2 });
    expect(OObjects.parse('{ ab: "test", b: 2}').val()).toEqual({ ab: 'test', b: 2 });
    expect(OObjects.parse('{ ab: [7, 8], b: 2}').val()).toEqual({ ab: [7, 8], b: 2 });
  });
});

describe('PropertyLookupOp', () => {
  test('query: .', () => {
    expect(queryOne('.', { a: 1 })).toEqual({ a: 1 });
    expect(queryOne('.', 123)).toEqual(123);
    expect(queryOne('.', 'lorem')).toEqual('lorem');
    expect(queryOne('.', [1, 2, 3])).toEqual([1, 2, 3]);
  });

  test('query: .test', () => {
    expect(queryOne('.test', { test: 1 })).toEqual(1);
    expect(queryOne('.test', 123)).toEqual(undefined);
    expect(queryOne('.test', 'lorem')).toEqual(undefined);
    expect(queryOne('.test', [1, 2, 3])).toEqual(undefined);
  });

  test('query: .a.b', () => {
    expect(queryOne('.a.b', { a: { b: 1 } })).toEqual(1);
    expect(queryOne('.a.b', { a: { c: 1 } })).toEqual(undefined);
    expect(queryOne('.a.b', 123)).toEqual(undefined);
    expect(queryOne('.a.b', 'lorem')).toEqual(undefined);
    expect(queryOne('.a.b', [1, 2, 3])).toEqual(undefined);
  });

  test('PropertyLookupOp', () => {
    expect(new PropertyLookupOp('test').evaluate([1, 2, 3])).toEqual(undefined);
    expect(new PropertyLookupOp('test').evaluate({ test: 6 })).toEqual(6);
  });
});

describe('ArrayLookup', () => {
  test('query .[0]', () => {
    expect(queryOne('.[0]', [1, 2, 3])).toEqual(1);
    expect(queryOne('.[0]', [{ a: 5 }, 2, 3])).toEqual({ a: 5 });
    expect(queryOne('.[0]', [[4, 5], 2, 3])).toEqual([4, 5]);
    expect(queryOne('.[0]', [])).toEqual(undefined);
    expect(queryOne('.[0]', 'lorem')).toEqual(undefined);
  });

  test('query .[2:4]', () => {
    expect(queryOne('.[2:4]', [1, 2, 3, 4, 5, 6])).toEqual([3, 4]);
    expect(queryOne('.[2:4]', [{ a: 5 }, 2, 3, 4, 5, 6])).toEqual([3, 4]);
    expect(queryOne('.[2:4]', [[4, 5], 2, 3, 4, 5, 6])).toEqual([3, 4]);
    expect(queryOne('.[2:4]', [])).toEqual([]);
    expect(queryOne('.[2:4]', ['lorem'])).toEqual([]);
  });

  test('query .[]', () => {
    expect(query('.[]', [[1, 2, 3]])).toEqual([1, 2, 3]);
    expect(query('.[]', [[{ a: 5 }, 2, 3]])).toEqual([{ a: 5 }, 2, 3]);
    expect(query('.[]', [[[4, 5], 2, 3]])).toEqual([[4, 5], 2, 3]);
    expect(query('.[]', [[]])).toEqual([]);
    expect(() => query('.[]', ['lorem'])).toThrowError();
    expect(() => query('.[]', [123])).toThrowError();
  });

  test('ArrayIndexOp', () => {
    expect(new ArrayIndexOp(0).evaluate([1, 2, 3])).toEqual(1);
  });

  test('ArraySliceOp', () => {
    expect(new ArraySliceOp(1, 3).evaluate([1, 2, 3])).toEqual([2, 3]);
  });

  test('ArrayOp', () => {
    expect(() => new ArrayOp().evaluate('lorem')).toThrowError();
    expect(new ArrayOp().evaluate([1, 2, 3])).toEqual(ResultSet.ofList(1, 2, 3));
  });
});

describe('Concatenation', () => {
  test('query .[0],.[1]', () => {
    expect(query('.[0],.[1]', [[1, 2, 3]])).toEqual([1, 2]);
    expect(query('.[0],.[1]', [[{ a: 5 }, 2, 3]])).toEqual([{ a: 5 }, 2]);
    expect(query('.[0],.[1]', [[[4, 5], 2, 3]])).toEqual([[4, 5], 2]);
    expect(query('.[0],.[1]', [[]])).toEqual([]);
    expect(query('.[0],.[1]', ['lorem'])).toEqual([]);
  });

  test('query .user, .projects[]', () => {
    expect(
      query('.user, .projects[]', [{ user: 'stedolan', projects: ['jq', 'wikiflow'] }])
    ).toEqual(['stedolan', 'jq', 'wikiflow']);
  });

  test('Concatenation', () => {
    expect(
      new Concatenation([new ArrayIndexOp(0), new ArrayIndexOp(2)]).evaluate([1, 2, 3])
    ).toEqual(ResultSet.ofList(1, 3));

    expect(
      new Concatenation([
        new PropertyLookupOp('test'),
        new FilterSequence([new PropertyLookupOp('arr'), new ArrayOp()])
      ]).evaluate({ test: 'lorem', arr: [1, 2] })
    ).toEqual(ResultSet.ofList('lorem', 1, 2));
  });
});

describe('pipe', () => {
  test('query .[] | .name', () => {
    expect(
      query('.[] | .name', [
        [
          { name: 'JSON', good: true },
          { name: 'XML', good: false }
        ]
      ])
    ).toEqual(['JSON', 'XML']);
  });

  test('FilterSequence', () => {
    const grp = new FilterSequence([new PropertyLookupOp('name'), new PropertyLookupOp('first')]);
    expect(grp.evaluate({ name: { first: 'John' } })).toEqual(ResultSet.of('John'));
  });
});

describe('ArrayConstructor', () => {
  test('[.user, .projects[]]', () => {
    expect(
      query('[.user, .projects[]]', [{ user: 'stedolan', projects: ['jq', 'wikiflow'] }])
    ).toEqual([['stedolan', 'jq', 'wikiflow']]);
  });

  test('ArrayConstructor', () => {
    const set = new ArrayConstructor(new PropertyLookupOp('user')).evaluate({ user: 'John' });
    expect(set).toEqual(['John']);

    expect(
      new ArrayConstructor(
        new Concatenation([new PropertyLookupOp('user'), new PropertyLookupOp('age')])
      ).evaluate({ user: 'John', age: 17 })
    ).toEqual(['John', 17]);
  });
});

describe('RecursiveDescent', () => {
  test('query: .. | .a', () => {
    expect(query('.. | .a', [[[{ a: 1 }]]])).toEqual([1]);
  });

  test('RecursiveDescentGenerator', () => {
    expect(
      new RecursiveDescentGenerator().evaluate({ user: 'stedolan', projects: ['jq', 'wikiflow'] })
    ).toEqual(
      ResultSet.ofList(
        { user: 'stedolan', projects: ['jq', 'wikiflow'] },
        'stedolan',
        ['jq', 'wikiflow'],
        'jq',
        'wikiflow'
      )
    );
  });
});

describe('AdditionBinaryOp', () => {
  test('query: .a + 1', () => {
    expect(queryOne('.a + 1', { a: 2 })).toEqual(3);
    expect(queryOne('.a + 1', {})).toEqual(1);
  });
  test('query: .a + null', () => {
    expect(queryOne('.a + null', { a: 2 })).toEqual(2);
  });
  test('query: .a + .b', () => {
    expect(queryOne('.a + .b', { a: 2, b: 3 })).toEqual(5);
    expect(queryOne('.a + .b', { a: [1, 2], b: [3, 4] })).toEqual([1, 2, 3, 4]);
  });
  test('query: {a: 1} + {b: 2} + {c: 3} + {a: 42}', () => {
    expect(queryOne('{a: 1} + {b: 2} + {c: 3} + {a: 42}', null)).toEqual({
      a: 42,
      b: 2,
      c: 3
    });
  });
});

describe('SubtractionBinaryOp', () => {
  test('query: .a - 1', () => {
    expect(queryOne('.a - 1', { a: 2 })).toEqual(1);
    expect(queryOne('.a - 1', {})).toEqual(-1);
  });
  test('query: .a - null', () => {
    expect(queryOne('.a - null', { a: 2 })).toEqual(2);
  });
  test('query: . - ["xml", "yaml"]', () => {
    expect(queryOne('. - ["xml", "yaml"]', ['json', 'xml', 'yaml'])).toEqual(['json']);
  });
});

describe('LengthFilter', () => {
  test('query: .[] | length', () => {
    expect(query('.[] | length', [[[1, 2], 'string', { a: 2 }, null, -5]])).toEqual([
      2, 6, 1, 0, 5
    ]);
  });
});

describe('HasFn', () => {
  test('query: has("foo")', () => {
    expect(query('has("foo")', [{ foo: 1, bar: 2 }, { bar: 3 }])).toEqual([true, false]);
  });
});

describe('InFn', () => {
  test('query: .[] | in({"foo": 42})', () => {
    expect(query('.[] | in({"foo": 42})', [['foo', 'bar']])).toEqual([true, false]);
  });
});

describe('MapFn', () => {
  test('query: map(. + 1)', () => {
    expect(query('map(. + 1)', [[1, 2, 3]])).toEqual([[2, 3, 4]]);
  });
  test('query: map(., .)', () => {
    expect(query('map(., .)', [[1, 2]])).toEqual([[1, 1, 2, 2]]);
  });
});

// TODO: Fix
describe('SelectFn', () => {
  test('query: .[] | select(.id == "second")', () => {
    expect(query('.[] | select(.id == "second")', [[{ id: 'first' }, { id: 'second' }]])).toEqual([
      { id: 'second' }
    ]);
  });
  test('query: map(select(. >= 2))', () => {
    expect(query('map(select(. >= 2))', [[1, 2, 3]])).toEqual([[2, 3]]);
  });
});

describe('AnyFilter', () => {
  test('query: any', () => {
    expect(query('any', [[true, true, false]])).toEqual([true]);
    expect(query('any', [[false, false, false]])).toEqual([false]);
    expect(query('any', [[]])).toEqual([false]);
  });
});

describe('AllFilter', () => {
  test('query: all', () => {
    expect(query('all', [[true, true, false]])).toEqual([false]);
    expect(query('all', [[true, true, true]])).toEqual([true]);
    expect(query('all', [[]])).toEqual([true]);
  });
});

describe('AndBinaryOp', () => {
  test('query: 42 and "a string"', () => {
    expect(queryOne('42 and "a string"', null)).toEqual(true);
  });
});

describe('OrBinaryOp', () => {
  test('query: 42 or "a string"', () => {
    expect(queryOne('42 or "a string"', null)).toEqual(true);
    expect(queryOne('false or false', null)).toEqual(false);
  });
});

describe('NotFilter', () => {
  test('query: true | not', () => {
    expect(queryOne('true | not', null)).toEqual(false);
  });
  test('query: [true, false | not]', () => {
    expect(query('[true, false | not]', [null])).toEqual([[true, true]]);
  });
});

describe('UniqueFilter', () => {
  test('query: unique', () => {
    expect(query('unique', [[1, 2, 3, 2, 1]])).toEqual([[1, 2, 3]]);
  });
});

describe('startswith', () => {
  test('query: startswith("foo")', () => {
    expect(query('startswith("foo")', [['foo', 'bar']])).toEqual([[true, false]]);
  });
  test('query: [.[] | startswith("foo")]', () => {
    expect(
      query('[.[] | startswith("foo")]', [['fo', 'foo', 'barfoo', 'foobar', 'barfoob']])
    ).toEqual([[false, true, false, true, false]]);
  });
});

// TODO: To be implemented
describe.skip('ObjectConstructor', () => {
  test('{name: .user, projects: .projects[]}', () => {
    expect(
      query('{name: .user, projects: .projects[]}', [
        {
          user: 'stedolan',
          projects: ['jq', 'wikiflow']
        }
      ])
    ).toEqual([
      { name: 'stedolan', projects: 'jq' },
      { name: 'stedolan', projects: 'wikiflow' }
    ]);
  });
});
