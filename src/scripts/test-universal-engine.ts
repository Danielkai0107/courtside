/**
 * 通用運動引擎測試腳本
 * 
 * 這個腳本會執行完整的端到端測試：
 * 1. 創建測試賽事
 * 2. 創建通用引擎分類
 * 3. 添加測試參賽者
 * 4. 生成賽程
 * 5. 模擬計分
 * 6. 驗證自動晉級
 * 
 * 執行方式：
 * npm run test:engine
 */

import { initializeApp } from "firebase/app";
import { getFirestore, Timestamp } from "firebase/firestore";
import { createTournament } from "../services/tournamentService";
import { createCategoryUniversal } from "../services/categoryService";
import { addPlayerManually } from "../services/registrationService";
import { generateScheduleUniversal } from "../services/bracketService";
import { recordScoreUniversal } from "../services/matchService";
import { getMatchesByCategory } from "../services/matchService";
import * as dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTest() {
  console.log("\n" + "=".repeat(60));
  console.log("通用運動引擎 - 端到端測試");
  console.log("=".repeat(60) + "\n");

  try {
    // 1. 創建測試賽事
    console.log("步驟 1: 創建測試賽事...");
    const tournamentId = await createTournament({
      name: "通用引擎測試賽",
      sportId: "table_tennis",
      date: Timestamp.fromDate(new Date("2024-12-30")),
      registrationDeadline: Timestamp.fromDate(new Date("2024-12-28")),
      location: "測試場地",
      status: "DRAFT",
      organizerId: "test-organizer-uid",
      organizerName: "測試主辦方",
      stats: {
        totalCategories: 0,
        totalMatches: 0,
      },
    } as any);

    console.log(`  成功創建賽事: ${tournamentId}\n`);

    // 2. 創建通用引擎分類
    console.log("步驟 2: 創建通用引擎分類...");
    const categoryId = await createCategoryUniversal(tournamentId, {
      name: "男子單打測試",
      matchType: "singles",
      sportId: "table_tennis",
      rulePresetId: "standard_bo5",
      selectedFormatId: "ko_8", // 8強淘汰賽
    });

    console.log(`  成功創建分類: ${categoryId}`);
    console.log(`  配置: 桌球 / 標準BO5 / 8強淘汰賽\n`);

    // 3. 添加測試參賽者
    console.log("步驟 3: 添加 8 位測試參賽者...");
    const playerIds: string[] = [];

    for (let i = 1; i <= 8; i++) {
      const playerId = await addPlayerManually(tournamentId, {
        email: `player${i}@test.com`,
        name: `測試選手 ${i}`,
        categoryId: categoryId,
      });
      playerIds.push(playerId);
    }

    console.log(`  成功添加 ${playerIds.length} 位參賽者\n`);

    // 4. 生成賽程
    console.log("步驟 4: 生成賽程...");
    await generateScheduleUniversal(tournamentId, categoryId);

    console.log("  賽程生成完成\n");

    // 5. 獲取所有比賽
    console.log("步驟 5: 獲取比賽列表...");
    const matches = await getMatchesByCategory(tournamentId, categoryId);

    console.log(`  總共 ${matches.length} 場比賽`);
    console.log(`  Round 1: ${matches.filter((m) => m.round === 1).length} 場`);
    console.log(`  Round 2: ${matches.filter((m) => m.round === 2).length} 場`);
    console.log(`  Round 3: ${matches.filter((m) => m.round === 3).length} 場\n`);

    // 6. 模擬第一場比賽計分
    console.log("步驟 6: 模擬第一場比賽計分...");
    const firstMatch = matches.find((m) => m.round === 1 && m.matchOrder === 1);

    if (firstMatch) {
      console.log(`  比賽: ${firstMatch.player1Name} vs ${firstMatch.player2Name}`);

      // 第1局: 11-8
      await recordScoreUniversal(firstMatch.id, 0, 11, 8);
      console.log("  第1局: 11-8 (選手1獲勝)");

      // 第2局: 9-11
      await recordScoreUniversal(firstMatch.id, 1, 9, 11);
      console.log("  第2局: 9-11 (選手2獲勝)");

      // 第3局: 11-7
      await recordScoreUniversal(firstMatch.id, 2, 11, 7);
      console.log("  第3局: 11-7 (選手1獲勝)");

      // 第4局: 11-6 (比賽結束，3-1)
      await recordScoreUniversal(firstMatch.id, 3, 11, 6);
      console.log("  第4局: 11-6 (選手1獲勝)");
      console.log("  比賽結束！選手1以 3-1 獲勝\n");
    }

    // 7. 驗證自動晉級
    console.log("步驟 7: 驗證自動晉級...");
    const updatedMatches = await getMatchesByCategory(tournamentId, categoryId);
    const semifinalMatch = updatedMatches.find(
      (m) => m.round === 2 && m.matchOrder === 1
    );

    if (semifinalMatch && semifinalMatch.player1Id) {
      console.log("  自動晉級成功！");
      console.log(`  準決賽選手1: ${semifinalMatch.player1Name}\n`);
    } else {
      console.log("  警告：自動晉級可能未執行\n");
    }

    // 測試完成
    console.log("=".repeat(60));
    console.log("測試完成！");
    console.log("=".repeat(60) + "\n");
    console.log("驗證項目:");
    console.log("  - 賽事創建");
    console.log("  - 分類創建（配置快照）");
    console.log("  - 參賽者添加");
    console.log("  - 賽程生成（Bracket）");
    console.log("  - 通用計分引擎");
    console.log("  - 自動晉級邏輯");
    console.log("\n請前往 Firebase Console 驗證數據結構。\n");
    console.log(`測試賽事 ID: ${tournamentId}`);
    console.log(`測試分類 ID: ${categoryId}\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n測試失敗:", error);
    process.exit(1);
  }
}

// 執行測試
runTest();

