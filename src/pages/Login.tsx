import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useRoleSwitch } from "../contexts/RoleSwitchContext";
import Button from "../components/common/Button";
import styles from "./Login.module.scss";

const Login: React.FC = () => {
  const { login, currentUser } = useAuth();
  const { startTransition } = useRoleSwitch();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      // 使用和切換角色一樣的動畫，但顯示登入文字
      startTransition("user", () => {
        navigate("/profile");
      }, "登入成功");
    }
  }, [currentUser, navigate, startTransition]);

  return (
    <div className={styles.login}>
      <div className={styles.content}>
        <h1 className={styles.logo}>CourtSide</h1>
        {/* <p className={styles.subtitle}>全民賽事管理系統</p> */}
        <Button
          variant="primary"
          onClick={login}
          className={styles.loginButton}
        >
          使用 Google 登入
        </Button>
      </div>
    </div>
  );
};

export default Login;
