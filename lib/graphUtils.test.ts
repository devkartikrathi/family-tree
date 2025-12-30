
import { describe, it, expect } from 'vitest';
import { performAutoLayout } from './graphUtils';
import { AppNode, AppEdge } from './types';

describe('performAutoLayout', () => {
  it('should return empty array for empty input', () => {
    const result = performAutoLayout([], []);
    expect(result).toEqual([]);
  });

  it('should layout a single node', () => {
    const nodes: AppNode[] = [
      { id: '1', position: { x: 0, y: 0 }, data: { primary: { name: 'A', alive: true }, familySurname: 'Test', hasSpouse: false }, type: 'familyNode' }
    ];
    const result = performAutoLayout(nodes, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');

  });

  it('should layout parent and child', () => {
    const nodes: AppNode[] = [
      { id: '1', position: { x: 0, y: 0 }, data: { primary: { name: 'Parent', alive: true }, familySurname: 'Test', hasSpouse: false }, type: 'familyNode' },
      { id: '2', position: { x: 0, y: 0 }, data: { primary: { name: 'Child', alive: true }, familySurname: 'Test', hasSpouse: false, primaryRootNodeId: '1' }, type: 'familyNode' }
    ];
    const edges: AppEdge[] = [
      { id: 'e1', source: '1', target: '2', data: { relationshipType: 'PARENT_OF' } }
    ];

    const result = performAutoLayout(nodes, edges);
    expect(result).toHaveLength(2);

    const parent = result.find(n => n.id === '1');
    const child = result.find(n => n.id === '2');

    expect(parent).toBeDefined();
    expect(child).toBeDefined();


    expect(child!.position.y).toBeGreaterThan(parent!.position.y);
  });
});
