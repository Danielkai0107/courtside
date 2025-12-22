/**
 * 種子數據腳本 - 填充通用運動引擎的初始數據
 * 
 * 這個腳本會填充：
 * 1. Sports 集合 - 運動定義（桌球、羽毛球、匹克球）
 * 2. Formats 集合 - 賽制格式模板（2-20人）
 * 
 * 執行方式：
 * npm run seed
 * 或
 * npx tsx src/scripts/seed-db.ts
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  Timestamp
} from "firebase/firestore";
import type { SportDefinition, FormatDefinition } from "../types/universal-config";
import * as dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// Firebase 配置（從環境變數讀取）
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// 驗證配置
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Firebase 配置不完整，請檢查 .env 文件");
  console.error("需要的環境變數：VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID 等");
  process.exit(1);
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================
// 運動數據定義
// ============================================

const sportsData: SportDefinition[] = [
  // 1. 桌球 (Table Tennis)
  {
    id: "table_tennis",
    name: "桌球",
    icon: "🏓",
    modes: ["singles", "doubles", "team"],
    defaultPresetId: "standard_bo5",
    rulePresets: [
      {
        id: "standard_bo5",
        label: "標準賽制 (Best of 5)",
        description: "每局11分，5局3勝，每球2分領先獲勝",
        config: {
          matchType: "set_based",
          pointsPerSet: 11,
          setsToWin: 3,
          maxSets: 5,
          winByTwo: true,
          cap: null,
        },
      },
      {
        id: "pro_bo7",
        label: "專業賽制 (Best of 7)",
        description: "每局11分，7局4勝，適用於決賽或高水平比賽",
        config: {
          matchType: "set_based",
          pointsPerSet: 11,
          setsToWin: 4,
          maxSets: 7,
          winByTwo: true,
          cap: null,
        },
      },
      {
        id: "quick_bo3",
        label: "快速賽制 (Best of 3)",
        description: "每局11分，3局2勝，適用於練習賽或時間有限的比賽",
        config: {
          matchType: "set_based",
          pointsPerSet: 11,
          setsToWin: 2,
          maxSets: 3,
          winByTwo: true,
          cap: null,
        },
      },
    ],
    isActive: true,
    order: 1,
  },

  // 2. 羽毛球 (Badminton)
  {
    id: "badminton",
    name: "羽毛球",
    icon: "🏸",
    modes: ["singles", "doubles"],
    defaultPresetId: "bwf_standard",
    rulePresets: [
      {
        id: "bwf_standard",
        label: "BWF 標準賽制",
        description: "每局21分，3局2勝，30分封頂",
        config: {
          matchType: "set_based",
          pointsPerSet: 21,
          setsToWin: 2,
          maxSets: 3,
          winByTwo: true,
          cap: 30, // BWF 規則：30分封頂
        },
      },
      {
        id: "one_set_30",
        label: "單局30分制",
        description: "單局30分，適用於快速比賽",
        config: {
          matchType: "point_based",
          pointsPerSet: 30,
          setsToWin: 1,
          maxSets: 1,
          winByTwo: false,
          cap: 30,
        },
      },
      {
        id: "one_set_21",
        label: "單局21分制",
        description: "單局21分，2分領先獲勝，30分封頂",
        config: {
          matchType: "point_based",
          pointsPerSet: 21,
          setsToWin: 1,
          maxSets: 1,
          winByTwo: true,
          cap: 30,
        },
      },
    ],
    isActive: true,
    order: 2,
  },

  // 3. 匹克球 (Pickleball)
  {
    id: "pickleball",
    name: "匹克球",
    icon: "🥒",
    modes: ["singles", "doubles"],
    defaultPresetId: "tournament_bo3",
    rulePresets: [
      {
        id: "tournament_bo3",
        label: "錦標賽賽制 (Best of 3)",
        description: "每局11分，3局2勝，2分領先獲勝",
        config: {
          matchType: "set_based",
          pointsPerSet: 11,
          setsToWin: 2,
          maxSets: 3,
          winByTwo: true,
          cap: null,
        },
      },
      {
        id: "single_game_15",
        label: "單局15分制",
        description: "單局15分，2分領先獲勝，適用於快速比賽",
        config: {
          matchType: "point_based",
          pointsPerSet: 15,
          setsToWin: 1,
          maxSets: 1,
          winByTwo: true,
          cap: null,
        },
      },
      {
        id: "single_game_11",
        label: "單局11分制",
        description: "單局11分，2分領先獲勝",
        config: {
          matchType: "point_based",
          pointsPerSet: 11,
          setsToWin: 1,
          maxSets: 1,
          winByTwo: true,
          cap: null,
        },
      },
    ],
    isActive: true,
    order: 3,
  },
];

// ============================================
// 賽制格式數據定義
// ============================================

const formatsData: FormatDefinition[] = [
  // 1. 小型循環賽 (2-5人)
  {
    id: "rr_small_2_5",
    name: "循環賽 (2-5人)",
    description: "所有選手互相對戰，適合小規模比賽",
    minParticipants: 2,
    maxParticipants: 5,
    stages: [
      {
        type: "round_robin",
        name: "單組循環賽",
      },
    ],
    supportSeeding: false,
  },

  // 2. 雙組循環 + 準決賽 (6-11人)
  {
    id: "group_to_semi_6_11",
    name: "2組循環 → 準決賽",
    description: "分2組循環賽，各組前2名晉級準決賽",
    minParticipants: 6,
    maxParticipants: 11,
    stages: [
      {
        type: "group_stage",
        count: 2,
        advance: 2,
        name: "小組循環賽",
      },
      {
        type: "knockout",
        size: 4,
        name: "準決賽 + 決賽",
      },
    ],
    supportSeeding: true,
  },

  // 3. 標準16強淘汰賽 (12-16人)
  {
    id: "ko_16",
    name: "16強淘汰賽",
    description: "標準單淘汰賽制，不足16人使用輪空",
    minParticipants: 12,
    maxParticipants: 16,
    stages: [
      {
        type: "knockout",
        size: 16,
        name: "單淘汰賽",
      },
    ],
    supportSeeding: true,
  },

  // 4. 四組循環 + 八強淘汰 (13-20人)
  {
    id: "group_to_qf_13_20",
    name: "4組循環 → 八強淘汰",
    description: "分4組循環賽，各組前2名晉級八強淘汰賽",
    minParticipants: 13,
    maxParticipants: 20,
    stages: [
      {
        type: "group_stage",
        count: 4,
        advance: 2,
        name: "小組循環賽",
      },
      {
        type: "knockout",
        size: 8,
        name: "八強淘汰賽",
      },
    ],
    supportSeeding: true,
  },

  // 5. 8強淘汰賽 (6-8人)
  {
    id: "ko_8",
    name: "8強淘汰賽",
    description: "標準8強單淘汰賽制",
    minParticipants: 6,
    maxParticipants: 8,
    stages: [
      {
        type: "knockout",
        size: 8,
        name: "單淘汰賽",
      },
    ],
    supportSeeding: true,
  },

  // 6. 4強淘汰賽 (3-4人)
  {
    id: "ko_4",
    name: "4強淘汰賽",
    description: "準決賽直接開始",
    minParticipants: 3,
    maxParticipants: 4,
    stages: [
      {
        type: "knockout",
        size: 4,
        name: "單淘汰賽",
      },
    ],
    supportSeeding: true,
  },
];

// ============================================
// 種子填充函數
// ============================================

async function seedSports() {
  console.log("🏃 開始填充運動數據...\n");

  for (const sport of sportsData) {
    try {
      const docRef = doc(db, "sports", sport.id);
      const now = Timestamp.now();
      await setDoc(docRef, {
        ...sport,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✅ 成功創建運動: ${sport.name} (${sport.id})`);
      console.log(`   - 模式: ${sport.modes.join(", ")}`);
      console.log(`   - 規則預設: ${sport.rulePresets.length} 個\n`);
    } catch (error) {
      console.error(`❌ 創建運動失敗 (${sport.id}):`, error);
    }
  }
}

async function seedFormats() {
  console.log("\n📋 開始填充賽制格式數據...\n");

  for (const format of formatsData) {
    try {
      const docRef = doc(db, "formats", format.id);
      const now = Timestamp.now();
      await setDoc(docRef, {
        ...format,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`✅ 成功創建賽制: ${format.name} (${format.id})`);
      console.log(`   - 人數範圍: ${format.minParticipants}-${format.maxParticipants} 人`);
      console.log(`   - 階段: ${format.stages.map(s => s.type).join(" → ")}\n`);
    } catch (error) {
      console.error(`❌ 創建賽制失敗 (${format.id}):`, error);
    }
  }
}

// ============================================
// 主執行函數
// ============================================

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🌱 通用運動引擎 - 種子數據填充工具");
  console.log("=".repeat(60) + "\n");

  try {
    // 填充運動數據
    await seedSports();

    // 填充賽制格式數據
    await seedFormats();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 種子數據填充完成！");
    console.log("=".repeat(60) + "\n");
    console.log("數據摘要：");
    console.log(`  - 運動數量: ${sportsData.length} 個`);
    console.log(`  - 賽制格式: ${formatsData.length} 個`);
    console.log(`  - 規則預設總數: ${sportsData.reduce((sum, s) => sum + s.rulePresets.length, 0)} 個`);
    console.log("\n您現在可以開始創建賽事了！\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ 種子數據填充失敗:", error);
    process.exit(1);
  }
}

// 執行
main();

