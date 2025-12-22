import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import styles from './IndexBuildingNotice.module.scss';

const IndexBuildingNotice: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className={styles.notice}>
      <div className={styles.icon}>
        <AlertCircle size={48} />
      </div>
      <h3 className={styles.title}>資料庫索引建立中</h3>
      <p className={styles.message}>
        Firestore 索引正在背景建立中，這是首次部署時的正常現象。
      </p>
      <p className={styles.submessage}>
        預計需要 1-5 分鐘，請稍候片刻後重新整理頁面。
      </p>
      <Button variant="secondary" onClick={handleRefresh} className={styles.button}>
        <RefreshCw size={16} />
        重新整理
      </Button>
      <div className={styles.progress}>
        <div className={styles.progressBar}></div>
      </div>
    </Card>
  );
};

export default IndexBuildingNotice;

