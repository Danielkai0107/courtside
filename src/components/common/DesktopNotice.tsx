import React from "react";
import styles from "./DesktopNotice.module.scss";

const DesktopNotice: React.FC = () => {
  return (
    <div className={styles.notice}>
      <div className={styles.content}>
        <h1 className={styles.logo}>CourtSide</h1>
        <p className={styles.message}>
          電腦版開發中，請使用手機裝置開啟，給您最好的體驗
        </p>
      </div>
    </div>
  );
};

export default DesktopNotice;

