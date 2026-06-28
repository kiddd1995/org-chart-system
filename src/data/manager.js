import { Network } from "lucide-react";

export const managerHome = {
  eyebrow: "MANAGER",
  title: "主管專區",
  description: "主管模組獨立管理，後續可加入組織治理、團隊資料與管理工具。",
  modules: [
    {
      id: "org-chart",
      title: "組織圖",
      description: "查看團隊層級、部門分工與主要負責人。",
      href: "/manager/org-chart",
      cta: "查看組織圖",
      icon: Network
    }
  ]
};
