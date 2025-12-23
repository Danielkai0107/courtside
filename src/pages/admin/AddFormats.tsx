import React, { useState } from "react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import styles from "./InitSports.module.scss";

const AddFormats: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleAddFormats = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // 1. 新增 ko_32
      await setDoc(doc(db, "formats", "ko_32"), {
        name: "32強淘汰賽",
        description: "標準32強單淘汰賽制，適合17-32人",
        minParticipants: 17,
        maxParticipants: 32,
        supportSeeding: true,
        stages: [
          {
            name: "單淘汰賽",
            type: "knockout",
            size: 32,
          },
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 2. 新增 ko_universal
      await setDoc(doc(db, "formats", "ko_universal"), {
        name: "單淘汰賽（通用）",
        description: "適用任何人數，系統自動計算最接近的2^n規模",
        minParticipants: 2,
        maxParticipants: 999,
        supportSeeding: true,
        stages: [
          {
            name: "單淘汰賽",
            type: "knockout",
            size: 0, // 0 = 自動計算
          },
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setMessage(" 通用淘汰賽模板新增完成！\n\n現在支援 2-999 人的比賽！");
    } catch (err: any) {
      setError(`新增失敗: ${err.message}`);
      console.error("Failed to add formats:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.initSports}>
      <Card>
        <h2>新增通用淘汰賽模板</h2>
        <p>將新增以下模板到 formats 集合：</p>
        <ul>
          <li>ko_32: 32強淘汰賽（17-32人）</li>
          <li>ko_universal: 通用淘汰賽（2-999人，自動計算規模）</li>
        </ul>

        <Button
          variant="primary"
          onClick={handleAddFormats}
          loading={loading}
          disabled={loading}
        >
          新增模板
        </Button>

        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}
      </Card>
    </div>
  );
};

export default AddFormats;
