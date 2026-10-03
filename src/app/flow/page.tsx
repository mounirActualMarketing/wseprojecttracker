"use client";

import { useCallback, useMemo, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Avatar, ChecklistBadge, Empty, isOverdue, Loading, StatusPill } from "@/components/bits";
import { useFilteredTasks, useUI } from "@/components/ui-context";
import { fmtShort, todayISO } from "@/lib/dates";
import { actions } from "@/lib/store";
import { SYSTEMS, systemOf, type SystemId, type Task } from "@/lib/types";

type Mode = "deps" | "systems";

type TaskNodeData = { task: Task; overdue: boolean };
type SystemNodeData = { system: SystemId; total: number; done: number; active: number; center?: boolean };

function TaskNode({ data }: NodeProps<Node<TaskNodeData>>) {
  const { task, overdue } = data;
  const sys = systemOf(task.system);
  return (
    <div
      className={`w-[240px] rounded-lg border bg-white px-3 py-2.5 text-left shadow-[0_1px_3px_rgba(16,24,40,0.08)] ${overdue ? "border-[#F5B5B7]" : "border-line"}`}
      style={{ borderLeft: `4px solid ${sys.color}` }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-faint" />
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide" style={{ color: sys.color }}>
          {sys.short}
        </span>
        <StatusPill id={task.status} size="xs" />
      </div>
      <div className={`text-[13px] font-medium leading-snug ${task.status === "done" ? "text-faint line-through" : "text-ink"}`}>{task.title}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Avatar name={task.owner} size={18} />
          <span className={`text-[11px] ${overdue ? "font-medium text-[#D93F45]" : "text-muted"}`}>{fmtShort(task.due)}</span>
        </span>
        <ChecklistBadge task={task} />
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand" />
    </div>
  );
}

const SIDES = [
  { id: "top", pos: Position.Top },
  { id: "bottom", pos: Position.Bottom },
  { id: "left", pos: Position.Left },
  { id: "right", pos: Position.Right },
];
const OPPOSITE: Record<string, string> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function SystemNode({ data }: NodeProps<Node<SystemNodeData>>) {
  const s = systemOf(data.system);
  const pct = data.total ? Math.round((data.done / data.total) * 100) : 0;
  return (
    <div
      className={`rounded-xl border bg-white px-4 py-3 text-left shadow-[0_2px_6px_rgba(16,24,40,0.08)] ${data.center ? "w-[260px] border-brand" : "w-[210px] border-line"}`}
      style={data.center ? { boxShadow: "0 0 0 4px rgba(123,104,238,0.15)" } : { borderTop: `4px solid ${s.color}` }}
    >
      {SIDES.map((sd) => (
        <Handle key={`t-${sd.id}`} id={`t-${sd.id}`} type="target" position={sd.pos} className="!opacity-0" isConnectable={false} />
      ))}
      {SIDES.map((sd) => (
        <Handle key={`s-${sd.id}`} id={`s-${sd.id}`} type="source" position={sd.pos} className="!opacity-0" isConnectable={false} />
      ))}
      <div className={`font-semibold ${data.center ? "text-brand-dark" : "text-ink"}`}>{s.name}</div>
      <div className="mt-1 text-xs text-muted">
        {data.total} tasks · {data.active} active · {data.done} done
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
      </div>
    </div>
  );
}

const nodeTypes = { task: TaskNode, system: SystemNode };
const MAX_ROWS = 6;

function layoutDeps(tasks: Task[], today: string): { nodes: Node[]; edges: Edge[] } {
  const ids = new Set(tasks.map((t) => t.id));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const level = new Map<string, number>();
  const depth = (id: string, stack = new Set<string>()): number => {
    if (level.has(id)) return level.get(id)!;
    if (stack.has(id)) return 0;
    stack.add(id);
    const deps = (byId.get(id)?.dependsOn ?? []).filter((d) => ids.has(d));
    const v = deps.length ? 1 + Math.max(...deps.map((d) => depth(d, stack))) : 0;
    level.set(id, v);
    return v;
  };
  tasks.forEach((t) => depth(t.id));

  const levels = new Map<number, Task[]>();
  tasks.forEach((t) => {
    const l = level.get(t.id) ?? 0;
    levels.set(l, [...(levels.get(l) ?? []), t]);
  });
  const sysIdx = (t: Task) => SYSTEMS.findIndex((s) => s.id === t.system);

  // tall levels wrap into several columns so the graph stays readable
  const nodes: Node[] = [];
  let col = 0;
  [...levels.keys()]
    .sort((a, b) => a - b)
    .forEach((l) => {
      const list = levels.get(l)!.sort((a, b) => sysIdx(a) - sysIdx(b) || a.start.localeCompare(b.start));
      list.forEach((t, i) => {
        nodes.push({
          id: t.id,
          type: "task",
          position: { x: (col + Math.floor(i / MAX_ROWS)) * 300, y: (i % MAX_ROWS) * 128 },
          data: { task: t, overdue: isOverdue(t, today) },
          deletable: false,
        });
      });
      col += Math.ceil(list.length / MAX_ROWS);
    });

  const edges: Edge[] = [];
  tasks.forEach((t) =>
    t.dependsOn
      .filter((d) => ids.has(d))
      .forEach((d) => {
        const from = byId.get(d)!;
        const color = from.status === "done" ? "#10B981" : "#A0A7B4";
        edges.push({
          id: `${d}->${t.id}`,
          source: d,
          target: t.id,
          animated: from.status !== "done",
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: { stroke: color, strokeWidth: 1.6 },
        });
      }),
  );
  return { nodes, edges };
}

function layoutSystems(tasks: Task[]): { nodes: Node[]; edges: Edge[] } {
  const stats = (id: SystemId) => {
    const list = tasks.filter((t) => t.system === id);
    return {
      total: list.length,
      done: list.filter((t) => t.status === "done").length,
      active: list.filter((t) => t.status === "in_progress" || t.status === "review" || t.status === "waiting").length,
    };
  };
  const ring = SYSTEMS.filter((s) => s.id !== "orchestration");
  const R = 340;
  const angle = (i: number) => (i / ring.length) * Math.PI * 2 - Math.PI / 2;
  const nodes: Node[] = [
    { id: "sys-orchestration", type: "system", position: { x: -130, y: -40 }, data: { system: "orchestration", center: true, ...stats("orchestration") }, deletable: false, connectable: false },
    ...ring.map(
      (s, i) =>
        ({
          id: `sys-${s.id}`,
          type: "system",
          position: { x: Math.cos(angle(i)) * R * 1.35 - 105, y: Math.sin(angle(i)) * R - 40 },
          data: { system: s.id, ...stats(s.id) },
          deletable: false,
          connectable: false,
        }) as Node,
    ),
  ];
  const edges: Edge[] = ring.map((s, i) => {
    // leave the hub from the side facing each system so edges do not loop
    const dx = Math.cos(angle(i)) * 1.35, dy = Math.sin(angle(i));
    const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "bottom" : "top";
    return {
      id: `e-${s.id}`,
      source: "sys-orchestration",
      target: `sys-${s.id}`,
      sourceHandle: `s-${side}`,
      targetHandle: `t-${OPPOSITE[side]}`,
      animated: true,
      style: { stroke: systemOf(s.id).color, strokeWidth: 1.5, opacity: 0.8 },
      deletable: false,
    };
  });
  return { nodes, edges };
}

export default function FlowView() {
  const { tasks, all, hydrated } = useFilteredTasks();
  const [mode, setMode] = useState<Mode>("deps");

  if (!hydrated) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {(["deps", "systems"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-sm ${mode === m ? "bg-brand-soft font-medium text-brand-dark" : "text-muted hover:text-ink"}`}
            >
              {m === "deps" ? "Task dependencies" : "Systems map"}
            </button>
          ))}
        </div>
        <p className="text-xs text-faint">
          {mode === "deps"
            ? "Arrows point from a task to the tasks waiting on it. Drag from the purple handle to another task to link them, select an arrow and press Backspace to remove it."
            : "The orchestration layer drives the other systems. Click a system to see its tasks."}
        </p>
      </div>
      {mode === "deps" && tasks.length === 0 ? (
        <Empty />
      ) : (
        <Canvas key={mode} mode={mode} tasks={mode === "deps" ? tasks : all} onPickSystem={() => setMode("deps")} />
      )}
    </div>
  );
}

function Canvas({ mode, tasks, onPickSystem }: { mode: Mode; tasks: Task[]; onPickSystem: () => void }) {
  const { openEdit, setFilters } = useUI();
  const today = todayISO();
  const computed = useMemo(() => (mode === "deps" ? layoutDeps(tasks, today) : layoutSystems(tasks)), [mode, tasks, today]);

  // keep dragged positions and selection when the task list changes
  const [nodes, setNodes] = useState<Node[]>(computed.nodes);
  const [edges, setEdges] = useState<Edge[]>(computed.edges);
  const [prev, setPrev] = useState(computed);
  if (prev !== computed) {
    setPrev(computed);
    setNodes((old) => {
      const pos = new Map(old.map((n) => [n.id, n.position]));
      return computed.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position }));
    });
    setEdges(computed.edges);
  }

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((e) => applyEdgeChanges(c, e)), []);
  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) actions.addDependency(c.target, c.source);
  }, []);
  const onEdgesDelete = useCallback((deleted: Edge[]) => deleted.forEach((e) => actions.removeDependency(e.target, e.source)), []);

  return (
    <div className="h-[calc(100vh-230px)] min-h-[480px] overflow-hidden rounded-xl border border-line bg-[#FAFBFC]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={mode === "deps" ? onConnect : undefined}
        onEdgesDelete={mode === "deps" ? onEdgesDelete : undefined}
        onNodeClick={(_, n) => {
          if (n.type === "task") openEdit(n.id);
          else {
            setFilters({ system: (n.data as SystemNodeData).system });
            onPickSystem();
          }
        }}
        nodesConnectable={mode === "deps"}
        colorMode="light"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
      >
        <Background variant={BackgroundVariant.Dots} color="#D5D9E0" gap={20} size={1.4} />
        <Controls showInteractive={false} />
        {mode === "deps" ? (
          <MiniMap
            pannable
            zoomable
            style={{ width: 150, height: 100 }}
            maskColor="rgba(240,241,244,0.7)"
            nodeColor={(n) => systemOf((n.data as TaskNodeData).task.system).color}
          />
        ) : null}
      </ReactFlow>
    </div>
  );
}
