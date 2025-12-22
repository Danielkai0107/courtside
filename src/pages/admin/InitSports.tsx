import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { initPickleball } from "../../scripts/initSports";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import styles from "./InitSports.module.scss";

const InitSports: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleInit = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const id = await initPickleball();
      setMessage(`匹克球資料已成功建立！ID: ${id}`);
    } catch (err: any) {
      setError(`建立失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
        <Card>
          <h3>建立匹克球資料</h3>
          <p className={styles.description}>
            點擊下方按鈕將在資料庫中建立匹克球的初始資料。
          </p>

          <div className={styles.dataPreview}>
            <h4>資料預覽：</h4>
            <pre>{`{
  name: "匹克球",
  nameEn: "Pickleball",
  icon: "P",
  availableFormats: [
    {
      id: "knockout",
      name: "單淘汰賽",
      description: "選手兩兩對戰，輸者淘汰，贏者晉級下一輪"
    }
  ],
  defaultPointsPerSet: 11,
  isActive: true,
  order: 1
}`}</pre>
          </div>

          {message && <div className={styles.success}>{message}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <Button onClick={handleInit} loading={loading} fullWidth>
            建立匹克球資料
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default InitSports;





