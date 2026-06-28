import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow
} from "@xyflow/react";
import { ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { positionOptions } from "../data/orgChartData";
import { getGenerationRates, getPositionRate } from "../stores/orgChartStore";
import "@xyflow/react/dist/style.css";

const nodeWidth = 196;
const nodeHeight = 132;
const columnStep = 280;
const rowGap = 40;
const rootGap = 80;
const edgeTrunkDistance = 52;
const edgeTargetPadding = 34;

function createParentIdMap(people, solidRelations) {
  const peopleMap = new Map(people.map((person) => [person.id, person]));
  const parentByChild = new Map();
  const relationParentByChild = new Map();

  solidRelations.forEach((relation) => {
    if (
      peopleMap.has(relation.from) &&
      peopleMap.has(relation.to) &&
      relation.from !== relation.to &&
      !relationParentByChild.has(relation.to)
    ) {
      relationParentByChild.set(relation.to, relation.from);
    }
  });

  people.forEach((child) => {
    if (
      typeof child.parentId === "string" &&
      child.parentId &&
      child.parentId !== child.id &&
      peopleMap.has(child.parentId)
    ) {
      parentByChild.set(child.id, child.parentId);
      return;
    }

    const migratedParentId = relationParentByChild.get(child.id);
    if (migratedParentId) parentByChild.set(child.id, migratedParentId);
  });

  return parentByChild;
}

function generateEdgesFromParentId(people, solidRelations) {
  const parentByChild = createParentIdMap(people, solidRelations);

  return people.flatMap((child) => {
    const parentId = parentByChild.get(child.id);
    if (!parentId) return [];

    return [{
      from: parentId,
      to: child.id
    }];
  });
}

function validateOrgChart(people, solidRelations) {
  return generateEdgesFromParentId(people, solidRelations);
}

function buildTree(people, solidRelations) {
  const validRelations = validateOrgChart(people, solidRelations);
  const peopleMap = new Map(people.map((person, index) => [person.id, { ...person, fallbackOrder: index }]));
  const childrenByParent = new Map(people.map((person) => [person.id, []]));
  const parentByChild = new Map();

  validRelations.forEach((relation) => {
    parentByChild.set(relation.to, relation.from);
    childrenByParent.get(relation.from)?.push(relation.to);
  });

  childrenByParent.forEach((childIds) => {
    childIds.sort((firstId, secondId) => {
      const first = peopleMap.get(firstId);
      const second = peopleMap.get(secondId);
      return (first?.sortOrder ?? first?.fallbackOrder ?? 0) - (second?.sortOrder ?? second?.fallbackOrder ?? 0);
    });
  });

  return {
    childrenByParent,
    parentByChild,
    roots: people.filter((person) => !parentByChild.has(person.id)).map((person) => person.id)
  };
}

function validateEdges(people, solidRelations) {
  return validateOrgChart(people, solidRelations);
}

function collectAllDescendantIds(rootIds, childrenByParent) {
  const visibleIds = new Set(rootIds);
  const stack = [...rootIds];

  while (stack.length) {
    const currentId = stack.pop();
    (childrenByParent.get(currentId) || []).forEach((childId) => {
      if (visibleIds.has(childId)) return;
      visibleIds.add(childId);
      stack.push(childId);
    });
  }

  return visibleIds;
}

function collectVisibleExpandableIds(rootIds, expandedNodeIds, childrenByParent, parentByChild, expandAll) {
  if (expandAll) return collectAllDescendantIds(rootIds, childrenByParent);

  const visibleIds = new Set(rootIds);

  expandedNodeIds.forEach((expandedId) => {
    let currentId = expandedId;
    while (currentId) {
      visibleIds.add(currentId);
      currentId = parentByChild.get(currentId);
    }
  });

  expandedNodeIds.forEach((expandedId) => {
    if (!visibleIds.has(expandedId)) return;
    (childrenByParent.get(expandedId) || []).forEach((childId) => visibleIds.add(childId));
  });

  if (!visibleIds.size && rootIds[0]) visibleIds.add(rootIds[0]);

  return visibleIds;
}

function createExpandableLayout(rootIds, expandedNodeIds, childrenByParent, parentByChild, expandAll, selectedId) {
  const positions = new Map();
  const visibleIds = collectVisibleExpandableIds(rootIds, expandedNodeIds, childrenByParent, parentByChild, expandAll);
  if (selectedId) {
    visibleIds.add(selectedId);
    let currentId = parentByChild.get(selectedId);
    while (currentId) {
      visibleIds.add(currentId);
      currentId = parentByChild.get(currentId);
    }
  }
  const subtreeHeightCache = new Map();
  const laidOutIds = new Set();

  function getVisibleChildren(personId) {
    return (childrenByParent.get(personId) || []).filter((childId) => visibleIds.has(childId));
  }

  function calculateSubtreeHeight(personId) {
    if (subtreeHeightCache.has(personId)) return subtreeHeightCache.get(personId);

    const children = getVisibleChildren(personId);
    const height = children.length
      ? Math.max(
          nodeHeight,
          children.reduce((sum, childId) => sum + calculateSubtreeHeight(childId), 0) + rowGap * (children.length - 1)
        )
      : nodeHeight;

    subtreeHeightCache.set(personId, height);
    return height;
  }

  function layoutTree(personId, depth, topY) {
    if (!visibleIds.has(personId) || laidOutIds.has(personId)) return;

    laidOutIds.add(personId);
    const children = getVisibleChildren(personId);

    positions.set(personId, {
      x: depth * columnStep,
      y: topY
    });

    let childTopY = topY;
    children.forEach((childId) => {
      layoutTree(childId, depth + 1, childTopY);
      childTopY += calculateSubtreeHeight(childId) + rowGap;
    });
  }

  let nextRootY = 0;
  rootIds.filter((rootId) => visibleIds.has(rootId)).forEach((rootId) => {
    layoutTree(rootId, 0, nextRootY);
    nextRootY += calculateSubtreeHeight(rootId) + rootGap;
  });

  visibleIds.forEach((personId) => {
    if (laidOutIds.has(personId)) return;

    let depth = 0;
    let currentId = personId;
    while (parentByChild.get(currentId)) {
      depth += 1;
      currentId = parentByChild.get(currentId);
    }

    positions.set(personId, {
      x: depth * columnStep,
      y: nextRootY
    });
    nextRootY += nodeHeight + rootGap;
  });

  return { positions, visibleIds };
}

function PersonTreeNode({ data }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const nameInputRef = useRef(null);
  const opacityClass = data.opacityLevel === "unrelated"
    ? "opacity-[0.15]"
    : data.opacityLevel === "path"
      ? "opacity-35"
      : "opacity-100";
  const [draft, setDraft] = useState({
    name: data.name,
    gender: data.gender,
    title: data.title,
    supervisorId: data.supervisorId || ""
  });

  useEffect(() => {
    setDraft({
      name: data.name,
      gender: data.gender,
      title: data.title,
      supervisorId: data.supervisorId || ""
    });
  }, [data.name, data.gender, data.title, data.supervisorId]);

  useEffect(() => {
    if (data.autoEditPersonId === data.id) {
      setIsEditing(true);
      data.onEditingChange?.(data.id, true);
    }
  }, [data.autoEditPersonId, data.id]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [isEditing]);

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  function saveDraft(event) {
    event.preventDefault();
    event.stopPropagation();
    data.onSavePerson?.(data.id, {
      name: draft.name.trim() || data.name,
      gender: draft.gender,
      title: draft.title,
      supervisorId: draft.supervisorId
    });
    setIsEditing(false);
    data.onEditingChange?.(data.id, false);
    data.onFinishInlineEdit?.();
  }

  function cancelEdit(event) {
    event.preventDefault();
    event.stopPropagation();
    setDraft({
      name: data.name,
      gender: data.gender,
      title: data.title,
      supervisorId: data.supervisorId || ""
    });
    setIsEditing(false);
    data.onEditingChange?.(data.id, false);
    data.onFinishInlineEdit?.();
  }

  function enterEditMode(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsEditing(true);
    data.onEditingChange?.(data.id, true);
  }

  function runCardAction(event, callback) {
    event.preventDefault();
    event.stopPropagation();
    callback?.(data.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        data.onSelect?.(data.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (data.isEditable) enterEditMode(event);
      }}
      className={`group relative h-[132px] w-[196px] rounded-2xl border bg-white px-4 py-3 text-left shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        data.isSelected || data.isSwapSource || isEditing ? "border-apple-blue ring-0" : "border-white/90"
      } ${opacityClass}`}
      style={
        data.isSelected || data.isSwapSource || isEditing
          ? {
              borderWidth: 2,
              zIndex: isEditing ? 9999 : undefined,
              boxShadow: isEditing
                ? "0 0 0 5px rgba(0, 113, 227, 0.2), 0 28px 80px rgba(0, 0, 0, 0.2)"
                : "0 0 0 4px rgba(0, 113, 227, 0.16), 0 18px 40px rgba(0, 113, 227, 0.18)"
            }
          : undefined
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-white !bg-apple-blue"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-white !bg-apple-text"
      />
      {data.isEditable ? (
        <div
          className="absolute bottom-2.5 left-2.5 z-20 flex gap-1.5 opacity-0 transition duration-200 group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            title="新增下線"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/80 bg-white/95 text-apple-blue shadow-[0_4px_12px_rgba(0,0,0,.12)] transition duration-200 hover:scale-[1.08] hover:bg-blue-50"
            onClick={(event) => runCardAction(event, data.onAddChild)}
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            title="編輯"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/80 bg-white/95 text-apple-text shadow-[0_4px_12px_rgba(0,0,0,.12)] transition duration-200 hover:scale-[1.08] hover:bg-blue-50 hover:text-apple-blue"
            onClick={enterEditMode}
          >
            <Pencil size={15} strokeWidth={2.3} />
          </button>
          <button
            type="button"
            title="交換位置"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/80 bg-white/95 text-apple-text shadow-[0_4px_12px_rgba(0,0,0,.12)] transition duration-200 hover:scale-[1.08] hover:bg-blue-50 hover:text-apple-blue"
            onClick={(event) => runCardAction(event, data.onStartSwap)}
          >
            <ArrowLeftRight size={15} strokeWidth={2.3} />
          </button>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-apple-text">{data.name}</h3>
          <p className="mt-1 text-xs text-apple-muted">{data.gender}</p>
          <p className="mt-1 truncate text-sm font-medium text-apple-muted">{data.title}</p>
        </div>
        <p className="shrink-0 text-2xl font-semibold tracking-tight text-apple-blue">
          {getPositionRate(data.title)}%
        </p>
      </div>
      {data.rewardBadge ? (
        <span
          className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            data.rewardBadge.variant === "generation" ? "bg-blue-50 text-apple-blue" : "bg-apple-bg text-apple-muted"
          }`}
        >
          {data.rewardBadge.label}
        </span>
      ) : null}
      {data.isSwapSource ? (
        <span className="absolute bottom-3 right-3 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-apple-blue">
          請選擇要交換的位置
        </span>
      ) : null}
      {isEditing ? (
        <form
          className="absolute left-0 top-0 z-[9999] w-[264px] rounded-2xl border border-white/90 bg-white p-4 text-left shadow-[0_28px_80px_rgba(0,0,0,.22)]"
          onSubmit={saveDraft}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <label className="block text-xs font-semibold text-apple-muted">
            姓名
            <input
              ref={nameInputRef}
              className="mt-1 w-full rounded-xl border border-apple-line px-3 py-2 text-sm text-apple-text outline-none focus:border-apple-blue"
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              autoFocus
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-apple-muted">
              性別
              <select
                className="mt-1 w-full rounded-xl border border-apple-line px-3 py-2 text-sm text-apple-text outline-none focus:border-apple-blue"
                value={draft.gender}
                onChange={(event) => updateDraft("gender", event.target.value)}
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-apple-muted">
              職位％
              <div className="mt-1 rounded-xl bg-apple-bg px-3 py-2 text-sm font-semibold text-apple-text">
                {getPositionRate(draft.title)}%
              </div>
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-apple-muted">
            職位
            <select
              className="mt-1 w-full rounded-xl border border-apple-line px-3 py-2 text-sm text-apple-text outline-none focus:border-apple-blue"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
            >
              {positionOptions.map((option) => (
                <option key={option.title} value={option.title}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold text-apple-muted">
            上線主管
            <select
              className="mt-1 w-full rounded-xl border border-apple-line px-3 py-2 text-sm text-apple-text outline-none focus:border-apple-blue"
              value={draft.supervisorId}
              onChange={(event) => updateDraft("supervisorId", event.target.value)}
            >
              <option value="">無上線主管</option>
              {data.people
                .filter((person) => person.id !== data.id)
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="submit" className="rounded-full bg-apple-blue px-3 py-2 text-xs font-semibold text-white">
              儲存
            </button>
            <button
              type="button"
              className="rounded-full bg-apple-bg px-3 py-2 text-xs font-semibold text-apple-text"
              onClick={cancelEdit}
            >
              取消
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsConfirmingDelete(true);
              }}
            >
              <Trash2 size={12} />
              刪除
            </button>
          </div>
        </form>
      ) : null}
      {isConfirmingDelete ? (
        <div
          className="absolute left-0 top-0 z-[10000] w-[280px] rounded-2xl border border-white/90 bg-white p-4 text-left shadow-[0_28px_80px_rgba(0,0,0,.24)]"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-sm font-semibold text-apple-text">確定要刪除此人嗎？他的下線會如何處理？</p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="w-full rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                data.onDeletePerson?.(data.id, "cascade");
                setIsConfirmingDelete(false);
                setIsEditing(false);
                data.onEditingChange?.(data.id, false);
              }}
            >
              一起刪除整個下線組織
            </button>
            <button
              type="button"
              className="w-full rounded-full bg-apple-bg px-3 py-2 text-xs font-semibold text-apple-text transition hover:bg-white"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                data.onDeletePerson?.(data.id, "reassign");
                setIsConfirmingDelete(false);
                setIsEditing(false);
                data.onEditingChange?.(data.id, false);
              }}
            >
              只刪除此人，將下線移交給此人的上線
            </button>
            <button
              type="button"
              className="w-full rounded-full px-3 py-2 text-xs font-semibold text-apple-muted transition hover:bg-apple-bg"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsConfirmingDelete(false);
              }}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = {
  person: PersonTreeNode
};

function OrthogonalConnectorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data
}) {
  const siblingCount = data?.siblingCount || 1;

  if (siblingCount <= 1) {
    return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} H ${targetX}`} markerEnd={markerEnd} style={style} />;
  }

  const trunkX = Math.min(sourceX + edgeTrunkDistance, targetX - edgeTargetPadding);
  const mainStartY = data?.mainStartY ?? targetY;
  const mainEndY = data?.mainEndY ?? targetY;
  const edgePath = data?.drawMain
    ? [
        `M ${sourceX} ${sourceY}`,
        `H ${trunkX}`,
        `M ${trunkX} ${mainStartY}`,
        `V ${mainEndY}`,
        `M ${trunkX} ${targetY}`,
        `H ${targetX}`
      ].join(" ")
    : `M ${trunkX} ${targetY} H ${targetX}`;

  return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />;
}

const edgeTypes = {
  orthogonal: OrthogonalConnectorEdge
};

function getGenerationName(generation) {
  return ["第一代", "第二代", "第三代", "第四代", "第五代"][generation - 1] || `第${generation}代`;
}

function createBreakdownItem(ownerNode, targetNode, amount, reason, type, isIndependent85 = false) {
  return {
    ownerId: ownerNode.id,
    ownerName: ownerNode.name,
    targetId: targetNode.id,
    targetName: targetNode.name,
    amount,
    reason,
    type,
    isIndependent85
  };
}

function getDescendantPaths(selectedId, childrenByParent, peopleMap) {
  const paths = new Map();
  const selectedNode = peopleMap.get(selectedId);
  if (!selectedNode) return paths;

  const queue = (childrenByParent.get(selectedId) || []).map((childId) => ({
    id: childId,
    path: [selectedNode, peopleMap.get(childId)].filter(Boolean)
  }));

  while (queue.length) {
    const current = queue.shift();
    const targetNode = peopleMap.get(current.id);
    if (!targetNode || paths.has(current.id)) continue;

    paths.set(current.id, current.path);
    (childrenByParent.get(current.id) || []).forEach((childId) => {
      const childNode = peopleMap.get(childId);
      if (childNode) {
        queue.push({
          id: childId,
          path: [...current.path, childNode]
        });
      }
    });
  }

  return paths;
}

function isContinuousSameRankPath(path, rate) {
  return path.every((node) => getPositionRate(node.title) === rate);
}

function calculateGenerationBonus(viewerId, targetId, path) {
  if (!path?.length || viewerId === targetId) return null;

  const viewerNode = path[0];
  const targetNode = path[path.length - 1];
  if (viewerNode.id !== viewerId || targetNode.id !== targetId) return null;

  const viewerRate = getPositionRate(viewerNode.title);
  const targetRate = getPositionRate(targetNode.title);
  if (viewerRate !== targetRate) return null;
  if (!isContinuousSameRankPath(path, viewerRate)) return null;

  const generation = path.length - 1;
  if (generation < 1 || generation > 5) return null;

  const generationBonus = getGenerationRates(viewerNode.title)[generation - 1];
  if (!generationBonus) return null;

  const isIndependent85 = viewerRate === 85;
  const label = `${isIndependent85 ? "85代數 " : ""}${getGenerationName(generation)} ${generationBonus}%`;

  return {
    type: "same-rank-generation",
    generation,
    generationBonus,
    isIndependent85,
    label,
    breakdown: [
      createBreakdownItem(
        viewerNode,
        targetNode,
        generationBonus,
        `${viewerRate}% 同職級連續鏈 ${getGenerationName(generation)}`,
        "generation-bonus",
        isIndependent85
      )
    ]
  };
}

function getPathType(viewerId, targetId, path) {
  if (!path?.length || path[0]?.id !== viewerId || path[path.length - 1]?.id !== targetId || viewerId === targetId) {
    return "unrelated";
  }

  const viewerRate = getPositionRate(path[0].title);
  const targetRate = getPositionRate(path[path.length - 1].title);

  if (targetRate === viewerRate && isContinuousSameRankPath(path, viewerRate)) {
    const generation = path.length - 1;
    return generation >= 1 && generation <= 5 ? "generationOnly" : "unrelated";
  }

  const firstBreakIndex = path.findIndex((node, index) => index > 0 && getPositionRate(node.title) !== viewerRate);
  if (firstBreakIndex === 1 && targetRate < viewerRate) return "differentialChain";

  return "unrelated";
}

function getRankChainFromViewer(viewerId, targetId, path) {
  if (!path?.length || path[0]?.id !== viewerId || path[path.length - 1]?.id !== targetId || viewerId === targetId) {
    return {
      entryNode: null,
      chainRank: null,
      generationIndex: null,
      isRankChainNode: false,
      isEntryNode: false,
      shouldShowBadge: false,
      isCutByBreakpoint: false,
      entryIndex: -1
    };
  }

  const viewerRate = getPositionRate(path[0].title);
  const targetNode = path[path.length - 1];
  const targetRate = getPositionRate(targetNode.title);
  const sameViewerRankIndex = path.findIndex((node, index) => index > 0 && getPositionRate(node.title) === viewerRate);
  const firstLowerIndex = path.findIndex((node, index) => index > 0 && getPositionRate(node.title) < viewerRate);

  if (targetRate === viewerRate && isContinuousSameRankPath(path, viewerRate)) {
    const generationIndex = path.length - 1;
    return {
      entryNode: path[0],
      chainRank: viewerRate,
      generationIndex,
      isRankChainNode: generationIndex >= 1 && generationIndex <= 5,
      isEntryNode: false,
      shouldShowBadge: generationIndex >= 1 && generationIndex <= 5,
      isCutByBreakpoint: false,
      entryIndex: 0
    };
  }

  if (sameViewerRankIndex > 0 && (firstLowerIndex < 0 || sameViewerRankIndex < firstLowerIndex)) {
    return {
      entryNode: path[sameViewerRankIndex],
      chainRank: viewerRate,
      generationIndex: null,
      isRankChainNode: false,
      isEntryNode: false,
      shouldShowBadge: false,
      isCutByBreakpoint: true,
      entryIndex: sameViewerRankIndex
    };
  }

  if (firstLowerIndex !== 1) {
    return {
      entryNode: null,
      chainRank: null,
      generationIndex: null,
      isRankChainNode: false,
      isEntryNode: false,
      shouldShowBadge: false,
      isCutByBreakpoint: false,
      entryIndex: -1
    };
  }

  const entryNode = path[firstLowerIndex];
  const chainRank = getPositionRate(entryNode.title);
  if (targetNode.id === entryNode.id) {
    return {
      entryNode,
      chainRank,
      generationIndex: null,
      isRankChainNode: false,
      isEntryNode: true,
      shouldShowBadge: true,
      isCutByBreakpoint: false,
      entryIndex: firstLowerIndex
    };
  }

  const afterEntry = path.slice(firstLowerIndex + 1);
  const targetChainIndex = afterEntry.findIndex((node) => node.id === targetId);
  const isContinuousChain = targetChainIndex >= 0 && afterEntry
    .slice(0, targetChainIndex + 1)
    .every((node) => getPositionRate(node.title) === chainRank);
  const generationIndex = targetChainIndex + 1;

  return {
    entryNode,
    chainRank,
    generationIndex,
    isRankChainNode: isContinuousChain && generationIndex >= 1 && generationIndex <= 5,
    isEntryNode: false,
    shouldShowBadge: isContinuousChain && generationIndex >= 1 && generationIndex <= 5,
    isCutByBreakpoint: false,
    entryIndex: firstLowerIndex
  };
}

function getAdjacentSameRankDeduction(parentNode, childNode) {
  const parentRate = getPositionRate(parentNode.title);
  const childRate = getPositionRate(childNode.title);
  if (parentRate !== childRate || parentRate === 85) return null;

  const generationBonus = getGenerationRates(parentNode.title)[0];
  if (!generationBonus) return null;

  return createBreakdownItem(
    parentNode,
    childNode,
    generationBonus,
    `${parentRate}% 平階第一代已領走`,
    "generation-bonus",
    false
  );
}

function getAdjacentDifferentialDeduction(parentNode, childNode) {
  const parentRate = getPositionRate(parentNode.title);
  const childRate = getPositionRate(childNode.title);
  const amount = parentRate - childRate;
  if (amount <= 0) return null;

  return createBreakdownItem(
    parentNode,
    childNode,
    amount,
    `${parentRate}% → ${childRate}% 直階差額已領走`,
    "rank-difference",
    false
  );
}

function getResidualGenerationRates(title) {
  return getGenerationRates(title);
}

function getIntermediatePayoutsOnPath(viewerId, targetId, path) {
  if (!path?.length || path[0]?.id !== viewerId || path[path.length - 1]?.id !== targetId) return [];

  const payouts = [];

  for (let index = 1; index < path.length - 1; index += 1) {
    const parentNode = path[index];
    const childNode = path[index + 1];
    const differentialDeduction = getAdjacentDifferentialDeduction(parentNode, childNode);
    if (differentialDeduction) payouts.push(differentialDeduction);
  }

  let segmentStartIndex = 1;
  while (segmentStartIndex < path.length - 1) {
    const ownerNode = path[segmentStartIndex];
    const segmentRank = getPositionRate(ownerNode.title);
    let segmentEndIndex = segmentStartIndex + 1;

    while (segmentEndIndex < path.length && getPositionRate(path[segmentEndIndex].title) === segmentRank) {
      segmentEndIndex += 1;
    }

    const segmentLength = segmentEndIndex - segmentStartIndex;
    if (segmentLength > 1 && segmentRank !== 85) {
      const generationRates = getResidualGenerationRates(ownerNode.title);
      for (let offset = 1; offset < segmentLength && offset <= 5; offset += 1) {
        const targetNode = path[segmentStartIndex + offset];
        const generationBonus = generationRates[offset - 1];
        if (generationBonus) {
          payouts.push(createBreakdownItem(
            ownerNode,
            targetNode,
            generationBonus,
            `${segmentRank}% 平階${getGenerationName(offset)}已領走`,
            "generation-bonus",
            false
          ));
        }
      }
    }

    segmentStartIndex = Math.max(segmentEndIndex, segmentStartIndex + 1);
  }

  return payouts;
}

function calculateDifferentialPayout(viewerId, targetId, path) {
  if (!path?.length || viewerId === targetId) return null;

  const viewerNode = path[0];
  const targetNode = path[path.length - 1];
  if (viewerNode.id !== viewerId || targetNode.id !== targetId) return null;

  const viewerRate = getPositionRate(viewerNode.title);
  const targetRate = getPositionRate(targetNode.title);
  const grossPayout = viewerRate - targetRate;
  if (grossPayout <= 0) return null;

  const deductions = getIntermediatePayoutsOnPath(viewerId, targetId, path);
  const deductedAmount = deductions.reduce((sum, item) => sum + item.amount, 0);
  const differentialPayout = Math.max(0, grossPayout - deductedAmount);
  if (differentialPayout <= 0) return null;

  return {
    type: "rank-difference",
    differencePercent: differentialPayout,
    grossPayout,
    deductedAmount,
    label: `差額 ${differentialPayout}%`,
    breakdown: [
      createBreakdownItem(
        viewerNode,
        targetNode,
        differentialPayout,
        `${viewerRate}% 對 ${targetRate}% 扣除中間已領後剩餘差額`,
        "rank-difference",
        false
      ),
      ...deductions
    ]
  };
}

function calculateResidualPayout(viewerId, targetId, path) {
  return calculateDifferentialPayout(viewerId, targetId, path);
}

function calculateAllBenefits(viewerId, targetId, path) {
  const rankChain = getRankChainFromViewer(viewerId, targetId, path);
  if (rankChain.isCutByBreakpoint) return null;

  const hasRankChainAncestor = rankChain.entryIndex >= 0 && path
    .slice(rankChain.entryIndex + 1, -1)
    .some((node) => getPositionRate(node.title) === rankChain.chainRank);
  const viewerRate = getPositionRate(path[0].title);
  const rankChainDisplaysAsGeneration = rankChain.isRankChainNode && (viewerRate === 85 || rankChain.entryIndex === 0);
  if (viewerRate === 85 && !rankChain.shouldShowBadge && hasRankChainAncestor) return null;

  const pathType = rankChain.isEntryNode
    ? "differentialChain"
    : rankChainDisplaysAsGeneration
      ? "generationOnly"
      : getPathType(viewerId, targetId, path);
  const differentialPayout = rankChain.isEntryNode
    ? calculateResidualPayout(viewerId, targetId, path)
    : rankChain.isRankChainNode && !rankChainDisplaysAsGeneration
      ? calculateResidualPayout(viewerId, targetId, path)
    : !rankChain.shouldShowBadge && !hasRankChainAncestor && pathType === "differentialChain"
      ? calculateResidualPayout(viewerId, targetId, path)
    : null;
  const generationBonus = rankChainDisplaysAsGeneration
    ? (() => {
        const viewerNode = path[0];
        const targetNode = path[path.length - 1];
        const generationBonusValue = getGenerationRates(viewerNode.title)[rankChain.generationIndex - 1];
        if (!generationBonusValue) return null;
        const isIndependent85 = getPositionRate(viewerNode.title) === 85 && rankChain.chainRank === 85;
        const label = `${isIndependent85 ? "85代數 " : ""}${getGenerationName(rankChain.generationIndex)} ${generationBonusValue}%`;

        return {
          type: "same-rank-generation",
          generation: rankChain.generationIndex,
          generationBonus: generationBonusValue,
          baseRank: rankChain.chainRank,
          isIndependent85,
          label,
          breakdown: [
            createBreakdownItem(
              viewerNode,
              targetNode,
              generationBonusValue,
              `${rankChain.chainRank}% 職級鏈 ${getGenerationName(rankChain.generationIndex)}`,
              "generation-bonus",
              isIndependent85
            )
          ]
        };
      })()
    : null;
  const displayBenefit = generationBonus || differentialPayout;

  if (!displayBenefit) return null;

  return {
    ...displayBenefit,
    pathType,
    rankChain,
    differentialPayout,
    generationBonus,
    breakdown: [
      ...(differentialPayout?.breakdown || []),
      ...(generationBonus?.breakdown || [])
    ],
    totalDisplayOnly: (differentialPayout?.differencePercent || 0) + (generationBonus?.generationBonus || 0)
  };
}

function shouldShowBadgeForViewer(viewerId, targetId, path, relationInfo) {
  if (!relationInfo || !path?.length || viewerId === targetId) return false;

  if (relationInfo.pathType === "generationOnly") return relationInfo.generationBonus?.generationBonus > 0;
  if (relationInfo.pathType === "differentialChain") return relationInfo.differentialPayout?.differencePercent > 0;
  return false;
}

function getNearestDisplayedAncestor(viewerId, targetId, path, displayedRelationInfoMap) {
  if (!path?.length || path[0]?.id !== viewerId || path[path.length - 1]?.id !== targetId) return null;

  for (let index = path.length - 2; index > 0; index -= 1) {
    const ancestor = path[index];
    const ancestorRelationInfo = displayedRelationInfoMap.get(ancestor.id);
    if (ancestorRelationInfo) {
      return {
        node: ancestor,
        relationInfo: ancestorRelationInfo
      };
    }
  }

  return null;
}

function generateDisplayBadges(viewerId, descendantPaths) {
  const relationInfoMap = new Map();
  const candidates = [...descendantPaths.entries()]
    .map(([targetId, path]) => ({
      targetId,
      path,
      relationInfo: calculateAllBenefits(viewerId, targetId, path)
    }))
    .sort((first, second) => first.path.length - second.path.length);

  candidates.forEach(({ targetId, path, relationInfo }) => {
    if (!shouldShowBadgeForViewer(viewerId, targetId, path, relationInfo)) return;

    const nearestDisplayedAncestor = getNearestDisplayedAncestor(viewerId, targetId, path, relationInfoMap);
    if (
      nearestDisplayedAncestor?.relationInfo?.pathType === "generationOnly" &&
      relationInfo.pathType !== "generationOnly"
    ) {
      return;
    }

    relationInfoMap.set(targetId, relationInfo);
  });

  return relationInfoMap;
}

function createRelationInfoMap(selectedId, descendantPaths, peopleMap) {
  if (!peopleMap.get(selectedId)) return new Map();
  return generateDisplayBadges(selectedId, descendantPaths);
}

function collectRelatedIds(selectedId, parentByChild, relationInfoMap) {
  const relatedIds = new Set();
  if (!selectedId) return relatedIds;

  relatedIds.add(selectedId);
  relationInfoMap.forEach((_, id) => relatedIds.add(id));

  return relatedIds;
}

function collectPathIds(selectedId, descendantPaths) {
  const pathIds = new Set();
  if (!selectedId) return pathIds;

  descendantPaths.forEach((path) => {
    path.forEach((node) => {
      if (node.id !== selectedId) pathIds.add(node.id);
    });
  });

  return pathIds;
}

function getRewardBadge(person, relationInfoMap) {
  const relationInfo = relationInfoMap.get(person.id);
  if (!relationInfo) return null;

  if (relationInfo.type === "rank-difference") {
    return {
      label: relationInfo.label,
      variant: "diff"
    };
  }

  if (relationInfo.type === "same-rank-generation") {
    return {
      label: relationInfo.label,
      variant: "generation"
    };
  }

  return null;
}

function createNodes(
  people,
  positions,
  visibleIds,
  selectedId,
  editingNodeId,
  onSelect,
  relationInfoMap,
  relatedIds,
  pathIds,
  parentByChild,
  editActions
) {
  return people.filter((person) => visibleIds.has(person.id)).map((person) => ({
    id: person.id,
    type: "person",
    position: positions.get(person.id) || { x: 0, y: 0 },
    data: {
      ...person,
      isSelected: selectedId === person.id,
      isSwapSource: editActions?.swapSourceId === person.id,
      opacityLevel: editingNodeId
        ? editingNodeId === person.id ? "normal" : "path"
        : selectedId
          ? selectedId === person.id || relatedIds.has(person.id)
            ? "normal"
            : pathIds.has(person.id)
              ? "path"
              : "unrelated"
          : "normal",
      rewardBadge: getRewardBadge(person, relationInfoMap),
      supervisorId: parentByChild.get(person.id) || "",
      isEditable: Boolean(editActions),
      people,
      onSelect,
      ...editActions
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      zIndex: editingNodeId === person.id ? 9999 : selectedId === person.id ? 20 : 2
    },
    zIndex: editingNodeId === person.id ? 9999 : selectedId === person.id ? 20 : 2
  }));
}

function createSolidEdges(solidRelations, selectedId, relatedIds, positions, visibleIds) {
  const visibleRelations = solidRelations.filter((relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to));
  const siblingGroups = new Map();
  visibleRelations.forEach((relation) => {
    if (!siblingGroups.has(relation.from)) siblingGroups.set(relation.from, []);
    siblingGroups.get(relation.from).push(relation.to);
  });

  return visibleRelations.map((relation, index) => ({
    id: `org-${relation.from}-${relation.to}-${index}`,
    source: relation.from,
    target: relation.to,
    type: "orthogonal",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: selectedId && !(relatedIds.has(relation.from) && relatedIds.has(relation.to)) ? "#d2d2d7" : "#8e8e93"
    },
    style: {
      stroke: "#8e8e93",
      strokeWidth: 1.6,
      opacity: selectedId && !(relatedIds.has(relation.from) && relatedIds.has(relation.to)) ? 0.35 : 1
    },
    data: {
      siblingIndex: Math.max(0, (siblingGroups.get(relation.from) || []).indexOf(relation.to)),
      siblingCount: siblingGroups.get(relation.from)?.length || 1,
      drawMain: Math.max(0, (siblingGroups.get(relation.from) || []).indexOf(relation.to)) === 0,
      mainStartY: Math.min(
        ...(siblingGroups.get(relation.from) || [relation.to]).map((childId) => (positions.get(childId)?.y || 0) + nodeHeight / 2)
      ),
      mainEndY: Math.max(
        ...(siblingGroups.get(relation.from) || [relation.to]).map((childId) => (positions.get(childId)?.y || 0) + nodeHeight / 2)
      )
    }
  }));
}

function filterVisibleEdges(edges, visibleIds) {
  return edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
}

export function OrgChart({
  people,
  solidRelations,
  selectedId: controlledSelectedId,
  onSelectPerson,
  editActions,
  rootIds,
  expandAll = false,
  onViewportChange,
  layoutVersion = 0,
  forceExpandNodeId = null
}) {
  const reactFlowInstanceRef = useRef(null);
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set());
  const [editingNodeId, setEditingNodeId] = useState(null);
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  const setSelectedId = onSelectPerson || setInternalSelectedId;

  useEffect(() => {
    if (!forceExpandNodeId) return;
    setExpandedNodeIds((currentExpandedNodeIds) => {
      if (currentExpandedNodeIds.has(forceExpandNodeId)) return currentExpandedNodeIds;
      const nextExpandedNodeIds = new Set(currentExpandedNodeIds);
      nextExpandedNodeIds.add(forceExpandNodeId);
      return nextExpandedNodeIds;
    });
  }, [forceExpandNodeId]);

  function selectWithLockedViewport(nextSelectedId) {
    const currentViewport = reactFlowInstanceRef.current?.getViewport();

    if (!nextSelectedId) {
      editActions?.onCancelSwap?.();
    }

    if (
      editActions?.swapSourceId &&
      nextSelectedId &&
      nextSelectedId !== editActions.swapSourceId
    ) {
      editActions.onCompleteSwap?.(nextSelectedId);
      if (!currentViewport) return;
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.setViewport(currentViewport, { duration: 0 });
      });
      return;
    }

    setSelectedId(nextSelectedId);
    setExpandedNodeIds((currentExpandedNodeIds) => {
      if (!nextSelectedId) return currentExpandedNodeIds;

      const nextExpandedNodeIds = new Set(currentExpandedNodeIds);
      if (nextExpandedNodeIds.has(nextSelectedId)) {
        nextExpandedNodeIds.delete(nextSelectedId);
      } else {
        nextExpandedNodeIds.add(nextSelectedId);
      }

      return nextExpandedNodeIds;
    });

    if (!currentViewport) return;

    requestAnimationFrame(() => {
      reactFlowInstanceRef.current?.setViewport(currentViewport, { duration: 0 });
    });
  }

  const peopleMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const validatedRelations = useMemo(() => validateEdges(people, solidRelations), [people, solidRelations]);
  const { childrenByParent, parentByChild, roots } = useMemo(() => buildTree(people, validatedRelations), [people, validatedRelations]);
  const resolvedRootIds = useMemo(
    () => (rootIds?.length ? rootIds : roots.length ? roots : people.slice(0, 1).map((person) => person.id)),
    [rootIds, roots, people]
  );
  const { positions, visibleIds } = useMemo(
    () => createExpandableLayout(resolvedRootIds, expandedNodeIds, childrenByParent, parentByChild, expandAll, selectedId),
    [resolvedRootIds, expandedNodeIds, childrenByParent, parentByChild, expandAll, selectedId, layoutVersion]
  );
  const descendantPaths = useMemo(
    () => getDescendantPaths(selectedId, childrenByParent, peopleMap),
    [selectedId, childrenByParent, peopleMap]
  );
  const relationInfoMap = useMemo(
    () => createRelationInfoMap(selectedId, descendantPaths, peopleMap),
    [selectedId, descendantPaths, peopleMap]
  );
  const pathIds = useMemo(
    () => collectPathIds(selectedId, descendantPaths),
    [selectedId, descendantPaths]
  );
  const relatedIds = useMemo(
    () => collectRelatedIds(selectedId, parentByChild, relationInfoMap),
    [selectedId, parentByChild, relationInfoMap]
  );
  const nodes = useMemo(
    () =>
      createNodes(
        people,
        positions,
        visibleIds,
        selectedId,
        editingNodeId,
        selectWithLockedViewport,
        relationInfoMap,
        relatedIds,
        pathIds,
        parentByChild,
        editActions
          ? {
              ...editActions,
              onEditingChange: (personId, isEditing) => setEditingNodeId(isEditing ? personId : null)
            }
          : null
      ),
    [people, positions, visibleIds, selectedId, editingNodeId, relationInfoMap, relatedIds, pathIds, parentByChild, editActions]
  );
  const edges = useMemo(
    () => filterVisibleEdges(createSolidEdges(validatedRelations, selectedId, relatedIds, positions, visibleIds), visibleIds),
    [validatedRelations, selectedId, relatedIds, visibleIds, positions]
  );

  return (
    <section className="h-[680px] overflow-hidden rounded-[2rem] border border-white/80 bg-white/65 shadow-soft backdrop-blur-2xl sm:h-[760px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 40, y: 40, zoom: 0.9 }}
        fitView={false}
        fitViewOnInit={false}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
          onViewportChange?.(instance.getViewport());
        }}
        onMoveEnd={(_, viewport) => onViewportChange?.(viewport)}
        onNodeClick={(_, node) => selectWithLockedViewport(node.id)}
        onPaneClick={() => selectWithLockedViewport(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d2d2d7" gap={28} size={1} />
        <Controls
          className="!overflow-hidden !rounded-2xl !border !border-white/80 !bg-white/90 !shadow-soft !backdrop-blur-xl"
          showInteractive={false}
        />
      </ReactFlow>
    </section>
  );
}
