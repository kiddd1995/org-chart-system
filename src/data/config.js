import {
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Crown,
  Download,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  HandCoins,
  Home,
  Landmark,
  Link2,
  Network,
  PackageSearch,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";

export const siteConfig = {
  name: "行動辦公室",
  subtitle: "讓團隊在外也能快速找到需要的資料與工具",
  accentLabel: "Mobile Office Portal",
  protectedPassword: "2026TP767"
};

export const filters = [
  { id: "all", label: "全部" },
  { id: "admin", label: "行政資源" },
  { id: "schedule", label: "課表" },
  { id: "resources", label: "資源中心" },
  { id: "business", label: "業務中心" },
  { id: "leader", label: "主管專區" }
];

export const categoryCards = [
  {
    id: "admin",
    number: "01",
    title: "行政資源",
    description: "常用文件、重要連結與要保書範例集中管理。",
    cta: "前往行政資源",
    icon: BriefcaseBusiness
  },
  {
    id: "schedule",
    number: "02",
    title: "課表",
    description: "掌握每月課程、教育訓練與活動行程。",
    cta: "查看課表",
    icon: CalendarDays
  },
  {
    id: "resources",
    number: "03",
    title: "資源中心",
    description: "整合房地產、金主專案與投資課程資源。",
    cta: "開啟資源中心",
    icon: FolderKanban
  },
  {
    id: "business",
    number: "04",
    title: "業務中心",
    description: "快速查找制度、商品、佣金與商品統整內容。",
    cta: "進入業務中心",
    icon: ChartNoAxesCombined
  },
  {
    id: "leader",
    number: "05",
    title: "主管專區",
    description: "主管限定資料，包含組織圖與憲法專區。",
    cta: "密碼進入",
    icon: Crown,
    protected: true
  }
];

export const pageResources = {
  admin: {
    eyebrow: "Administrative Resources",
    title: "行政資源",
    description: "把外勤最常使用的行政資料整理成清楚入口，減少來回詢問與翻找時間。",
    icon: BriefcaseBusiness,
    resources: [
      {
        title: "下載區",
        description: "放置常用表單、內部文件與範本檔案。",
        icon: Download,
        status: "可擴充"
      },
      {
        title: "標的連結",
        description: "集中管理常用網站、專案網址與外部查詢入口。",
        icon: Link2,
        status: "連結管理"
      },
      {
        title: "要保書範例",
        description: "提供要保書填寫範例，方便新人與外勤快速參考。",
        icon: FileCheck2,
        status: "範例資料"
      }
    ]
  },
  schedule: {
    eyebrow: "Learning Schedule",
    title: "課表",
    description: "課程與活動行程用分區方式呈現，讓團隊快速確認下一步安排。",
    icon: CalendarDays,
    resources: [
      {
        title: "每月課程",
        description: "彙整本月課程主題、時間與參與資訊。",
        icon: CalendarDays,
        status: "每月更新"
      },
      {
        title: "教育訓練",
        description: "新人訓練、制度說明與進階課程內容入口。",
        icon: GraduationCap,
        status: "訓練資源"
      },
      {
        title: "活動行程",
        description: "團隊活動、說明會與重要會議行程集中查看。",
        icon: Sparkles,
        status: "行程追蹤"
      }
    ]
  },
  resources: {
    eyebrow: "Resource Center",
    title: "資源中心",
    description: "把跨主題資料拆成獨立模組，之後可依專案快速新增卡片與連結。",
    icon: FolderKanban,
    resources: [
      {
        title: "房地產",
        description: "房地產相關資料、物件資訊與市場參考內容。",
        icon: Home,
        status: "主題資料"
      },
      {
        title: "金主專案",
        description: "金主合作、專案條件與媒合資料入口。",
        icon: HandCoins,
        status: "專案管理"
      },
      {
        title: "投資課程",
        description: "投資觀念、課程教材與學習資源。",
        icon: Landmark,
        status: "學習內容"
      }
    ]
  },
  business: {
    eyebrow: "Business Center",
    title: "業務中心",
    description: "整理業務執行時最常查詢的制度、商品與佣金資料，讓資訊更好找。",
    icon: ChartNoAxesCombined,
    resources: [
      {
        title: "業務制度",
        description: "制度規則、作業流程與內部規範說明。",
        icon: ClipboardList,
        status: "制度查詢"
      },
      {
        title: "商品專區",
        description: "商品資訊、重點特色與銷售輔助資料。",
        icon: PackageSearch,
        status: "商品資料"
      },
      {
        title: "佣金資料",
        description: "佣金計算、級距資料與相關說明。",
        icon: HandCoins,
        status: "收益查詢"
      },
      {
        title: "商品統整內容",
        description: "商品比較、總表與重點整理。",
        icon: ScrollText,
        status: "統整資料"
      }
    ]
  },
  leader: {
    eyebrow: "Leadership Area",
    title: "主管專區",
    description: "此區需輸入密碼後才能查看，適合放置主管級資料與內部治理文件。",
    icon: Crown,
    protected: true,
    resources: [
      {
        title: "組織圖",
        description: "團隊組織架構、職責分工與聯繫節點。",
        icon: Network,
        status: "主管限定"
      },
      {
        title: "憲法專區",
        description: "團隊核心規範、治理原則與內部共識文件。",
        icon: ShieldCheck,
        status: "機密資料"
      }
    ]
  }
};
