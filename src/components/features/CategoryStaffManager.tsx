import React, { useState, useEffect } from "react";
import { Mail, User } from "lucide-react";
import { TextField } from "@mui/material";
import Button from "../common/Button";
import Card from "../common/Card";
import Modal from "../common/Modal";
import styles from "./CategoryStaffManager.module.scss";
import type { Category } from "../../types";
import {
  getStaff,
  inviteStaff,
  removeStaff,
} from "../../services/staffService";

interface CategoryStaffManagerProps {
  tournamentId: string;
  categories: Category[];
}

const CategoryStaffManager: React.FC<CategoryStaffManagerProps> = ({
  tournamentId,
}) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite staff modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{
    uid: string;
    name: string;
    photoURL?: string;
  } | null>(null);
  const [removingStaffId, setRemovingStaffId] = useState<string | null>(null);

  useEffect(() => {
    const loadStaff = async () => {
      setLoading(true);
      try {
        const data = await getStaff(tournamentId);
        setStaff(data);
      } catch (error) {
        console.error("Failed to load staff:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, [tournamentId]);

  const handleSearchUser = async () => {
    if (!staffEmail.trim()) {
      alert("請輸入 Email");
      return;
    }

    setSearchingUser(true);
    try {
      const { searchUserByEmail } = await import("../../services/userService");
      const user = await searchUserByEmail(staffEmail.trim());

      if (user) {
        setFoundUser({
          uid: user.uid,
          name: user.displayName || "",
          photoURL: user.photoURL || undefined,
        });
        setStaffName(user.displayName || "");
      } else {
        setFoundUser(null);
        alert("找不到此用戶，請確認 Email 或手動輸入姓名");
      }
    } catch (err: any) {
      alert(err.message || "搜尋失敗");
      setFoundUser(null);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleInvite = async () => {
    if (!staffEmail.trim() || !staffName.trim()) {
      alert("請填寫 Email 和姓名");
      return;
    }

    setInviting(true);
    try {
      await inviteStaff(tournamentId, {
        email: staffEmail.trim(),
        name: staffName.trim(),
        role: "scorer",
        uid: foundUser?.uid,
        photoURL: foundUser?.photoURL,
      });

      // Reload staff
      const data = await getStaff(tournamentId);
      setStaff(data);

      // Reset form
      setShowInviteModal(false);
      setStaffEmail("");
      setStaffName("");
      setFoundUser(null);
    } catch (err: any) {
      alert(err.message || "邀請失敗");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (staffId: string, staffName: string) => {
    const member = staff.find((s) => s.id === staffId);
    const action = member?.status === "invited" ? "取消邀請" : "移除";
    const confirmed = window.confirm(
      `確定要${action} ${staffName} 嗎？${
        member?.status === "accepted"
          ? "\n\n此人員已接受邀請，移除後將無法訪問紀錄員功能。"
          : ""
      }`
    );
    if (!confirmed) return;

    setRemovingStaffId(staffId);
    try {
      await removeStaff(tournamentId, staffId);

      // Reload staff
      const data = await getStaff(tournamentId);
      setStaff(data);
    } catch (err: any) {
      alert(err.message || "移除失敗");
    } finally {
      setRemovingStaffId(null);
    }
  };

  return (
    <div className={styles.categoryStaffManager}>
      <div className={styles.header}>
        <h3 className={styles.title}>紀錄員列表</h3>
        <Button onClick={() => setShowInviteModal(true)}>
          <Mail size={16} />
          邀請紀錄員
        </Button>
      </div>

      <div className={styles.content}>

        <Card>
          {loading ? (
            <p className={styles.loadingMessage}>載入中...</p>
          ) : staff.length === 0 ? (
            <p className={styles.emptyMessage}>尚無紀錄員</p>
          ) : (
            <div className={styles.staffList}>
              {staff.map((member) => (
                <div key={member.id} className={styles.staffCard}>
                  <div className={styles.staffItem}>
                    <div className={styles.staffAvatar}>
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.name} />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div className={styles.staffDetails}>
                      <span className={styles.staffName}>{member.name}</span>
                      <span className={styles.staffEmail}>{member.email}</span>
                    </div>
                    <div className={styles.staffMeta}>
                      <span className={styles.staffRole}>紀錄員</span>
                      <span
                        className={`${styles.staffStatus} ${
                          member.status === "accepted"
                            ? styles.accepted
                            : member.status === "declined"
                            ? styles.declined
                            : styles.invited
                        }`}
                      >
                        {member.status === "accepted"
                          ? "已接受"
                          : member.status === "declined"
                          ? "已拒絕"
                          : "邀請中"}
                      </span>
                    </div>
                  </div>
                  {member.status !== "declined" && (
                    <Button
                      variant="outline"
                      onClick={() => handleRemove(member.id, member.name)}
                      loading={removingStaffId === member.id}
                      disabled={removingStaffId !== null}
                      size="small"
                    >
                      {member.status === "invited" ? "取消邀請" : "移除"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Invite Staff Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setStaffEmail("");
          setStaffName("");
          setFoundUser(null);
        }}
        title="邀請紀錄員"
      >
        <div className={styles.modalContent}>
          <div className={styles.searchSection}>
            <TextField
              label="Email"
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="紀錄員的 Email"
              required
              fullWidth
              variant="outlined"
              size="medium"
            />
            <Button
              variant="secondary"
              onClick={handleSearchUser}
              loading={searchingUser}
              size="small"
            >
              搜尋
            </Button>
          </div>

          {foundUser && (
            <div className={styles.foundUser}>
              <User size={20} />
              <span>找到已註冊用戶：{foundUser.name}</span>
            </div>
          )}

          <TextField
            label="姓名"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="請輸入姓名"
            required
            fullWidth
            variant="outlined"
            size="medium"
          />

          <p className={styles.hint}>
            {foundUser
              ? "此用戶已註冊，將立即收到邀請通知。"
              : "如果此 Email 尚未註冊，系統會建立影子帳號，用戶註冊後可接受邀請。"}
          </p>

          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowInviteModal(false);
                setStaffEmail("");
                setStaffName("");
                setFoundUser(null);
              }}
            >
              取消
            </Button>
            <Button variant="primary" onClick={handleInvite} loading={inviting}>
              發送邀請
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryStaffManager;
