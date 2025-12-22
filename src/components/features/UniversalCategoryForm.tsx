/**
 * 通用分類創建表單
 * 
 * 展示如何使用通用運動引擎創建分類：
 * 1. 選擇運動
 * 2. 選擇規則預設
 * 3. 選擇賽制格式
 * 4. 創建分類（帶配置快照）
 */

import React, { useState, useEffect } from "react";
import {
  getActiveSportsUniversal,
  getAvailableFormatsUniversal,
  getFormatDisplayLabel,
  getRulePresetDisplayLabel,
} from "../../services/universalEngineService";
import { createCategoryWithSnapshot } from "../../services/tournamentService";
import type {
  SportDefinition,
  RulePreset,
  FormatDefinition,
} from "../../types/universal-config";
import Button from "../common/Button";
import Select from "../common/Select";
import Input from "../common/Input";
import Loading from "../common/Loading";
import styles from "./UniversalCategoryForm.module.scss";

interface Props {
  tournamentId: string;
  onSuccess?: (categoryId: string) => void;
  onCancel?: () => void;
}

const UniversalCategoryForm: React.FC<Props> = ({
  tournamentId,
  onSuccess,
  onCancel,
}) => {
  // 狀態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 數據
  const [sports, setSports] = useState<SportDefinition[]>([]);
  const [formats, setFormats] = useState<FormatDefinition[]>([]);

  // 表單欄位
  const [categoryName, setCategoryName] = useState("");
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [selectedSportId, setSelectedSportId] = useState("");
  const [selectedRulePresetId, setSelectedRulePresetId] = useState("");
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const [estimatedParticipants, setEstimatedParticipants] = useState(8);

  // 派生數據
  const [rulePresets, setRulePresets] = useState<RulePreset[]>([]);
  const [availableFormats, setAvailableFormats] = useState<FormatDefinition[]>(
    []
  );

  // 初始化：載入運動和格式
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 載入運動
        const sportsData = await getActiveSportsUniversal();
        setSports(sportsData);

        // 自動選擇第一個運動
        if (sportsData.length > 0) {
          setSelectedSportId(sportsData[0].id);
        }

        // 載入所有格式
        const formatsData = await getAvailableFormatsUniversal();
        setFormats(formatsData);
      } catch (err) {
        console.error("載入數據失敗:", err);
        setError("載入數據失敗，請重新整理頁面");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 當選擇運動時，更新規則預設
  useEffect(() => {
    if (!selectedSportId) {
      setRulePresets([]);
      setSelectedRulePresetId("");
      return;
    }

    const sport = sports.find((s) => s.id === selectedSportId);
    if (sport) {
      setRulePresets(sport.rulePresets);

      // 自動選擇默認規則預設
      setSelectedRulePresetId(sport.defaultPresetId);
    }
  }, [selectedSportId, sports]);

  // 當預估人數變更時，篩選可用格式
  useEffect(() => {
    const filtered = formats.filter(
      (format) =>
        estimatedParticipants >= format.minParticipants &&
        estimatedParticipants <= format.maxParticipants
    );

    setAvailableFormats(filtered);

    // 如果當前選擇的格式不在可用列表中，重置
    if (
      selectedFormatId &&
      !filtered.find((f) => f.id === selectedFormatId)
    ) {
      setSelectedFormatId(filtered.length > 0 ? filtered[0].id : "");
    } else if (!selectedFormatId && filtered.length > 0) {
      setSelectedFormatId(filtered[0].id);
    }
  }, [estimatedParticipants, formats]);

  // 表單驗證
  const validate = (): boolean => {
    if (!categoryName.trim()) {
      setError("請輸入分類名稱");
      return false;
    }

    if (!selectedSportId) {
      setError("請選擇運動");
      return false;
    }

    if (!selectedRulePresetId) {
      setError("請選擇規則預設");
      return false;
    }

    if (!selectedFormatId) {
      setError("請選擇賽制格式");
      return false;
    }

    setError("");
    return true;
  };

  // 提交表單
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 呼叫配置快照邏輯
      const categoryId = await createCategoryWithSnapshot(tournamentId, {
        name: categoryName,
        matchType,
        sportId: selectedSportId,
        rulePresetId: selectedRulePresetId,
        selectedFormatId,
      });

      console.log("分類創建成功:", categoryId);

      if (onSuccess) {
        onSuccess(categoryId);
      }
    } catch (err) {
      console.error("創建分類失敗:", err);
      setError("創建分類失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (loading && sports.length === 0) {
    return <Loading />;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>創建賽事分類</h2>

      {error && <div className={styles.error}>{error}</div>}

      {/* Step 1: 基本資訊 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>基本資訊</h3>

        <Input
          label="分類名稱"
          placeholder="例如：男子單打、女子雙打"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          required
        />

        <Select
          label="比賽類型"
          value={matchType}
          onChange={(value) =>
            setMatchType(value as "singles" | "doubles")
          }
          options={[
            { value: "singles", label: "單打" },
            { value: "doubles", label: "雙打" },
          ]}
          required
        />
      </div>

      {/* Step 2: 選擇運動 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Step 1: 選擇運動 {selectedSportId && "✅"}
        </h3>

        <Select
          label="運動項目"
          value={selectedSportId}
          onChange={(value) => setSelectedSportId(value)}
          options={sports.map((sport) => ({
            value: sport.id,
            label: `${sport.icon || ""} ${sport.name}`,
          }))}
          required
        />
      </div>

      {/* Step 3: 選擇規則預設 */}
      {selectedSportId && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Step 2: 選擇規則預設 {selectedRulePresetId && "✅"}
          </h3>

          <Select
            label="計分規則"
            value={selectedRulePresetId}
            onChange={(value) => setSelectedRulePresetId(value)}
            options={rulePresets.map((preset) => ({
              value: preset.id,
              label: getRulePresetDisplayLabel(preset),
            }))}
            required
          />

          {selectedRulePresetId && (
            <div className={styles.hint}>
              {
                rulePresets.find((p) => p.id === selectedRulePresetId)
                  ?.description
              }
            </div>
          )}
        </div>
      )}

      {/* Step 4: 選擇賽制格式 */}
      {selectedRulePresetId && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Step 3: 選擇賽制格式 {selectedFormatId && "✅"}
          </h3>

          <Input
            type="number"
            label="預估參賽人數"
            value={estimatedParticipants}
            onChange={(e) => setEstimatedParticipants(Number(e.target.value))}
            min={2}
            max={32}
            required
          />

          {availableFormats.length > 0 ? (
            <Select
              label="賽制格式"
              value={selectedFormatId}
              onChange={(value) => setSelectedFormatId(value)}
              options={availableFormats.map((format) => ({
                value: format.id,
                label: getFormatDisplayLabel(format),
              }))}
              required
            />
          ) : (
            <div className={styles.warning}>
              找不到適合 {estimatedParticipants} 人的賽制格式，請調整人數
            </div>
          )}

          {selectedFormatId && (
            <div className={styles.hint}>
              {formats.find((f) => f.id === selectedFormatId)?.description}
            </div>
          )}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className={styles.actions}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedFormatId}
        >
          {loading ? "創建中..." : "創建分類"}
        </Button>
      </div>

      {/* 配置預覽 */}
      {selectedSportId && selectedRulePresetId && selectedFormatId && (
        <div className={styles.preview}>
          <h4>配置摘要</h4>
          <ul>
            <li>
              <strong>運動：</strong>
              {sports.find((s) => s.id === selectedSportId)?.name}
            </li>
            <li>
              <strong>規則：</strong>
              {rulePresets.find((p) => p.id === selectedRulePresetId)?.label}
            </li>
            <li>
              <strong>賽制：</strong>
              {formats.find((f) => f.id === selectedFormatId)?.name}
            </li>
            <li>
              <strong>人數範圍：</strong>
              {formats.find((f) => f.id === selectedFormatId)?.minParticipants}
              -
              {formats.find((f) => f.id === selectedFormatId)?.maxParticipants}
              人
            </li>
          </ul>
          <p className={styles.note}>
            ℹ️ 這些配置將在創建時完整拷貝到分類中，之後不會受到全局規則變更的影響。
          </p>
        </div>
      )}
    </div>
  );
};

export default UniversalCategoryForm;

