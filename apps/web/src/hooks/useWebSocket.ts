import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

interface WSMessage {
  type: 'WORKFLOW_UPDATE' | 'EXECUTION_RESULT' | 'NODE_EXECUTING' | 'NODE_RESULT' | 'ADAPTATION_TRIGGERED';
  payload: unknown;
  timestamp?: string;
}

// Track processed messages to prevent duplicates
const processedMessages = new Set<string>();

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const connect = () => {
      // Don't connect if already connected or connecting
      if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        if (!mounted.current) return;

        try {
          const message: WSMessage = JSON.parse(event.data);

          // Create unique message ID for deduplication
          const msgId = `${message.type}-${message.timestamp}-${JSON.stringify(message.payload).slice(0, 100)}`;

          // Skip if already processed
          if (processedMessages.has(msgId)) {
            return;
          }
          processedMessages.add(msgId);

          // Clean old messages (keep last 100)
          if (processedMessages.size > 100) {
            const arr = Array.from(processedMessages);
            arr.slice(0, 50).forEach(id => processedMessages.delete(id));
          }

          const { setNodes, setEdges, addExecutionLog, updateExecutionLog, setIsExecuting, setExecutingNodeId, setNodeDebugData, updateNodeDebugData } = useWorkflowStore.getState();

          switch (message.type) {
            case 'WORKFLOW_UPDATE': {
              const payload = message.payload as { nodes: unknown[]; edges: unknown[] };
              setNodes(payload.nodes as never[]);
              setEdges(payload.edges as never[]);
              break;
            }

            case 'NODE_EXECUTING': {
              const payload = message.payload as { nodeId: string; nodeType: string; inputs: Record<string, unknown> };
              setExecutingNodeId(payload.nodeId);
              addExecutionLog({
                timestamp: message.timestamp || new Date().toISOString(),
                nodeId: payload.nodeId,
                nodeType: payload.nodeType,
                status: 'running',
              });
              // Store debug data with inputs
              setNodeDebugData(payload.nodeId, {
                nodeId: payload.nodeId,
                nodeType: payload.nodeType,
                inputs: payload.inputs || {},
                output: null,
                timestamp: message.timestamp || new Date().toISOString(),
                status: 'running',
              });
              break;
            }

            case 'NODE_RESULT': {
              const payload = message.payload as {
                nodeId: string;
                nodeType: string;
                result: { status?: string; error?: string; duration?: number; data?: unknown };
                inputs: Record<string, unknown>;
              };
              // Update the existing log entry instead of adding a new one
              updateExecutionLog(payload.nodeId, {
                status: payload.result.status === 'error' ? 'error' : 'success',
                result: payload.result.data,
                error: payload.result.error,
                duration: payload.result.duration,
              });
              // Update debug data with output
              updateNodeDebugData(payload.nodeId, {
                output: payload.result.data,
                error: payload.result.error,
                duration: payload.result.duration,
                status: payload.result.status === 'error' ? 'error' : 'success',
              });
              break;
            }

            case 'EXECUTION_RESULT': {
              setIsExecuting(false);
              setExecutingNodeId(null);
              break;
            }

            case 'ADAPTATION_TRIGGERED': {
              const payload = message.payload as {
                reasoning: string;
                changes: string[];
                newWorkflow?: { nodes: unknown[]; edges: unknown[] };
              };

              if (payload.newWorkflow) {
                setNodes(payload.newWorkflow.nodes as never[]);
                setEdges(payload.newWorkflow.edges as never[]);
              }
              break;
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        if (mounted.current) {
          console.log('WebSocket disconnected, reconnecting...');
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      mounted.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, []);

  const send = (message: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { send };
}
