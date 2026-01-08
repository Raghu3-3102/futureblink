import React, { useState, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    applyEdgeChanges,
    applyNodeChanges,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Play, Save, Loader2 } from 'lucide-react';
import './index.css';

// Custom Input Node
const InputNode = ({ data }) => {
    return (
        <div className="input-node">
            <label>PROMPT</label>
            <textarea
                rows="3"
                value={data.value}
                onChange={(evt) => data.onChange(evt.target.value)}
                placeholder="Type something..."
            />
            <Handle type="source" position={Position.Right} />
        </div>
    );
};

// Custom Result Node
const ResultNode = ({ data }) => {
    return (
        <div className="result-node">
            <label>AI RESPONSE</label>
            <div className="result-content">
                {data.value || "Waiting for run..."}
            </div>
            <Handle type="target" position={Position.Left} />
        </div>
    );
};

const nodeTypes = {
    inputNode: InputNode,
    resultNode: ResultNode,
};

const initialNodes = [
    {
        id: '1',
        type: 'inputNode',
        position: { x: 100, y: 150 },
        data: { value: '', onChange: () => { } }
    },
    {
        id: '2',
        type: 'resultNode',
        position: { x: 500, y: 150 },
        data: { value: '' }
    },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

export default function App() {
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const handlePromptChange = (val) => {
        setPrompt(val);
        setNodes((nds) =>
            nds.map((node) =>
                node.id === '1' ? { ...node, data: { ...node.data, value: val } } : node
            )
        );
    };

    const runFlow = async () => {
        if (!prompt) return;
        setLoading(true);
        setStatus('Generating AI response...');
        try {
            const res = await axios.post('http://localhost:5000/api/ask-ai', { prompt });
            const aiResponse = res.data.response;
            setResult(aiResponse);
            setNodes((nds) =>
                nds.map((node) =>
                    node.id === '2' ? { ...node, data: { ...node.data, value: aiResponse } } : node
                )
            );
            setStatus('AI response ready');
        } catch (err) {
            console.error(err);
            setStatus('Error: AI request failed');
        } finally {
            setLoading(false);
        }
    };

    const saveFlow = async () => {
        if (!prompt || !result) {
            setStatus('Must run flow before saving');
            return;
        }
        setLoading(true);
        setStatus('Saving to MongoDB...');
        try {
            await axios.post('http://localhost:5000/api/save-flow', { prompt, response: result });
            setStatus('Flow saved successfully!');
        } catch (err) {
            console.error(err);
            setStatus('Error: Failed to save to database');
        } finally {
            setLoading(false);
        }
    };

    // Connect local state to node's internal state
    const nodesWithCallbacks = nodes.map(node => {
        if (node.id === '1') {
            return { ...node, data: { ...node.data, onChange: handlePromptChange } };
        }
        return node;
    });

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <div className="controls">
                <button className="btn btn-primary" onClick={runFlow} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                    Run Flow
                </button>
                <button className="btn btn-secondary" onClick={saveFlow} disabled={loading}>
                    <Save size={18} />
                    Save
                </button>
            </div>

            {status && <div className="status-msg">{status}</div>}

            <ReactFlow
                nodes={nodesWithCallbacks}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background color="#334155" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
}
