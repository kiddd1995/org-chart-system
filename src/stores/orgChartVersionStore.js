const VERSION_STORAGE_KEY = "mobile-office-org-chart-versions-v1";
const VERSION_LIMIT = 50;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createVersionId() {
  return `version-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatVersionName(date = new Date()) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function getVersionHistory() {
  if (!isBrowser()) return [];

  try {
    const versions = JSON.parse(window.localStorage.getItem(VERSION_STORAGE_KEY) || "[]");
    return Array.isArray(versions) ? versions : [];
  } catch {
    return [];
  }
}

export function saveVersionHistory(versions) {
  if (!isBrowser()) return;
  window.localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions.slice(0, VERSION_LIMIT)));
}

export function createOrgChartVersion(orgChartData, options = {}) {
  const createdAt = new Date().toISOString();
  const version = {
    id: createVersionId(),
    name: options.name?.trim() || formatVersionName(new Date(createdAt)),
    createdAt,
    action: options.action || "snapshot",
    snapshot: {
      systems: orgChartData.systems || [],
      people: orgChartData.people || [],
      solidRelations: orgChartData.solidRelations || [],
      layout: options.layout || null,
      viewport: options.viewport || null
    }
  };

  const versions = [version, ...getVersionHistory()].slice(0, VERSION_LIMIT);
  saveVersionHistory(versions);
  return version;
}

export function renameOrgChartVersion(versionId, name) {
  const versions = getVersionHistory().map((version) =>
    version.id === versionId ? { ...version, name: name.trim() || version.name } : version
  );
  saveVersionHistory(versions);
  return versions;
}

function getParentMap(relations = []) {
  return new Map(relations.map((relation) => [relation.to, relation.from]));
}

function getDiffRate(person, parent, getPositionRate) {
  if (!person || !parent) return null;
  const diffRate = getPositionRate(parent.title) - getPositionRate(person.title);
  return diffRate > 0 ? diffRate : null;
}

export function compareOrgChartVersions(baseVersion, targetVersion, getPositionRate) {
  if (!baseVersion || !targetVersion) return [];

  const basePeople = baseVersion.snapshot?.people || [];
  const targetPeople = targetVersion.snapshot?.people || [];
  const baseById = new Map(basePeople.map((person) => [person.id, person]));
  const targetById = new Map(targetPeople.map((person) => [person.id, person]));
  const baseParents = getParentMap(baseVersion.snapshot?.solidRelations);
  const targetParents = getParentMap(targetVersion.snapshot?.solidRelations);
  const changes = [];

  targetPeople.forEach((person) => {
    if (!baseById.has(person.id)) changes.push(`新增節點：${person.name}`);
  });

  basePeople.forEach((person) => {
    if (!targetById.has(person.id)) changes.push(`刪除節點：${person.name}`);
  });

  targetPeople.forEach((person) => {
    const before = baseById.get(person.id);
    if (!before) return;

    if (before.name !== person.name) changes.push(`修改姓名：${before.name} → ${person.name}`);
    if (before.title !== person.title) changes.push(`修改職位：${person.name} ${before.title} → ${person.title}`);
    if (before.gender !== person.gender) changes.push(`修改性別：${person.name} ${before.gender} → ${person.gender}`);

    const beforeParentId = baseParents.get(person.id) || "";
    const afterParentId = targetParents.get(person.id) || "";
    if (beforeParentId !== afterParentId) {
      changes.push(`交換位置 / 調整上線：${person.name}`);
    }

    const beforeParent = baseById.get(beforeParentId);
    const afterParent = targetById.get(afterParentId);
    const beforeDiff = getDiffRate(before, beforeParent, getPositionRate);
    const afterDiff = getDiffRate(person, afterParent, getPositionRate);
    if (beforeDiff !== afterDiff) {
      changes.push(`差額變化：${person.name} ${beforeDiff ?? 0}% → ${afterDiff ?? 0}%`);
    }
  });

  return changes.length ? changes : ["兩個版本沒有偵測到差異"];
}
