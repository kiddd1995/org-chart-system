import {
  people as defaultPeople,
  positionOptions,
  systems as defaultSystems,
  solidRelations as defaultSolidRelations,
  type OrgSystem,
  type OrgChartPerson,
  type PositionTitle,
  type SolidRelation
} from "../data/orgChartData";

export type OrgChartState = {
  systems: OrgSystem[];
  people: OrgChartPerson[];
  solidRelations: SolidRelation[];
};

export const OWNER_PASSWORD = "2026TP767-owner";

const STORAGE_KEY = "mobile-office-org-chart-data-v2";
const LEGACY_STORAGE_KEYS = ["mobile-office-org-chart-data"];
const READ_STORAGE_KEYS = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
const CHANGE_EVENT = "mobile-office-org-chart-updated";

export const defaultOrgChartState: OrgChartState = {
  systems: defaultSystems,
  people: defaultPeople,
  solidRelations: defaultSolidRelations
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPositionConfig(title: PositionTitle) {
  return positionOptions.find((option) => option.title === title) || positionOptions[0];
}

export function getPositionRate(title: PositionTitle) {
  return getPositionConfig(title).positionRate;
}

export function getVerticalDiffRate(fromTitle: PositionTitle, toTitle: PositionTitle) {
  return Math.abs(getPositionRate(fromTitle) - getPositionRate(toTitle));
}

export function getGenerationRates(title: PositionTitle) {
  return getPositionConfig(title).generationRates;
}

function isValidPerson(person: unknown): person is OrgChartPerson {
  const value = person as OrgChartPerson;
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      (value.gender === "男" || value.gender === "女") &&
      positionOptions.some((option) => option.title === value.title)
  );
}

function isValidSystem(system: unknown): system is OrgSystem {
  const value = system as OrgSystem;
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.rootNodeId === "string" &&
      typeof value.createdAt === "string" &&
      typeof value.updatedAt === "string"
  );
}

function isValidRelation(relation: unknown): relation is SolidRelation {
  const value = relation as SolidRelation;
  return Boolean(value && typeof value.from === "string" && typeof value.to === "string");
}

function createValidatedRelations(people: OrgChartPerson[], solidRelations: SolidRelation[]) {
  const personIds = new Set(people.map((person) => person.id));
  const parentByChild = new Map<string, string>();
  const relationParentByChild = new Map<string, string>();

  solidRelations.forEach((relation) => {
    if (
      personIds.has(relation.from) &&
      personIds.has(relation.to) &&
      relation.from !== relation.to &&
      !relationParentByChild.has(relation.to)
    ) {
      relationParentByChild.set(relation.to, relation.from);
    }
  });

  people.forEach((person) => {
    if (
      typeof person.parentId === "string" &&
      person.parentId &&
      person.parentId !== person.id &&
      personIds.has(person.parentId)
    ) {
      parentByChild.set(person.id, person.parentId);
      return;
    }

    const migratedParentId = relationParentByChild.get(person.id);
    if (migratedParentId) parentByChild.set(person.id, migratedParentId);
  });

  return [...parentByChild.entries()].map(([to, from]) => ({ from, to }));
}

export function validateEdges(data: Partial<OrgChartState> | null): OrgChartState {
  const people = Array.isArray(data?.people) ? data.people.filter(isValidPerson) : defaultPeople;
  const systems = Array.isArray(data?.systems) ? data.systems.filter(isValidSystem) : defaultSystems;
  const solidRelations = Array.isArray(data?.solidRelations) ? data.solidRelations.filter(isValidRelation) : defaultSolidRelations;
  const validatedRelations = createValidatedRelations(people, solidRelations);
  const parentByChild = new Map(validatedRelations.map((relation) => [relation.to, relation.from]));
  const nextPeople = people.map((person) => ({
    ...person,
    parentId: parentByChild.get(person.id) || null
  }));

  return {
    systems,
    people: nextPeople,
    solidRelations: validatedRelations
  };
}

function createSystemId(rootId: string) {
  return `system-${rootId}`;
}

function migrateSystems(people: OrgChartPerson[], solidRelations: SolidRelation[], systems: OrgSystem[]) {
  const personIds = new Set(people.map((person) => person.id));
  const childrenByParent = new Map<string, string[]>();
  const incoming = new Map(people.map((person) => [person.id, 0]));

  solidRelations.forEach((relation) => {
    if (!personIds.has(relation.from) || !personIds.has(relation.to)) return;
    childrenByParent.set(relation.from, [...(childrenByParent.get(relation.from) || []), relation.to]);
    incoming.set(relation.to, (incoming.get(relation.to) || 0) + 1);
  });

  const rootIds = people.filter((person) => (incoming.get(person.id) || 0) === 0).map((person) => person.id);
  const nextSystems = systems.length
    ? systems.filter((system) => personIds.has(system.rootNodeId))
    : rootIds.map((rootId) => {
        const rootPerson = people.find((person) => person.id === rootId);
        const now = new Date().toISOString();
        return {
          id: createSystemId(rootId),
          name: `${rootPerson?.name || "未命名"}體系`,
          rootNodeId: rootId,
          createdAt: now,
          updatedAt: now
        };
      });

  const systemByRoot = new Map(nextSystems.map((system) => [system.rootNodeId, system.id]));
  const systemByNode = new Map<string, string>();

  nextSystems.forEach((system) => {
    const stack = [system.rootNodeId];
    while (stack.length) {
      const currentId = stack.pop();
      if (!currentId || systemByNode.has(currentId)) continue;
      systemByNode.set(currentId, system.id);
      stack.push(...(childrenByParent.get(currentId) || []));
    }
  });

  const fallbackSystemId = nextSystems[0]?.id || defaultOrgChartState.systems[0].id;
  const nextPeople = people.map((person) => ({
    ...person,
    systemId: systemByNode.get(person.id) || person.systemId || systemByRoot.get(person.id) || fallbackSystemId
  }));

  return {
    systems: nextSystems.length ? nextSystems : defaultOrgChartState.systems,
    people: nextPeople
  };
}

function parseOrgChartData(data: Partial<OrgChartState> | null): OrgChartState | null {
  const people = Array.isArray(data?.people) ? data.people.filter(isValidPerson) : [];
  const personIds = new Set(people.map((person) => person.id));
  const rawSystems = Array.isArray(data?.systems) ? data.systems.filter(isValidSystem) : [];
  const solidRelations = Array.isArray(data?.solidRelations)
    ? data.solidRelations.filter(
        (relation) => isValidRelation(relation) && personIds.has(relation.from) && personIds.has(relation.to)
      )
    : [];

  if (!people.length) return null;

  const migrated = migrateSystems(people, solidRelations, rawSystems);

  return validateEdges({ systems: migrated.systems, people: migrated.people, solidRelations });
}

function normalizeOrgChartData(data: Partial<OrgChartState> | null): OrgChartState {
  return parseOrgChartData(data) || defaultOrgChartState;
}

export function getOrgChartData(): OrgChartState {
  if (!isBrowser()) return defaultOrgChartState;

  for (const storageKey of READ_STORAGE_KEYS) {
    const rawData = window.localStorage.getItem(storageKey);
    if (!rawData) continue;

    try {
      const parsedData = parseOrgChartData(JSON.parse(rawData));
      if (!parsedData) continue;

      if (storageKey !== STORAGE_KEY) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
        window.localStorage.removeItem(storageKey);
      }

      return parsedData;
    } catch {
      continue;
    }
  }

  return defaultOrgChartState;
}

export function saveOrgChartData(nextData: OrgChartState) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeOrgChartData(nextData)));
  LEGACY_STORAGE_KEYS.forEach((storageKey) => window.localStorage.removeItem(storageKey));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function resetOrgChartData() {
  saveOrgChartData(defaultOrgChartState);
}

export function subscribeOrgChartData(callback: () => void) {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key && READ_STORAGE_KEYS.includes(event.key)) callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
