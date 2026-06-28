import { useEffect, useMemo, useState } from "react";
import { Clock3, Download, FileJson, Plus, RotateCcw, Trash2, LockKeyhole, Upload } from "lucide-react";
import { OrgChart } from "../components/OrgChart.jsx";
import { useOrgChartStore } from "../hooks/useOrgChartStore.js";
import {
  defaultOrgChartState,
  getPositionRate,
  OWNER_PASSWORD,
  resetOrgChartData,
  validateEdges
} from "../stores/orgChartStore";
import {
  compareOrgChartVersions,
  createOrgChartVersion,
  getVersionHistory,
  renameOrgChartVersion,
  saveVersionHistory
} from "../stores/orgChartVersionStore.js";

function createPersonId(name) {
  const ascii = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  return `${ascii || "person"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createSystemId() {
  return `system-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getSupervisorId(personId, solidRelations) {
  return solidRelations.find((relation) => relation.to === personId)?.from || "";
}

function getParentId(personId, people, solidRelations) {
  const person = people.find((item) => item.id === personId);
  return person?.parentId || getSupervisorId(personId, solidRelations) || null;
}

function getChildren(personId, solidRelations) {
  return solidRelations.filter((relation) => relation.from === personId).map((relation) => relation.to);
}

function getDescendantIds(personId, solidRelations) {
  const childrenByParent = new Map();
  solidRelations.forEach((relation) => {
    childrenByParent.set(relation.from, [...(childrenByParent.get(relation.from) || []), relation.to]);
  });

  const descendantIds = new Set();
  const stack = [...(childrenByParent.get(personId) || [])];
  while (stack.length) {
    const current = stack.pop();
    if (!current || descendantIds.has(current)) continue;
    descendantIds.add(current);
    stack.push(...(childrenByParent.get(current) || []));
  }

  return descendantIds;
}

function getSubtreeIds(personId, solidRelations) {
  return new Set([personId, ...getDescendantIds(personId, solidRelations)]);
}

function hasPath(startId, targetId, solidRelations) {
  const childrenByParent = new Map();
  solidRelations.forEach((relation) => {
    childrenByParent.set(relation.from, [...(childrenByParent.get(relation.from) || []), relation.to]);
  });

  const stack = [...(childrenByParent.get(startId) || [])];
  while (stack.length) {
    const current = stack.pop();
    if (current === targetId) return true;
    stack.push(...(childrenByParent.get(current) || []));
  }
  return false;
}

function isAncestor(ancestorId, nodeId, people, solidRelations) {
  let currentParentId = getParentId(nodeId, people, solidRelations);
  const visitedIds = new Set();

  while (currentParentId) {
    if (currentParentId === ancestorId) return true;
    if (visitedIds.has(currentParentId)) return false;
    visitedIds.add(currentParentId);
    currentParentId = getParentId(currentParentId, people, solidRelations);
  }

  return false;
}

function getSortOrder(personId, parentId, people) {
  const siblings = people.filter((person) => (person.parentId || null) === (parentId || null));
  const person = people.find((item) => item.id === personId);
  const fallbackOrder = Math.max(0, siblings.findIndex((sibling) => sibling.id === personId)) + 1;
  return person?.sortOrder ?? fallbackOrder;
}

function getNextSortOrder(parentId, people) {
  const siblingOrders = people
    .filter((person) => (person.parentId || null) === (parentId || null))
    .map((person, index) => person.sortOrder ?? index + 1);
  return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 1;
}

function syncParentIds(people, solidRelations) {
  const parentByChild = new Map(solidRelations.map((relation) => [relation.to, relation.from]));
  return people.map((person) => ({
    ...person,
    parentId: parentByChild.get(person.id) || null
  }));
}

export function OwnerOrgChartEditorPage() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem("mobile-office-owner-unlocked") === "true"
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [orgChartData, setOrgChartData] = useOrgChartStore();
  const [selectedSystemId, setSelectedSystemId] = useState(orgChartData.systems[0]?.id || null);
  const selectedSystem = orgChartData.systems.find((system) => system.id === selectedSystemId) || null;
  const [selectedId, setSelectedId] = useState(selectedSystem?.rootNodeId || null);
  const [swapSourceId, setSwapSourceId] = useState(null);
  const [autoEditPersonId, setAutoEditPersonId] = useState(null);
  const [forceExpandNodeId, setForceExpandNodeId] = useState(null);
  const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false);
  const [versions, setVersions] = useState(() => getVersionHistory());
  const [previewVersionId, setPreviewVersionId] = useState(null);
  const [compareFromId, setCompareFromId] = useState("");
  const [compareToId, setCompareToId] = useState("");
  const [importText, setImportText] = useState("");
  const [viewport, setViewport] = useState(null);
  const [layoutRepairVersion, setLayoutRepairVersion] = useState(0);
  const [status, setStatus] = useState("");

  const selectedPerson = useMemo(
    () => orgChartData.people.find((person) => person.id === selectedId) || null,
    [orgChartData.people, selectedId]
  );
  const chartData = useMemo(() => {
    if (!selectedSystem) {
      const rootIds = new Set(orgChartData.systems.map((system) => system.rootNodeId));
      return {
        people: orgChartData.people.filter((person) => rootIds.has(person.id)),
        solidRelations: [],
        rootIds: [...rootIds],
        expandAll: false
      };
    }

    const people = orgChartData.people.filter((person) => person.systemId === selectedSystem.id);
    const personIds = new Set(people.map((person) => person.id));
    return {
      people,
      solidRelations: orgChartData.solidRelations.filter(
        (relation) => personIds.has(relation.from) && personIds.has(relation.to)
      ),
      rootIds: [selectedSystem.rootNodeId],
      expandAll: true
    };
  }, [orgChartData, selectedSystem]);

  useEffect(() => {
    if (selectedSystemId && !orgChartData.systems.some((system) => system.id === selectedSystemId)) {
      setSelectedSystemId(orgChartData.systems[0]?.id || null);
      return;
    }

    if (selectedId && !selectedPerson) {
      setSelectedId(selectedSystem?.rootNodeId || null);
    }
  }, [orgChartData.people, orgChartData.systems, selectedId, selectedPerson, selectedSystem, selectedSystemId]);

  useEffect(() => {
    if (!versions.length) {
      createOrgChartVersion(orgChartData, {
        name: "初版",
        action: "initial",
        layout: {
          mode: "react-flow-horizontal-expandable",
          selectedSystemId,
          selectedNodeId: selectedId,
          rootIds: chartData.rootIds,
          expandAll: chartData.expandAll
        },
        viewport
      });
      refreshVersions();
    }
  }, []);

  function refreshVersions() {
    setVersions(getVersionHistory());
  }

  function commitOrgChartData(nextData, actionName) {
    const validatedData = validateEdges(nextData);
    setOrgChartData(validatedData);
    createOrgChartVersion(validatedData, {
      name: actionName,
      action: actionName,
      layout: {
        mode: "react-flow-horizontal-expandable",
        selectedSystemId,
        selectedNodeId: selectedId,
        rootIds: chartData.rootIds,
        expandAll: chartData.expandAll
      },
      viewport
    });
    refreshVersions();
  }

  function createManualSnapshot(name = "手動快照") {
    createOrgChartVersion(orgChartData, {
      name,
      action: "manual-snapshot",
      layout: {
        mode: "react-flow-horizontal-expandable",
        selectedSystemId,
        selectedNodeId: selectedId,
        rootIds: chartData.rootIds,
        expandAll: chartData.expandAll
      },
      viewport
    });
    refreshVersions();
    setStatus("已建立快照");
  }

  function restoreVersion(version) {
    if (!version || !window.confirm("確定回復此版本？")) return;
    const snapshot = version.snapshot;
    const restoredData = validateEdges({
      systems: snapshot.systems || [],
      people: snapshot.people || [],
      solidRelations: snapshot.solidRelations || []
    });
    setOrgChartData(restoredData);
    createOrgChartVersion(restoredData, { name: `回復：${version.name}`, action: "restore" });
    refreshVersions();
    setSelectedSystemId(restoredData.systems[0]?.id || null);
    setSelectedId(restoredData.systems[0]?.rootNodeId || null);
    setStatus("已回復版本");
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      orgChartData,
      versions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "org-chart-version-history.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson() {
    try {
      const payload = JSON.parse(importText);
      const nextData = payload.orgChartData || payload;
      if (!Array.isArray(nextData.people) || !Array.isArray(nextData.solidRelations) || !Array.isArray(nextData.systems)) {
        setStatus("JSON 格式不正確");
        return;
      }

      commitOrgChartData(nextData, "匯入JSON");
      if (Array.isArray(payload.versions)) {
        saveVersionHistory(payload.versions);
        refreshVersions();
      }
      setSelectedSystemId(nextData.systems[0]?.id || null);
      setSelectedId(nextData.systems[0]?.rootNodeId || null);
      setImportText("");
      setStatus("已匯入JSON");
    } catch {
      setStatus("JSON 解析失敗");
    }
  }

  function handleUnlock(event) {
    event.preventDefault();
    if (password === OWNER_PASSWORD) {
      sessionStorage.setItem("mobile-office-owner-unlocked", "true");
      setIsUnlocked(true);
      setError("");
      return;
    }
    setError("管理密碼不正確。");
  }

  function savePerson(personId, nextPerson) {
    const nextPeople = orgChartData.people.map((person) =>
      person.id === personId
        ? {
            ...person,
            name: nextPerson.name.trim() || person.name,
            gender: nextPerson.gender,
            title: nextPerson.title,
            parentId: nextPerson.supervisorId !== undefined ? nextPerson.supervisorId || null : person.parentId || null
          }
        : person
    );

    let nextRelations = orgChartData.solidRelations;
    let nextPeopleWithSystem = nextPeople;
    if (nextPerson.supervisorId !== undefined) {
      if (nextPerson.supervisorId === personId) {
        setStatus("不能把自己設為上線主管");
        return;
      }
      if (nextPerson.supervisorId && hasPath(personId, nextPerson.supervisorId, orgChartData.solidRelations)) {
        setStatus("不能把下線設為上線主管");
        return;
      }

      const withoutCurrent = orgChartData.solidRelations.filter((relation) => relation.to !== personId);
      nextRelations = nextPerson.supervisorId
        ? [...withoutCurrent, { from: nextPerson.supervisorId, to: personId }]
        : withoutCurrent;

      const supervisor = orgChartData.people.find((person) => person.id === nextPerson.supervisorId);
      const nextSystemId = supervisor?.systemId || orgChartData.people.find((person) => person.id === personId)?.systemId;
      if (nextSystemId) {
        const subtreeIds = getSubtreeIds(personId, orgChartData.solidRelations);
        nextPeopleWithSystem = nextPeople.map((person) =>
          subtreeIds.has(person.id) ? { ...person, systemId: nextSystemId } : person
        );
      }
    }

    commitOrgChartData({ ...orgChartData, people: nextPeopleWithSystem, solidRelations: nextRelations }, "編輯卡片");
    setSelectedId(personId);
    setAutoEditPersonId(null);
    setStatus("已儲存");
  }

  function addPerson(parentId) {
    const parent = orgChartData.people.find((person) => person.id === parentId);
    const systemId = parent?.systemId || selectedSystemId || orgChartData.systems[0]?.id;
    const person = {
      id: createPersonId("未命名"),
      name: "未命名",
      gender: "男",
      title: "儲備主管",
      systemId,
      parentId: parentId || null,
      sortOrder: getNextSortOrder(parentId || null, orgChartData.people)
    };

    const nextRelations = parentId
      ? [...orgChartData.solidRelations, { from: parentId, to: person.id }]
      : orgChartData.solidRelations;

    commitOrgChartData({
      ...orgChartData,
      people: [...orgChartData.people, person],
      solidRelations: nextRelations
    }, "新增卡片");
    if (systemId) setSelectedSystemId(systemId);
    setSelectedId(person.id);
    setAutoEditPersonId(person.id);
    if (parentId) setForceExpandNodeId(parentId);
    setSwapSourceId(null);
    setStatus("已新增");
  }

  function startSwap(personId) {
    setSelectedId(personId);
    setSwapSourceId(personId);
    setStatus("請選擇要交換的位置");
  }

  function cancelSwap() {
    setSwapSourceId(null);
  }

  function swapPeople(targetId) {
    if (!swapSourceId || swapSourceId === targetId) {
      cancelSwap();
      return;
    }

    const sourceId = swapSourceId;
    if (
      isAncestor(sourceId, targetId, orgChartData.people, orgChartData.solidRelations) ||
      isAncestor(targetId, sourceId, orgChartData.people, orgChartData.solidRelations)
    ) {
      setStatus("不能與自己的上線或下線交換位置");
      cancelSwap();
      return;
    }

    const sourcePerson = orgChartData.people.find((person) => person.id === sourceId);
    const targetPerson = orgChartData.people.find((person) => person.id === targetId);
    if (!sourcePerson || !targetPerson) {
      cancelSwap();
      return;
    }

    const sourceParentId = getParentId(sourceId, orgChartData.people, orgChartData.solidRelations);
    const targetParentId = getParentId(targetId, orgChartData.people, orgChartData.solidRelations);
    const sourceSortOrder = getSortOrder(sourceId, sourceParentId, orgChartData.people);
    const targetSortOrder = getSortOrder(targetId, targetParentId, orgChartData.people);
    const sourceNextSystemId = targetParentId
      ? orgChartData.people.find((person) => person.id === targetParentId)?.systemId
      : targetPerson?.systemId;
    const targetNextSystemId = sourceParentId
      ? orgChartData.people.find((person) => person.id === sourceParentId)?.systemId
      : sourcePerson?.systemId;
    const sourceSubtreeIds = getSubtreeIds(sourceId, orgChartData.solidRelations);
    const targetSubtreeIds = getSubtreeIds(targetId, orgChartData.solidRelations);
    const nextPeople = orgChartData.people.map((person) => {
      if (person.id === sourceId) {
        return {
          ...person,
          parentId: sourceParentId === targetParentId ? sourceParentId : targetParentId,
          sortOrder: targetSortOrder,
          systemId: sourceNextSystemId || person.systemId
        };
      }
      if (person.id === targetId) {
        return {
          ...person,
          parentId: sourceParentId === targetParentId ? targetParentId : sourceParentId,
          sortOrder: sourceSortOrder,
          systemId: targetNextSystemId || person.systemId
        };
      }
      if (sourceNextSystemId && sourceSubtreeIds.has(person.id)) return { ...person, systemId: sourceNextSystemId };
      if (targetNextSystemId && targetSubtreeIds.has(person.id)) return { ...person, systemId: targetNextSystemId };
      return person;
    });
    const nextRelations = nextPeople.flatMap((person) =>
      person.parentId ? [{ from: person.parentId, to: person.id }] : []
    );
    const now = new Date().toISOString();
    const nextSystems = orgChartData.systems.map((system) => {
      if (system.rootNodeId === sourceId) return { ...system, rootNodeId: targetId, updatedAt: now };
      if (system.rootNodeId === targetId) return { ...system, rootNodeId: sourceId, updatedAt: now };
      return system;
    });

    commitOrgChartData(
      { ...orgChartData, systems: nextSystems, people: nextPeople, solidRelations: nextRelations },
      "交換位置"
    );
    setSelectedId(targetId);
    setAutoEditPersonId(null);
    cancelSwap();
    setStatus("已交換位置");
  }

  function deletePerson(personId, mode) {
    const currentSupervisorId = getSupervisorId(personId, orgChartData.solidRelations);

    if (mode === "cascade") {
      const deleteIds = new Set([personId, ...getDescendantIds(personId, orgChartData.solidRelations)]);
      const nextPeople = orgChartData.people.filter((person) => !deleteIds.has(person.id));
      const nextRelations = orgChartData.solidRelations.filter(
        (relation) => !deleteIds.has(relation.from) && !deleteIds.has(relation.to)
      );

      const nextSystems = orgChartData.systems.filter((system) => !deleteIds.has(system.rootNodeId));
      commitOrgChartData({ systems: nextSystems, people: syncParentIds(nextPeople, nextRelations), solidRelations: nextRelations }, "刪除卡片");
      setSelectedId(currentSupervisorId || nextPeople[0]?.id || null);
      setAutoEditPersonId(null);
      cancelSwap();
      setStatus("已刪除整個下線組織");
      return;
    }

    const childIds = getChildren(personId, orgChartData.solidRelations);
    const nextPeople = orgChartData.people.filter((person) => person.id !== personId);
    const cleanedRelations = orgChartData.solidRelations.filter(
      (relation) => relation.from !== personId && relation.to !== personId
    );
    const reassignedRelations = currentSupervisorId
      ? childIds.map((childId) => ({ from: currentSupervisorId, to: childId }))
      : [];
    const nextRelations = [...cleanedRelations, ...reassignedRelations];
    const now = new Date().toISOString();
    const nextSystems = orgChartData.systems.map((system) =>
      system.rootNodeId === personId && childIds[0]
        ? { ...system, rootNodeId: childIds[0], updatedAt: now }
        : system
    );

    commitOrgChartData(
      { ...orgChartData, systems: nextSystems, people: syncParentIds(nextPeople, nextRelations), solidRelations: nextRelations },
      "刪除卡片"
    );
    setSelectedId(currentSupervisorId || childIds[0] || nextPeople[0]?.id || null);
    setAutoEditPersonId(null);
    cancelSwap();
    setStatus("已刪除");
  }

  function addSystem() {
    const now = new Date().toISOString();
    const systemId = createSystemId();
    const rootNodeId = createPersonId("未命名體系頭");
    const system = {
      id: systemId,
      name: "未命名體系",
      rootNodeId,
      createdAt: now,
      updatedAt: now
    };
    const rootPerson = {
      id: rootNodeId,
      name: "未命名體系頭",
      gender: "男",
      title: "業務協理",
      systemId
    };

    commitOrgChartData({
      ...orgChartData,
      systems: [...orgChartData.systems, system],
      people: [...orgChartData.people, rootPerson]
    }, "新增體系");
    setSelectedSystemId(systemId);
    setSelectedId(rootNodeId);
    setAutoEditPersonId(rootNodeId);
    setStatus("已新增體系頭");
  }

  function renameSystem(systemId, name) {
    const now = new Date().toISOString();
    setOrgChartData({
      ...orgChartData,
      systems: orgChartData.systems.map((system) =>
        system.id === systemId ? { ...system, name: name.trim() || system.name, updatedAt: now } : system
      )
    });
  }

  function snapshotSystemRename() {
    createOrgChartVersion(orgChartData, { name: "修改體系名稱", action: "rename-system" });
    refreshVersions();
  }

  function deleteSystem(systemId) {
    const system = orgChartData.systems.find((item) => item.id === systemId);
    if (!system) return;
    if (!window.confirm("確定要刪除此體系頭嗎？此體系底下的人員也會一起移除。")) return;

    const deleteIds = new Set(orgChartData.people.filter((person) => person.systemId === systemId).map((person) => person.id));
    const nextSystems = orgChartData.systems.filter((item) => item.id !== systemId);
    const nextPeople = orgChartData.people.filter((person) => !deleteIds.has(person.id));
    const nextRelations = orgChartData.solidRelations.filter(
      (relation) => !deleteIds.has(relation.from) && !deleteIds.has(relation.to)
    );

    commitOrgChartData({ systems: nextSystems, people: syncParentIds(nextPeople, nextRelations), solidRelations: nextRelations }, "刪除體系");
    setSelectedSystemId(nextSystems[0]?.id || null);
    setSelectedId(nextSystems[0]?.rootNodeId || null);
    setAutoEditPersonId(null);
    setStatus("已刪除體系頭");
  }

  function handleReset() {
    resetOrgChartData();
    commitOrgChartData(defaultOrgChartState, "還原預設資料");
    setSelectedSystemId(defaultOrgChartState.systems[0]?.id || null);
    setSelectedId(defaultOrgChartState.systems[0]?.rootNodeId || null);
    setAutoEditPersonId(null);
    cancelSwap();
    setStatus("已還原預設資料");
  }

  function repairOrgChartLayout() {
    const validatedData = validateEdges(orgChartData);
    setOrgChartData(validatedData);
    setLayoutRepairVersion((version) => version + 1);
    createOrgChartVersion(validatedData, {
      name: "自動修復排版",
      action: "repair-layout",
      layout: {
        mode: "react-flow-horizontal-expandable",
        selectedSystemId,
        selectedNodeId: selectedId,
        rootIds: chartData.rootIds,
        expandAll: chartData.expandAll,
        repairedAt: new Date().toISOString()
      },
      viewport
    });
    refreshVersions();
    setStatus("已自動修復排版");
  }

  if (!isUnlocked) {
    return (
      <section className="mx-auto max-w-xl py-12">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-soft backdrop-blur-2xl">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-apple-text text-white">
            <LockKeyhole size={24} />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">組織圖編輯頁</h1>
          <form className="mt-6 space-y-4" onSubmit={handleUnlock}>
            <label className="block text-sm font-medium text-apple-text" htmlFor="owner-password">
              管理密碼
            </label>
            <input
              id="owner-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-apple-line bg-white px-4 py-3 outline-none transition focus:border-apple-blue focus:ring-4 focus:ring-blue-100"
              placeholder="請輸入管理密碼"
            />
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <button className="w-full rounded-full bg-apple-blue px-5 py-3 text-sm font-semibold text-white" type="submit">
              進入編輯
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-apple-blue">OWNER</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">組織圖編輯</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsVersionPanelOpen(true)}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-apple-text px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-apple-blue"
          >
            <Clock3 size={16} />
            版本歷史
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-apple-muted shadow-sm transition hover:text-apple-text"
          >
            <RotateCcw size={16} />
            還原預設資料
          </button>
        </div>
      </div>

      {status ? (
        <p className="mb-4 w-fit rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-apple-blue shadow-sm">
          {status}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-soft backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-apple-text">體系頭</h2>
            <button
              type="button"
              onClick={addSystem}
              className="grid h-9 w-9 place-items-center rounded-full bg-apple-blue text-white shadow-[0_8px_20px_rgba(0,113,227,.2)] transition hover:scale-105"
              title="新增體系頭"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {orgChartData.systems.map((system) => (
              <div
                key={system.id}
                className={`rounded-2xl border p-3 transition ${
                  selectedSystemId === system.id
                    ? "border-apple-blue bg-blue-50/70 shadow-[0_10px_24px_rgba(0,113,227,.14)]"
                    : "border-white/80 bg-white/80"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSystemId((currentId) => {
                      const nextSystemId = currentId === system.id ? null : system.id;
                      setSelectedId(nextSystemId ? system.rootNodeId : null);
                      return nextSystemId;
                    });
                    cancelSwap();
                  }}
                  className="w-full text-left text-xs font-semibold uppercase tracking-[0.12em] text-apple-muted"
                >
                  {selectedSystemId === system.id ? "已選取" : "點選展開"}
                </button>
                <input
                  className="mt-2 w-full rounded-xl border border-apple-line bg-white px-3 py-2 text-sm font-semibold text-apple-text outline-none focus:border-apple-blue"
                  value={system.name}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => renameSystem(system.id, event.target.value)}
                  onBlur={snapshotSystemRename}
                />
                <button
                  type="button"
                  onClick={() => deleteSystem(system.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  刪除體系
                </button>
              </div>
            ))}
          </div>
        </aside>

        <OrgChart
          people={chartData.people}
          solidRelations={chartData.solidRelations}
          rootIds={chartData.rootIds}
          expandAll={chartData.expandAll}
          selectedId={selectedId}
          onSelectPerson={setSelectedId}
          editActions={{
            onSavePerson: savePerson,
            onAddChild: addPerson,
            onStartSwap: startSwap,
            onCompleteSwap: swapPeople,
            onCancelSwap: cancelSwap,
            swapSourceId,
            autoEditPersonId,
            onFinishInlineEdit: () => setAutoEditPersonId(null),
            onDeletePerson: deletePerson
          }}
          onViewportChange={setViewport}
          layoutVersion={layoutRepairVersion}
          forceExpandNodeId={forceExpandNodeId}
        />
      </div>
      {isVersionPanelOpen ? (
        <div className="fixed inset-y-0 right-0 z-[10000] w-full max-w-[420px] overflow-y-auto border-l border-white/80 bg-white/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-apple-blue">Developer Mode</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-apple-text">Version History</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsVersionPanelOpen(false)}
              className="rounded-full bg-apple-bg px-3 py-2 text-sm font-semibold text-apple-text"
            >
              關閉
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => createManualSnapshot()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-apple-blue px-4 py-2 text-sm font-semibold text-white"
            >
              📷 建立快照
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-apple-bg px-4 py-2 text-sm font-semibold text-apple-text"
            >
              <Download size={15} />
              匯出JSON
            </button>
            <button
              type="button"
              onClick={repairOrgChartLayout}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-apple-bg px-4 py-2 text-sm font-semibold text-apple-text"
            >
              <FileJson size={15} />
              自動修復排版
            </button>
            <button
              type="button"
              onClick={importJson}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-apple-bg px-4 py-2 text-sm font-semibold text-apple-text"
            >
              <Upload size={15} />
              匯入JSON
            </button>
          </div>

          <textarea
            className="mt-3 h-24 w-full rounded-2xl border border-apple-line bg-white px-3 py-2 text-xs outline-none focus:border-apple-blue"
            placeholder="貼上 JSON 後按「匯入JSON」"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />

          <div className="mt-5 rounded-2xl bg-apple-bg p-3">
            <p className="text-sm font-semibold text-apple-text">比較版本</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select className="rounded-xl border border-apple-line px-2 py-2 text-xs" value={compareFromId} onChange={(event) => setCompareFromId(event.target.value)}>
                <option value="">版本 A</option>
                {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
              </select>
              <select className="rounded-xl border border-apple-line px-2 py-2 text-xs" value={compareToId} onChange={(event) => setCompareToId(event.target.value)}>
                <option value="">版本 B</option>
                {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
              </select>
            </div>
            <div className="mt-3 space-y-1 text-xs text-apple-muted">
              {compareFromId && compareToId
                ? compareOrgChartVersions(
                    versions.find((version) => version.id === compareFromId),
                    versions.find((version) => version.id === compareToId),
                    getPositionRate
                  ).map((change) => <p key={change}>• {change}</p>)
                : <p>選擇兩個版本後顯示差異。</p>}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {versions.length ? versions.map((version) => (
              <div
                key={version.id}
                className={`rounded-2xl border p-3 transition ${
                  previewVersionId === version.id ? "border-apple-blue bg-blue-50/70" : "border-apple-line bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="min-w-0 text-left" onClick={() => setPreviewVersionId(version.id)}>
                    <p className="truncate text-sm font-semibold text-apple-text">○ {version.name}</p>
                    <p className="mt-1 text-xs text-apple-muted">{new Date(version.createdAt).toLocaleString("zh-TW")} · {version.action}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => restoreVersion(version)}
                    className="shrink-0 rounded-full bg-apple-bg px-3 py-1.5 text-xs font-semibold text-apple-blue"
                  >
                    ↩ 還原
                  </button>
                </div>
                {previewVersionId === version.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      className="w-full rounded-xl border border-apple-line px-3 py-2 text-xs outline-none focus:border-apple-blue"
                      value={version.name}
                      onChange={(event) => {
                        const nextVersions = renameOrgChartVersion(version.id, event.target.value);
                        setVersions(nextVersions);
                      }}
                    />
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-apple-muted">
                      <span className="rounded-xl bg-apple-bg px-2 py-2">體系 {version.snapshot?.systems?.length || 0}</span>
                      <span className="rounded-xl bg-apple-bg px-2 py-2">節點 {version.snapshot?.people?.length || 0}</span>
                      <span className="rounded-xl bg-apple-bg px-2 py-2">連線 {version.snapshot?.solidRelations?.length || 0}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )) : (
              <p className="rounded-2xl bg-apple-bg p-4 text-sm text-apple-muted">尚無版本紀錄。</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
