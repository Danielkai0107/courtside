import React, { useState } from "react";
import Button from "../common/Button";
import type { Tournament } from "../../types";
import {
  openRegistration,
  closeRegistration,
} from "../../services/tournamentService";

export interface TournamentStatusButtonProps {
  tournament: Tournament;
  onStatusChange?: () => void;
}

const TournamentStatusButton: React.FC<TournamentStatusButtonProps> = ({
  tournament,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
      onStatusChange?.();
    } catch (error: any) {
      console.error("Status change failed:", error);
      alert(error.message || "狀態變更失敗");
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (tournament.status) {
      case "DRAFT":
        return {
          label: "開放報名",
          action: () => openRegistration(tournament.id),
          variant: "primary" as const,
          disabled: false,
        };

      case "REGISTRATION_OPEN":
        return {
          label: "截止報名",
          action: () => closeRegistration(tournament.id),
          variant: "secondary" as const,
          disabled: false,
        };

      case "REGISTRATION_CLOSED":
        return {
          label: "請至賽程設定發布",
          action: async () => {},
          variant: "secondary" as const,
          disabled: true,
        };

      case "ONGOING":
        return {
          label: "比賽進行中",
          action: async () => {},
          variant: "secondary" as const,
          disabled: true,
        };

      case "COMPLETED":
        return null; // 已結束不顯示按鈕

      default:
        return null;
    }
  };

  const buttonConfig = getButtonConfig();

  if (!buttonConfig) {
    return null;
  }

  return (
    <Button
      variant={buttonConfig.variant}
      onClick={() => handleStatusChange(buttonConfig.action)}
      disabled={buttonConfig.disabled || loading}
      loading={loading}
    >
      {buttonConfig.label}
    </Button>
  );
};

export default TournamentStatusButton;
