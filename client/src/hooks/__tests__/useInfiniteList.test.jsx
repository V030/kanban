import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useInfiniteList from '../useInfiniteList';

function makeFetcher() {
  const calls = [];
  return {
    fetcher: jest.fn(async ({ limit, cursor }) => {
      calls.push({ limit, cursor });
      if (!cursor) {
        return { items: [{ id: 1, title: 'one' }, { id: 2, title: 'two' }], nextCursor: 'c1', hasMore: true };
      }
      if (cursor === 'c1') {
        return { items: [{ id: 3, title: 'three' }], nextCursor: null, hasMore: false };
      }
      return { items: [], nextCursor: null, hasMore: false };
    }),
    calls,
  };
}

function TestComp({ fetcher }) {
  const { items, loading, sentinelRef, loadMore, prependItems, updateItem, updateItems, reset, hasMore } = useInfiniteList(fetcher, { limit: 2, autoLoad: true });

  return (
    <div>
      <div data-testid="loading">{loading ? '1' : '0'}</div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="hasMore">{hasMore ? '1' : '0'}</div>
      <div>
        {items.map((it) => (
          <div key={it.id} data-testid={`item-${it.id}`}>{it.title || ''}{it.status ? `|${it.status}` : ''}</div>
        ))}
      </div>

      <button onClick={() => loadMore()}>more</button>
      <button onClick={() => prependItems([{ id: 0, title: 'zero' }])}>prepend</button>
      <button onClick={() => updateItem(1, { status: 'read' })}>update1</button>
      <button onClick={() => updateItems([{ id: 2, status: 'read' }])}>update2</button>
      <button onClick={() => reset()}>reset</button>
      <div ref={sentinelRef} />
    </div>
  );
}

describe('useInfiniteList', () => {
  test('loads initial page and subsequent pages, supports prepend and updates', async () => {
    const { fetcher, calls } = makeFetcher();

    render(<TestComp fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(screen.getByTestId('hasMore').textContent).toBe('1');

    // load more
    fireEvent.click(screen.getByText('more'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));
    expect(screen.getByTestId('hasMore').textContent).toBe('0');

    // prepend
    fireEvent.click(screen.getByText('prepend'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));

    // update single
    fireEvent.click(screen.getByText('update1'));
    await waitFor(() => expect(screen.getByTestId('item-1').textContent).toMatch(/\|read$/));

    // update item 2
    fireEvent.click(screen.getByText('update2'));
    await waitFor(() => expect(screen.getByTestId('item-2').textContent).toMatch(/\|read$/));

    // reset should reload initial page
    fireEvent.click(screen.getByText('reset'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
  });
});
