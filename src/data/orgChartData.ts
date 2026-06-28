export type Gender = "男" | "女";

export type PositionTitle = "業務協理" | "資深業務總監" | "業務總監" | "業務經理" | "儲備主管";

export type OrgChartPerson = {
  id: string;
  name: string;
  gender: Gender;
  title: PositionTitle;
  systemId: string;
  parentId?: string | null;
  sortOrder?: number;
};

export type SolidRelation = {
  from: string;
  to: string;
};

export type OrgSystem = {
  id: string;
  name: string;
  rootNodeId: string;
  createdAt: string;
  updatedAt: string;
};

export const orgChartMeta = {
  eyebrow: "ORG CHART",
  title: "組織圖"
};

export const positionOptions: Array<{ title: PositionTitle; positionRate: number; generationRates: number[] }> = [
  { title: "業務協理", positionRate: 85, generationRates: [2, 1, 0.5, 0.25, 0.25] },
  { title: "資深業務總監", positionRate: 81, generationRates: [2, 1, 0.5, 0.25, 0.25] },
  { title: "業務總監", positionRate: 77, generationRates: [2, 1, 0.5, 0.25, 0] },
  { title: "業務經理", positionRate: 69, generationRates: [5, 1, 0.5, 0.5, 0.5] },
  { title: "儲備主管", positionRate: 57, generationRates: [5, 1, 0.5, 0.5, 0.5] }
];

export const systems: OrgSystem[] = [
  {
    id: "system-main",
    name: "林品妤體系",
    rootNodeId: "director",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

export const people: OrgChartPerson[] = [
  { id: "director", name: "林品妤", gender: "女", title: "業務協理", systemId: "system-main" },
  { id: "senior-director-a", name: "陳柏宇", gender: "男", title: "資深業務總監", systemId: "system-main" },
  { id: "senior-director-b", name: "張若晴", gender: "女", title: "資深業務總監", systemId: "system-main" },
  { id: "director-a", name: "王承翰", gender: "男", title: "業務總監", systemId: "system-main" },
  { id: "manager-a", name: "周以恩", gender: "女", title: "業務經理", systemId: "system-main" },
  { id: "manager-b", name: "吳采蓁", gender: "女", title: "業務經理", systemId: "system-main" },
  { id: "trainee-a", name: "許宥廷", gender: "男", title: "儲備主管", systemId: "system-main" },
  { id: "trainee-b", name: "黃珮瑜", gender: "女", title: "儲備主管", systemId: "system-main" },
  { id: "trainee-c", name: "李映辰", gender: "女", title: "儲備主管", systemId: "system-main" }
];

export const solidRelations: SolidRelation[] = [
  { from: "director", to: "senior-director-a" },
  { from: "director", to: "senior-director-b" },
  { from: "senior-director-a", to: "director-a" },
  { from: "director-a", to: "manager-a" },
  { from: "director-a", to: "manager-b" },
  { from: "manager-a", to: "trainee-a" },
  { from: "manager-a", to: "trainee-b" },
  { from: "manager-b", to: "trainee-c" }
];
