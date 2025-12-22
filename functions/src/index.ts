import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendPlayerConfirmationEmail, sendSchedulePublishedEmail, sendStaffInvitationEmail } from './notifications/emailService';

admin.initializeApp();

/**
 * 當選手報名被確認時發送通知
 */
export const onPlayerConfirmed = functions.firestore
  .document('tournaments/{tournamentId}/players/{playerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed to 'confirmed'
    if (before.status !== 'confirmed' && after.status === 'confirmed') {
      const { tournamentId } = context.params;
      
      try {
        // Get tournament details
        const tournamentDoc = await admin.firestore()
          .collection('tournaments')
          .doc(tournamentId)
          .get();

        if (!tournamentDoc.exists) {
          console.error('Tournament not found:', tournamentId);
          return;
        }

        const tournament = tournamentDoc.data();
        
        await sendPlayerConfirmationEmail({
          to: after.email,
          playerName: after.name,
          tournamentName: tournament?.name || 'Unnamed Tournament',
          tournamentDate: tournament?.date?.toDate().toLocaleDateString('zh-TW') || '',
          location: tournament?.location || '',
        });

        console.log(`Confirmation email sent to ${after.email}`);
      } catch (error) {
        console.error('Error sending confirmation email:', error);
      }
    }
  });

/**
 * 當賽程發布時通知所有選手
 */
export const onSchedulePublished = functions.firestore
  .document('tournaments/{tournamentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed to 'scheduled'
    if (before.status !== 'scheduled' && after.status === 'scheduled') {
      const { tournamentId } = context.params;

      try {
        // Get all confirmed players
        const playersSnapshot = await admin.firestore()
          .collection('tournaments')
          .doc(tournamentId)
          .collection('players')
          .where('status', '==', 'confirmed')
          .get();

        const emailPromises = playersSnapshot.docs.map(async (playerDoc) => {
          const player = playerDoc.data();
          
          await sendSchedulePublishedEmail({
            to: player.email,
            playerName: player.name,
            tournamentName: after.name,
            tournamentId: tournamentId,
          });
        });

        await Promise.all(emailPromises);

        console.log(`Schedule published emails sent to ${playersSnapshot.size} players`);
      } catch (error) {
        console.error('Error sending schedule published emails:', error);
      }
    }
  });

/**
 * 當工作人員被邀請時發送通知
 */
export const onStaffInvited = functions.firestore
  .document('tournaments/{tournamentId}/staff/{staffId}')
  .onCreate(async (snapshot, context) => {
    const staff = snapshot.data();
    const { tournamentId } = context.params;

    try {
      // Get tournament details
      const tournamentDoc = await admin.firestore()
        .collection('tournaments')
        .doc(tournamentId)
        .get();

      if (!tournamentDoc.exists) {
        console.error('Tournament not found:', tournamentId);
        return;
      }

      const tournament = tournamentDoc.data();

      await sendStaffInvitationEmail({
        to: staff.email,
        staffName: staff.name,
        role: staff.role,
        tournamentName: tournament?.name || 'Unnamed Tournament',
        tournamentId: tournamentId,
      });

      console.log(`Invitation email sent to ${staff.email}`);
    } catch (error) {
      console.error('Error sending invitation email:', error);
    }
  });

