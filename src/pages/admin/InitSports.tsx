import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import {
  initAllSports,
  initBadminton,
  initPickleball,
  initTableTennis,
} from "../../scripts/initSports";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import styles from "./InitSports.module.scss";

type InitStatus = {
  badminton: boolean;
  pickleball: boolean;
  tableTennis: boolean;
};

const InitSports: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initStatus, setInitStatus] = useState<InitStatus>({
    badminton: false,
    pickleball: false,
    tableTennis: false,
  });

  const handleInitAll = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    setInitStatus({
      badminton: false,
      pickleball: false,
      tableTennis: false,
    });

    try {
      await initAllSports();
      setInitStatus({
        badminton: true,
        pickleball: true,
        tableTennis: true,
      });
      setMessage("✅ 所有球類項目已成功建立！");
    } catch (err: any) {
      setError(`建立失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitSingle = async (
    sportType: keyof InitStatus,
    initFunc: () => Promise<string>
  ) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const id = await initFunc();
      setInitStatus((prev) => ({ ...prev, [sportType]: true }));
      setMessage(`✅ ${getSportName(sportType)} 資料已成功建立！ID: ${id}`);
    } catch (err: any) {
      setError(`建立失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSportName = (sportType: keyof InitStatus): string => {
    const names = {
      badminton: "羽毛球",
      pickleball: "匹克球",
      tableTennis: "桌球",
    };
    return names[sportType];
  };

  return (
    <div className={styles.initSports}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.title}>初始化球類項目</h2>
      </div>

      <div className={styles.content}>
        {/* 一鍵初始化所有運動項目 */}
        <Card className={styles.mainCard}>
          <h3>🚀 一鍵初始化</h3>
          <p className={styles.description}>
            點擊下方按鈕將在資料庫中建立所有球類項目的初始資料，包括：匹克球、羽毛球、桌球。
          </p>

          {message && <div className={styles.success}>{message}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <Button onClick={handleInitAll} loading={loading} fullWidth>
            初始化所有球類項目
          </Button>
        </Card>

        {/* 個別運動項目 */}
        <div className={styles.sportsGrid}>
          {/* 匹克球 */}
          <Card>
            <div className={styles.sportHeader}>
              <h3>🏓 匹克球</h3>
              {initStatus.pickleball && (
                <CheckCircle size={20} className={styles.successIcon} />
              )}
            </div>
            <p className={styles.sportDescription}>
              標準11分制、單局21分制
            </p>
            <Button
              onClick={() => handleInitSingle("pickleball", initPickleball)}
              loading={loading}
              disabled={initStatus.pickleball}
              fullWidth
              variant={initStatus.pickleball ? "outline" : "primary"}
            >
              {initStatus.pickleball ? "已建立" : "建立匹克球"}
            </Button>
          </Card>

          {/* 羽毛球 */}
          <Card>
            <div className={styles.sportHeader}>
              <h3>🏸 羽毛球</h3>
              {initStatus.badminton && (
                <CheckCircle size={20} className={styles.successIcon} />
              )}
            </div>
            <p className={styles.sportDescription}>
              BWF標準賽制、單局30分、單局21分
            </p>
            <Button
              onClick={() => handleInitSingle("badminton", initBadminton)}
              loading={loading}
              disabled={initStatus.badminton}
              fullWidth
              variant={initStatus.badminton ? "outline" : "primary"}
            >
              {initStatus.badminton ? "已建立" : "建立羽毛球"}
            </Button>
          </Card>

          {/* 桌球 */}
          <Card>
            <div className={styles.sportHeader}>
              <h3>🏓 桌球</h3>
              {initStatus.tableTennis && (
                <CheckCircle size={20} className={styles.successIcon} />
              )}
            </div>
            <p className={styles.sportDescription}>
              標準11分5局3勝、7局4勝制
            </p>
            <Button
              onClick={() => handleInitSingle("tableTennis", initTableTennis)}
              loading={loading}
              disabled={initStatus.tableTennis}
              fullWidth
              variant={initStatus.tableTennis ? "outline" : "primary"}
            >
              {initStatus.tableTennis ? "已建立" : "建立桌球"}
            </Button>
          </Card>
        </div>

        {/* 資料結構說明 */}
        <Card>
          <h3>📋 新的資料結構</h3>
          <div className={styles.dataPreview}>
            <h4>每個運動項目包含：</h4>
            <ul className={styles.featureList}>
              <li>✅ 多種比賽規則預設（Rule Presets）</li>
              <li>✅ 單打/雙打模式支援</li>
              <li>✅ 彈性的分數配置（每局分數、局數等）</li>
              <li>✅ 預設規則選擇</li>
            </ul>
            <pre>{`範例：羽毛球
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
      config: {
        pointsPerSet: 21,
        maxSets: 3,
        setsToWin: 2,
        cap: 30,
        winByTwo: true
      }
    }
    // ... 更多規則預設
  ]
}`}</pre>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InitSports;





