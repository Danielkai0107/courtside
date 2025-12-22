import * as nodemailer from "nodemailer";
import * as functions from "firebase-functions";

// Email configuration
// You can use Gmail or other SMTP service
// For production, consider using SendGrid or AWS SES
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email?.user || process.env.EMAIL_USER,
    pass: functions.config().email?.password || process.env.EMAIL_PASSWORD,
  },
});

interface PlayerConfirmationEmailData {
  to: string;
  playerName: string;
  tournamentName: string;
  tournamentDate: string;
  location: string;
}

export async function sendPlayerConfirmationEmail(
  data: PlayerConfirmationEmailData
): Promise<void> {
  const mailOptions = {
    from: '"SportFlow" <noreply@sportflow.app>',
    to: data.to,
    subject: `報名確認 - ${data.tournamentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF6B00;">報名確認</h2>
        <p>嗨 ${data.playerName}，</p>
        <p>您的報名已經確認！</p>
        
        <div style="padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">賽事資訊</h3>
          <p><strong>賽事名稱：</strong>${data.tournamentName}</p>
          <p><strong>比賽日期：</strong>${data.tournamentDate}</p>
          <p><strong>比賽地點：</strong>${data.location}</p>
        </div>

        <p>請記得準時到場。祝比賽順利！</p>
        
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          此郵件由 SportFlow 自動發送，請勿直接回覆。
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

interface SchedulePublishedEmailData {
  to: string;
  playerName: string;
  tournamentName: string;
  tournamentId: string;
}

export async function sendSchedulePublishedEmail(
  data: SchedulePublishedEmailData
): Promise<void> {
  const appURL = functions.config().app?.url || "https://sportflow.app";
  const tournamentURL = `${appURL}/events/${data.tournamentId}`;

  const mailOptions = {
    from: '"SportFlow" <noreply@sportflow.app>',
    to: data.to,
    subject: `賽程已發布 - ${data.tournamentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF6B00;">賽程已發布</h2>
        <p>嗨 ${data.playerName}，</p>
        <p><strong>${data.tournamentName}</strong> 的賽程已經發布！</p>
        
        <p>請前往 SportFlow 查看您的比賽時間與對手資訊。</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${tournamentURL}" 
             style="background: #FF6B00; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            查看賽程
          </a>
        </div>

        <p>祝您比賽順利！</p>
        
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          此郵件由 SportFlow 自動發送，請勿直接回覆。
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

interface StaffInvitationEmailData {
  to: string;
  staffName: string;
  role: string;
  tournamentName: string;
  tournamentId: string;
}

export async function sendStaffInvitationEmail(
  data: StaffInvitationEmailData
): Promise<void> {
  const appURL = functions.config().app?.url || "https://sportflow.app";
  const roleLabels: Record<string, string> = {
    scorer: "紀錄員",
    referee: "裁判",
    volunteer: "志工",
  };

  const mailOptions = {
    from: '"SportFlow" <noreply@sportflow.app>',
    to: data.to,
    subject: `工作人員邀請 - ${data.tournamentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF6B00;">工作人員邀請</h2>
        <p>嗨 ${data.staffName}，</p>
        <p>您被邀請擔任 <strong>${data.tournamentName}</strong> 的<strong>${
      roleLabels[data.role] || data.role
    }</strong>。</p>
        
        <div style="padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">您的角色</h3>
          <p>${roleLabels[data.role] || data.role}</p>
        </div>

        <p>請登入 SportFlow 以查看詳情並接受邀請。</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${appURL}/profile" 
             style="background: #FF6B00; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            前往 SportFlow
          </a>
        </div>

        <p>如果您沒有 SportFlow 帳號，請先使用此 Email 註冊。</p>
        
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          此郵件由 SportFlow 自動發送，請勿直接回覆。
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
