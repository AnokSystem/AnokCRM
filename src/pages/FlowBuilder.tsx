import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
  ReactFlowInstance,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save,
  Plus,
  MessageSquareText,
  ImagePlus,
  Volume2,
  Clapperboard,
  FileText,
  Timer,
  PlayCircle,
  Sparkles,
  Trash2,
  Edit3,
  Eye,
  X,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/lib/fileUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import * as flowService from '@/services/flowService';
import { storageService } from '@/services/storageService';

const nodeTypeConfig = [
  { type: 'start', label: 'Início', icon: PlayCircle, color: 'hsl(142, 76%, 36%)', borderColor: 'hsl(142, 76%, 50%)' },
  { type: 'text', label: 'Texto', icon: MessageSquareText, color: 'hsl(267, 84%, 50%)', borderColor: 'hsl(267, 84%, 60%)' },
  { type: 'image', label: 'Imagem', icon: ImagePlus, color: 'hsl(280, 90%, 45%)', borderColor: 'hsl(280, 90%, 55%)' },
  { type: 'audio', label: 'Áudio', icon: Volume2, color: 'hsl(200, 90%, 45%)', borderColor: 'hsl(200, 90%, 55%)' },
  { type: 'video', label: 'Vídeo', icon: Clapperboard, color: 'hsl(340, 85%, 50%)', borderColor: 'hsl(340, 85%, 60%)' },
  { type: 'pdf', label: 'PDF', icon: FileText, color: 'hsl(25, 95%, 53%)', borderColor: 'hsl(25, 95%, 63%)' },
  { type: 'delay', label: 'Delay', icon: Timer, color: 'hsl(240, 5%, 40%)', borderColor: 'hsl(240, 5%, 50%)' },
];

// Custom N8N-style node component
function CustomNode({ data, selected }: NodeProps) {
  const nodeConfig = nodeTypeConfig.find(n => n.type === data.type);
  const IconComponent = nodeConfig?.icon || MessageSquareText;
  const isStart = data.type === 'start';
  const isDelay = data.type === 'delay';
  const delaySeconds = data.delay_seconds as number;

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        selected && "scale-105"
      )}
    >
      {/* Only show target handle if NOT start node */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background"
        />
      )}

      {/* Main node container - N8N style square */}
      <div
        className={cn(
          "w-16 h-16 rounded-xl flex flex-col items-center justify-center",
          "bg-card border-2 shadow-lg transition-all duration-200",
          "hover:shadow-xl hover:scale-105",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        style={{
          borderColor: nodeConfig?.borderColor || 'hsl(240, 5%, 30%)'
        }}
      >
        {isDelay && delaySeconds ? (
          /* Show seconds for delay node */
          <div className="flex flex-col items-center">
            <span
              className="text-lg font-bold leading-none"
              style={{ color: nodeConfig?.color || 'currentColor' }}
            >
              {delaySeconds}
            </span>
            <span
              className="text-[10px] opacity-70"
              style={{ color: nodeConfig?.color || 'currentColor' }}
            >
              seg
            </span>
          </div>
        ) : (
          <IconComponent
            className="w-7 h-7"
            style={{ color: nodeConfig?.color || 'currentColor' }}
          />
        )}
      </div>

      {/* Label below node */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs font-medium text-foreground">
          {(data.label as string) || nodeConfig?.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background !bottom-[-6px]"
      />
    </div>
  );
}

const customNodeTypes = {
  custom: CustomNode,
};

const DeletableEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-6 h-6 bg-card border border-border/60 text-muted-foreground rounded-full flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all shadow-sm z-50 cursor-pointer"
            onClick={onEdgeClick}
            title="Remover conexão"
          >
            <div className="flex items-center justify-center">
              {/* Scissors Icon Custom or just X? User asked for scissors but X is clearer for delete. Let's use Scissors if importing or just X as simple delete. */}
              {/* Actually user asked "pequena tesoura" (small scissors). Let's import Scissors. */}
              <Trash2 className="w-3 h-3" />
            </div>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const customEdgeTypes = {
  default: DeletableEdge,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 250, y: 50 },
    data: { label: 'Início', type: 'start', content: 'Início do fluxo' },
  },
];

const initialEdges: Edge[] = [];

interface NodeFormData {
  type: string;
  label: string;
  content?: string;
  media_base64?: string; // Legacy
  media_url?: string;
  delay_seconds?: number;
}

export default function FlowBuilder() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const flowId = searchParams.get('id');

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(!flowId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<NodeFormData>({ type: 'text', label: '' });
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [droppedPosition, setDroppedPosition] = useState<{ x: number, y: number } | null>(null);
  const [flowStatus, setFlowStatus] = useState<'ativo' | 'inativo' | 'rascunho'>('rascunho');

  useEffect(() => {
    if (flowId) {
      loadFlow(flowId);
    }
  }, [flowId]);

  const loadFlow = async (id: string) => {
    setIsLoading(true);
    try {
      const flow = await flowService.getFlow(id);
      if (flow) {
        setFlowName(flow.name);
        setFlowDescription(flow.description || '');
        setFlowStatus(flow.status);
        if (flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
          setNodes(flow.nodes);
        } else {
          setNodes(initialNodes);
        }
        if (flow.edges && Array.isArray(flow.edges)) {
          setEdges(flow.edges);
        }
        setIsNameDialogOpen(false);
      } else {
        toast({ title: 'Fluxo não encontrado', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erro ao carregar fluxo', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  /* Combined function for Create or Rename Flow */
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName.trim()) {
      toast({ title: 'Digite o nome do fluxo', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Erro: Usuário não autenticado', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      if (!flowId) {
        // CREATE MODE
        const newFlow = await flowService.createFlow(user.id, {
          name: flowName,
          description: flowDescription,
          nodes: initialNodes,
          nodes_count: 1,
          status: 'rascunho'
        });

        if (newFlow) {
          toast({ title: `Fluxo "${flowName}" iniciado!` });
          setIsNameDialogOpen(false);
          navigate(`/flows?id=${newFlow.id}`, { replace: true });
        }
      } else {
        // RENAME MODE
        await flowService.updateFlow(flowId, {
          name: flowName,
          description: flowDescription
        });
        toast({ title: 'Nome do fluxo atualizado!' });
        setIsNameDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro ao salvar informações do fluxo', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(267, 84%, 50%)' } }, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (position) {
        setDroppedPosition(position);
        setFormData({ type, label });
        setIsDialogOpen(true);
      }
    },
    [reactFlowInstance]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);

    // Support both new URL field and legacy base64 field
    const mediaUrl = (node.data.media_url as string) || (node.data.media_base64 as string);

    setFormData({
      type: node.data.type as string,
      label: node.data.label as string,
      content: node.data.content as string,
      media_url: mediaUrl,
      delay_seconds: node.data.delay_seconds as number,
    });
    setIsDetailsOpen(true);
    setIsEditing(false);
  }, []);

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: droppedPosition || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: formData.label || formData.type,
        type: formData.type,
        content: formData.content,
        media_url: formData.media_url,
        delay_seconds: formData.delay_seconds,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDialogOpen(false);
    setDroppedPosition(null);
    setFormData({ type: 'text', label: '' });
    toast({ title: 'Nó adicionado!' });
  };

  const updateNode = () => {
    if (!selectedNode) return;

    setNodes((nds) => nds.map((node) => {
      if (node.id === selectedNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            label: formData.label,
            content: formData.content,
            media_url: formData.media_url,
            // Clear legacy base64 if we have a URL now, or just prefer URL
            media_base64: formData.media_url ? undefined : node.data.media_base64,
            delay_seconds: formData.delay_seconds,
          },
        };
      }
      return node;
    }));

    setIsDetailsOpen(false);
    setIsEditing(false);
    toast({ title: 'Nó atualizado!' });
  };

  const deleteNode = () => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setIsDetailsOpen(false);
    toast({ title: 'Nó removido!' });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await storageService.uploadFlowMedia(file);

        if (url) {
          // [MOD] Auto-save filename to content field on upload
          setFormData({
            ...formData,
            media_url: url,
            content: file.name // Auto-fill content with filename
          });
          toast({ title: 'Arquivo enviado com sucesso!' });
        } else {
          toast({ title: 'Erro ao enviar arquivo - URL vazia', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({ title: 'Erro no upload', description: 'Falha ao enviar para o Storage', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const saveFlow = async () => {
    if (!flowId) {
      toast({ title: 'Erro: Salve o fluxo primeiro', variant: 'destructive' });
      return;
    }

    try {
      const flowData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      };

      await flowService.updateFlow(flowId, {
        nodes: flowData.nodes,
        edges: flowData.edges,
        nodes_count: nodes.length
      });

      toast({ title: 'Fluxo salvo!', description: 'Todas as alterações foram gravadas.' });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Erro ao salvar fluxo',
        description: error.message || 'Verifique o console para mais detalhes',
        variant: 'destructive'
      });
    }
  };

  const toggleFlowStatus = async () => {
    if (!flowId) return;

    try {
      const newStatus = flowStatus === 'ativo' ? 'rascunho' : 'ativo';
      await flowService.updateFlow(flowId, { status: newStatus });
      setFlowStatus(newStatus);
      toast({
        title: newStatus === 'ativo' ? 'Fluxo ativado!' : 'Fluxo pausado (rascunho)',
        description: newStatus === 'ativo' ? 'O fluxo está rodando para novos leads.' : 'O fluxo não será mais disparado.'
      });
    } catch (error) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' });
    }
  };

  const getNodeTypeInfo = (type: string) => nodeTypeConfig.find(n => n.type === type);

  const renderPreview = () => {
    if (!selectedNode) return null;

    const type = selectedNode.data.type as string;
    const content = selectedNode.data.content as string;
    // Prefer URL, fallback to base64
    const media = (selectedNode.data.media_url as string) || (selectedNode.data.media_base64 as string);
    const delay = selectedNode.data.delay_seconds as number;

    if (type === 'text' && content) {
      return (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">{content}</p>
        </div>
      );
    }

    if (type === 'image' && media) {
      return (
        <div className="rounded-lg overflow-hidden">
          <img src={media} alt="Preview" className="max-w-full h-auto max-h-48 object-contain" />
        </div>
      );
    }

    if (type === 'audio' && media) {
      return <audio controls src={media} className="w-full" />;
    }

    if (type === 'video' && media) {
      return <video controls src={media} className="w-full max-h-48" />;
    }

    if (type === 'pdf' && media) {
      return (
        <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
          <FileText className="w-8 h-8 text-orange-500" />
          <span className="text-sm">PDF carregado</span>
        </div>
      );
    }

    if (type === 'delay') {
      return (
        <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
          <Timer className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm font-medium">{delay || 0} segundos</span>
        </div>
      );
    }

    return <p className="text-sm text-muted-foreground">Nenhum conteúdo configurado</p>;
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)] relative">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            {flowName || "Flow Builder"}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full border border-border/40 hover:bg-muted"
              onClick={() => setIsNameDialogOpen(true)}
              title="Renomear fluxo"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        }
        description={flowName ? "Editando fluxo de automação" : "Crie fluxos de remarketing automatizados"}
      >
        <div className="flex items-center gap-2">
          {flowId && (
            <Button
              variant="ghost"
              onClick={toggleFlowStatus}
              className={cn(
                "gap-2",
                flowStatus === 'ativo'
                  ? "text-green-500 hover:text-green-600 hover:bg-green-500/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {flowStatus === 'ativo' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {flowStatus === 'ativo' ? 'Ativo' : 'Ativar'}
            </Button>
          )}
          <Button variant="outline" className="gradient-primary text-primary-foreground" onClick={saveFlow}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Fluxo
          </Button>
        </div>
      </PageHeader>

      <div className="flex gap-4 h-full">
        {/* Node Palette */}
        <div className="w-52 rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Componentes
          </h3>
          {nodeTypeConfig.map((nodeType) => {
            const isStartNode = nodeType.type === 'start';
            const hasStartNode = nodes.some((n) => n.data.type === 'start');
            const isDisabled = isStartNode && hasStartNode;

            return (
              <div
                key={nodeType.type}
                draggable={!isDisabled}
                onDragStart={(event) => {
                  if (isDisabled) {
                    event.preventDefault();
                    return;
                  }
                  onDragStart(event, nodeType.type, nodeType.label);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed bg-muted/20'
                    : 'cursor-move bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50'
                )}
                onClick={() => {
                  if (isDisabled) return;
                  setFormData({ type: nodeType.type, label: nodeType.label });
                  setDroppedPosition(null);
                  setIsDialogOpen(true);
                }}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-transform border-2 bg-card",
                    !isDisabled && "group-hover:scale-110"
                  )}
                  style={{
                    borderColor: isDisabled ? 'currentColor' : nodeType.borderColor
                  }}
                >
                  <nodeType.icon className="w-5 h-5" style={{ color: isDisabled ? 'currentColor' : nodeType.color }} />
                </div>
                <span>{nodeType.label}</span>
                {isDisabled && <span className="text-[10px] ml-auto text-muted-foreground">(Já existe)</span>}
              </div>
            );
          })}
        </div>

        {/* Flow Canvas */}
        <div
          className="flex-1 rounded-xl border border-border bg-card overflow-hidden"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            nodeTypes={customNodeTypes}
            edgeTypes={customEdgeTypes}
            fitView
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Controls className="!bg-card !border-border" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(240, 5%, 20%)" />
          </ReactFlow>
        </div>
      </div>

      {/* Add Node Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const config = getNodeTypeInfo(formData.type);
                const IconComp = config?.icon || MessageSquareText;
                return (
                  <>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border-2"
                      style={{ background: 'hsl(240, 6%, 15%)', borderColor: config?.borderColor }}
                    >
                      <IconComp className="w-4 h-4" style={{ color: config?.color }} />
                    </div>
                    Adicionar: {formData.label}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Nó</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>

            {formData.type === 'text' && (
              <div>
                <Label>Conteúdo</Label>
                {/* Variables Helper - Enhanced Design */}
                <div className="space-y-3 mb-3 mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                  {/* Universal Variables */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-blue-400">🌍 Universais</span>
                      <div className="h-px flex-1 bg-border/30"></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Saudação', value: '{{greeting}}', desc: 'Bom dia/tarde/noite' },
                        { label: 'Nome', value: '{{first_name}}', desc: 'Primeiro nome' },
                        { label: 'Telefone', value: '{{phone}}', desc: 'Número do lead' },
                      ].map((v) => (
                        <button
                          key={v.value}
                          title={v.desc}
                          className="text-[11px] px-2.5 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/20 hover:border-blue-500/40 transition-all duration-200 font-medium"
                          onClick={() => setFormData({ ...formData, content: (formData.content || '') + ' ' + v.value })}
                        >
                          + {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campaign Variables */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-purple-400">📧 Campanhas</span>
                      <div className="h-px flex-1 bg-border/30"></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Email', value: '{{email}}', desc: 'Email do lead' },
                        { label: 'Cidade', value: '{{city}}', desc: 'Cidade' },
                        { label: 'Estado', value: '{{state}}', desc: 'UF' },
                      ].map((v) => (
                        <button
                          key={v.value}
                          title={v.desc}
                          className="text-[11px] px-2.5 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md hover:bg-purple-500/20 hover:border-purple-500/40 transition-all duration-200 font-medium"
                          onClick={() => setFormData({ ...formData, content: (formData.content || '') + ' ' + v.value })}
                        >
                          + {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Integration Variables */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-green-400">💰 Integrações</span>
                      <div className="h-px flex-1 bg-border/30"></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Produto', value: '{{product_name}}', desc: 'Nome do produto' },
                        { label: 'Valor', value: '{{product_value}}', desc: 'Valor da venda' },
                        { label: 'Checkout', value: '{{checkout_url}}', desc: 'Link de acesso' },
                      ].map((v) => (
                        <button
                          key={v.value}
                          title={v.desc}
                          className="text-[11px] px-2.5 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-200 font-medium"
                          onClick={() => setFormData({ ...formData, content: (formData.content || '') + ' ' + v.value })}
                        >
                          + {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Digite a mensagem..."
                  rows={6}
                />
              </div>
            )}

            {['image', 'audio', 'video', 'pdf'].includes(formData.type) && (
              <div>
                <Label>Arquivo</Label>
                <Input type="file" onChange={handleFileChange} disabled={isUploading} />
                {isUploading && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enviando...
                  </div>
                )}
                {formData.media_url && !isUploading && (
                  <p className="text-sm text-green-500 mt-1">✓ Arquivo carregado</p>
                )}
              </div>
            )}

            {formData.type === 'delay' && (
              <div>
                <Label>Delay (segundos)</Label>
                <Input
                  type="number"
                  value={formData.delay_seconds || ''}
                  onChange={(e) => setFormData({ ...formData, delay_seconds: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="gradient-primary" onClick={addNode} disabled={isUploading}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Node Details / Edit Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNode && (() => {
                const config = getNodeTypeInfo(selectedNode.data.type as string);
                const IconComp = config?.icon || MessageSquareText;
                return (
                  <>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border-2"
                      style={{ background: 'hsl(240, 6%, 15%)', borderColor: config?.borderColor }}
                    >
                      <IconComp className="w-4 h-4" style={{ color: config?.color }} />
                    </div>
                    {isEditing ? 'Editar Nó' : selectedNode.data.label as string}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>

          {!isEditing ? (
            /* View Mode */
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">Tipo</Label>
                <p className="text-sm font-medium capitalize">{selectedNode?.data.type as string}</p>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Prévia do Conteúdo</Label>
                <div className="mt-2">
                  {renderPreview()}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={deleteNode}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <Label>Nome do Nó</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>

              {formData.type === 'text' && (
                <div>
                  <Label>Conteúdo</Label>
                  {/* Variables Helper - Enhanced Design */}
                  <div className="space-y-3 mb-3 mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    {/* Universal Variables */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-blue-400">🌍 Universais</span>
                        <div className="h-px flex-1 bg-border/30"></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Saudação', value: '{{greeting}}', desc: 'Bom dia/tarde/noite' },
                          { label: 'Nome', value: '{{first_name}}', desc: 'Primeiro nome' },
                          { label: 'Telefone', value: '{{phone}}', desc: 'Número do lead' },
                        ].map((v) => (
                          <button
                            key={v.value}
                            title={v.desc}
                            className="text-[11px] px-2.5 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/20 hover:border-blue-500/40 transition-all duration-200 font-medium"
                            onClick={() => setFormData({ ...formData, content: (formData.content || '') + ' ' + v.value })}
                          >
                            + {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campaign Variables */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-purple-400">📧 Campanhas</span>
                        <div className="h-px flex-1 bg-border/30"></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Email', value: '{{email}}', desc: 'Email do lead' },
                          { label: 'Cidade', value: '{{city}}', desc: 'Cidade' },
                          { label: 'Estado', value: '{{state}}', desc: 'UF' },
                        ].map((v) => (
                          <button
                            key={v.value}
                            title={v.desc}
                            className="text-[11px] px-2.5 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md hover:bg-purple-500/20 hover:border-purple-500/40 transition-all duration-200 font-medium"
                            onClick={() => setFormData({ ...formData, content: (formData.content || '') + ' ' + v.value })}
                          >
                            + {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Integration Variables */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-green-400">💰 Integrações</span>
                        <div className="h-px flex-1 bg-border/30"></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Produto', value: '{{product_name}}', desc: 'Nome do produto' },
                          { label: 'Valor', value: '{{product_value}}', desc: 'Valor da venda' },
                          { label: 'Checkout', value: '{{checkout_url}}', desc: 'Link de acesso' },
                        ].map((v) => (
                          <button
                            key={v.value}
                            title={v.desc}
                            className="text-[11px] px-2.5 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-200 font-medium"
                            onClick={() => setFormData({ ...formData, content: (formData.content || '') + ' ' + v.value })}
                          >
                            + {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Textarea
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Digite a mensagem..."
                    rows={6}
                  />
                </div>
              )}

              {['image', 'audio', 'video', 'pdf'].includes(formData.type) && (
                <div>
                  <Label>Arquivo</Label>
                  <Input type="file" onChange={handleFileChange} disabled={isUploading} />
                  {isUploading && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Enviando...
                    </div>
                  )}
                  {formData.media_url && !isUploading && (
                    <p className="text-sm text-green-500 mt-1">✓ Arquivo carregado</p>
                  )}
                </div>
              )}

              {formData.type === 'delay' && (
                <div>
                  <Label>Delay (segundos)</Label>
                  <Input
                    type="number"
                    value={formData.delay_seconds || ''}
                    onChange={(e) => setFormData({ ...formData, delay_seconds: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gradient-primary"
                  onClick={updateNode}
                  disabled={isUploading}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Initial Name Overlay - "Inside the Flow" */}
      {isNameDialogOpen && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{flowId ? 'Renomear Fluxo' : 'Vamos começar!'}</h2>
              <p className="text-muted-foreground">
                {flowId ? 'Atualize o nome e descrição do seu fluxo.' : 'Dê um nome para seu novo fluxo de automação.'}
              </p>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flowName" className="sr-only">Nome do Fluxo</Label>
                <div className="relative">
                  <Input
                    id="flowName"
                    placeholder="Ex: Recuperação de Carrinho"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    autoFocus
                    className="h-12 pl-4 text-lg bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="flowDescription" className="sr-only">Descrição (Opcional)</Label>
                <Textarea
                  id="flowDescription"
                  placeholder="Descrição (opcional)"
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  className="resize-none bg-background/50 min-h-[80px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium gradient-primary shadow-lg hover:shadow-primary/25 transition-all"
                disabled={!flowName.trim()}
              >
                {flowId ? 'Salvar Alterações' : 'Criar Fluxo'}
                <Plus className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground/60">
                Você poderá alterar isso depois nas configurações.
              </p>
            </form>
          </div>
        </div>
      )}
      {/* Allow closing the dialog if we are editing an existing flow */}
      {isNameDialogOpen && flowId && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-[50]"
          onClick={() => setIsNameDialogOpen(false)}
        >
          <X className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
