import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow'
import { useEffect, useLayoutEffect, useRef } from 'react'

import create from 'zustand'
import { defaults } from '../components/Nodes'
import { distribute } from '../util/maths'
import useAudio from './useAudio'
import useElementSize from './useElementSize'

// This could be a component and would be less clunky to use but it's weird for
// a component to not react to changes in props, while it's expected for hook
// arguments to represent an initial value
export function useGraph({ nodes, edges, ref }) {
    // create a store on first render. I'd like to use useMemo but React makes no
    // guarantee that it's only called once even with an empty dependency array.
    let useStoreRef = useRef(null)
    if (!useStoreRef.current) {
        useStoreRef.current = create((set, get) => ({
            nodes: nodes.map((n) => ({
                ...n,
                position: { x: 0, y: 0, ...n.position },
                data: {
                    ...defaults.get(n.type),
                    ...n.data,
                },
            })),
            edges: edges,
            // The width of the container isn't fixed in pixels. We want to
            // distribute the nodes evenly across the width of the container, so
            // we need to re-set the position of everything once we have the
            // container's dimensions.
            distributeNodes({ width, height }) {
                return set({
                    nodes: applyNodeChanges(
                        get().nodes.map(({ id }, i) => ({
                            id,
                            type: 'position',
                            position: {
                                x: distribute(0, width, 3, i) - 54,
                                y: height / 4,
                            },
                        })),
                        get().nodes
                    ),
                })
            },

            insertNode(node) {
                return set({
                    nodes: applyNodeChanges(
                        [{ type: 'add', item: node }],
                        get().nodes
                    ),
                })
            },

            updateNode(id, data) {
                return set({
                    nodes: get().nodes.map((n) =>
                        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
                    ),
                })
            },

            removeNode(id) {
                return set({ nodes: get().nodes.filter((n) => n.id !== id) })
            },

            updateNodes(changes) {
                return set({ nodes: applyNodeChanges(changes, get().nodes) })
            },

            updateEdges(changes) {
                return set({ edges: applyEdgeChanges(changes, get().edges) })
            },

            onConnect(params) {
                return set({ edges: addEdge(params, get().edges) })
            },
        }))
    }
    const useStore = useStoreRef.current
    const reactiveNodes = useStore((state) => state.nodes)
    const reactiveEdges = useStore((state) => state.edges)
    const [_, setAudioFromReactFlow, context] = useAudio()

    useEffect(() => {
        window.addEventListener('click', () => context.resume(), { once: true })
    }, [])
    useEffect(() => {
        setAudioFromReactFlow(reactiveNodes, reactiveEdges)
    }, [reactiveNodes, reactiveEdges])

    const distributeNodes = useStore((store) => store.distributeNodes)
    const { width, height } = useElementSize(ref)

    useLayoutEffect(() => distributeNodes({ width, height }), [width, height])

    return useStore
}
