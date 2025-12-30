import { AppNode, AppEdge } from './types';

const CLUSTER_SPACING = 400;
const NODE_WIDTH = 300;
const NODE_HEIGHT = 200;
const X_SPACING = 50;
const Y_SPACING = 150;

export function performAutoLayout(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
    if (nodes.length === 0) return [];

    const nodeMap = new Map(nodes.map(n => [n.id, n]));


    const patriarchCache: Record<string, string> = {};
    const visitedPath = new Set<string>();

    const getPatriarch = (nid: string): string => {
        if (patriarchCache[nid]) return patriarchCache[nid];


        if (visitedPath.has(nid)) return nid;
        visitedPath.add(nid);

        const node = nodeMap.get(nid);
        const parentId = node?.data?.primaryRootNodeId as string;

        let result: string;
        if (!parentId || !nodeMap.has(parentId)) {

            result = nid;
        } else {

            result = getPatriarch(parentId);
        }

        visitedPath.delete(nid);
        patriarchCache[nid] = result;
        return result;
    };


    const clusters: Record<string, AppNode[]> = {};

    nodes.forEach(n => {
        const pId = getPatriarch(n.id);
        if (!clusters[pId]) clusters[pId] = [];
        clusters[pId].push(n);
    });

    const clusterList: AppNode[][] = Object.values(clusters);


    const allParents: Record<string, string[]> = {};
    nodes.forEach(n => allParents[n.id] = []);
    edges.forEach(e => {
        if (e.data?.relationshipType === 'PARENT_OF') {
            if (allParents[e.target]) allParents[e.target].push(e.source);
        }
    });


    const spousesMap: Record<string, string[]> = {};
    Object.values(allParents).forEach(parents => {
        if (parents.length > 1) {
            parents.forEach(p1 => {
                if (!spousesMap[p1]) spousesMap[p1] = [];
                parents.forEach(p2 => {
                    if (p1 !== p2 && !spousesMap[p1].includes(p2)) {
                        spousesMap[p1].push(p2);
                    }
                });
            });
        }
    });

    const generations: Record<string, number> = {};
    let changed = true;
    let iter = 0;
    nodes.forEach(n => generations[n.id] = 0);

    while (changed && iter < nodes.length + 2) {
        changed = false;
        nodes.forEach(n => {
            const currentGen = generations[n.id] || 0;
            let proposedGen = currentGen;


            allParents[n.id].forEach(pId => {
                const pGen = generations[pId];
                if (pGen !== undefined) {
                    proposedGen = Math.max(proposedGen, pGen + 1);
                }
            });


            const spouses = spousesMap[n.id] || [];
            spouses.forEach(sId => {
                const sGen = generations[sId];
                if (sGen !== undefined) {
                    proposedGen = Math.max(proposedGen, sGen);
                }
            });

            if (proposedGen > currentGen) {
                generations[n.id] = proposedGen;
                changed = true;
            }
        });
        iter++;
    }


    const finalNodes: AppNode[] = [];
    let currentXOffset = 0;


    clusterList.sort((a, b) => b.length - a.length);

    const layoutCluster = (clusterNodes: AppNode[]): { nodes: AppNode[], width: number } => {
        if (clusterNodes.length === 0) return { nodes: [], width: 0 };

        const clusterMap = new Map(clusterNodes.map(n => [n.id, n]));


        const childrenMap: Record<string, string[]> = {};
        const roots: string[] = [];

        clusterNodes.forEach(n => {
            childrenMap[n.id] = [];
        });

        clusterNodes.forEach(n => {
            const pId = n.data?.primaryRootNodeId as string;

            if (pId && clusterMap.has(pId)) {
                childrenMap[pId].push(n.id);
            } else {

                roots.push(n.id);
            }
        });

        const subtreeWidths: Record<string, number> = {};


        const visiting = new Set<string>();

        const calcWidth = (nodeId: string): number => {
            if (visiting.has(nodeId)) return NODE_WIDTH;
            visiting.add(nodeId);

            const children = childrenMap[nodeId] || [];
            if (children.length === 0) {
                subtreeWidths[nodeId] = NODE_WIDTH;
                visiting.delete(nodeId);
                return NODE_WIDTH;
            }

            let childrenTotalWidth = 0;
            children.forEach((childId, idx) => {
                childrenTotalWidth += calcWidth(childId);
                if (idx < children.length - 1) childrenTotalWidth += X_SPACING;
            });


            const width = Math.max(NODE_WIDTH, childrenTotalWidth);
            subtreeWidths[nodeId] = width;
            visiting.delete(nodeId);
            return width;
        };


        const getBirthYear = (nodeId: string): number => {
            const node = clusterMap.get(nodeId);
            const dob = node?.data?.primary?.dateOfBirth as string;
            if (!dob) return 9999;
            const match = dob.match(/(\d{4})/);
            return match ? parseInt(match[1], 10) : 9999;
        };


        roots.sort((a, b) => getBirthYear(a) - getBirthYear(b));

        roots.forEach(r => calcWidth(r));


        const resultNodes: AppNode[] = [];

        const assignPos = (nodeId: string, x: number, gen: number) => {
            const node = clusterMap.get(nodeId);
            if (!node) return;


            let yOffset = 0;
            const dobString = node.data?.primary?.dateOfBirth as string;
            if (dobString) {
                const yearMatch = dobString.match(/(\d{4})/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[1], 10);

                    yOffset = ((year % 5) * 10) - 20;
                }
            }


            const globalGen = generations[nodeId] || 0;
            const y = (globalGen * (NODE_HEIGHT + Y_SPACING)) + yOffset;

            const newNode = {
                ...node,
                position: { x, y }
            };
            resultNodes.push(newNode);


            const children = childrenMap[nodeId] || [];
            if (children.length > 0) {

                children.sort((a, b) => getBirthYear(a) - getBirthYear(b));


                let childrenTotalWidth = 0;
                children.forEach((cid, i) => {
                    childrenTotalWidth += subtreeWidths[cid];
                    if (i < children.length - 1) childrenTotalWidth += X_SPACING;
                });


                let currentChildX = x - (childrenTotalWidth / 2);

                children.forEach(cid => {
                    const cw = subtreeWidths[cid];

                    assignPos(cid, currentChildX + (cw / 2), gen + 1);
                    currentChildX += cw + X_SPACING;
                });
            }
        };


        let currentRootX = 0;
        roots.forEach((r) => {
            const rw = subtreeWidths[r];

            assignPos(r, currentRootX + (rw / 2), generations[r] || 0);
            currentRootX += rw + CLUSTER_SPACING;
        });


        if (resultNodes.length === 0) return { nodes: [], width: 0 };
        let minX = Infinity, maxX = -Infinity;
        resultNodes.forEach(n => {
            minX = Math.min(minX, n.position.x);
            maxX = Math.max(maxX, n.position.x);
        });
        const realWidth = (maxX - minX) + NODE_WIDTH;
        const centerOffset = -((minX + maxX) / 2);


        const finalLocalNodes = resultNodes.map(n => ({
            ...n,
            position: { ...n.position, x: n.position.x + centerOffset }
        }));

        return { nodes: finalLocalNodes, width: realWidth };
    };

    clusterList.forEach(cluster => {
        const { nodes: solvedNodes, width } = layoutCluster(cluster);


        const positionedNodes = solvedNodes.map(n => ({
            ...n,
            position: { ...n.position, x: n.position.x + currentXOffset + (width / 2) }
        }));

        finalNodes.push(...positionedNodes);
        currentXOffset += width + CLUSTER_SPACING;
    });

    return finalNodes;
}
