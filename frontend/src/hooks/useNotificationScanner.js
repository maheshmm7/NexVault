import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useNotificationCenter } from '../contexts/NotificationCenterContext';
import api from '../services/api';
import { isBefore, addDays } from 'date-fns';
import { BRANDING } from '../config/branding';


export default function useNotificationScanner() {
  const { user } = useAuth();
  const { notifications, couponPreferences } = useSettings();
  const { addToast } = useToast();
  const { addNotification } = useNotificationCenter();

  useEffect(() => {
    // Block scanning if no logged-in user or coupon alerts are explicitly disabled
    if (!user || !notifications?.couponExpiry) return;

    const scanForExpiringCoupons = async () => {
      try {
        // 1. Spam Prevention Gate — fires once per user session per calendar day
        const scanKey = `${BRANDING.STORAGE_PREFIX}_scan_token_${user.id}_${new Date().toDateString()}`;
        if (sessionStorage.getItem(scanKey)) return;


        // 2. Request browser notification permission and await user decision before scanning
        let desktopPermission = 'denied';
        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            // Await the prompt — user must click Allow/Block before we continue
            desktopPermission = await Notification.requestPermission();
          } else {
            desktopPermission = Notification.permission;
          }
        }

        // 3. Fetch active coupons from backend
        const response = await api.get('/coupons/');
        const activeCoupons = response.data.filter(c => c.status === 'active');
        const reminderDays = couponPreferences?.expiryReminderDays ?? 3;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiringSoonItems = [];

        activeCoupons.forEach(coupon => {
          if (!coupon.expiry_date) return;

          const expDate = new Date(coupon.expiry_date);
          expDate.setHours(0, 0, 0, 0);

          // Is expiring within the reminder window AND has not yet passed?
          const windowThreshold = addDays(new Date(), reminderDays);
          windowThreshold.setHours(23, 59, 59, 999);

          if (isBefore(expDate, windowThreshold) && !isBefore(expDate, today)) {
            expiringSoonItems.push(coupon);
          }
        });

        // 4. Dispatch alerts if matching coupons found
        if (expiringSoonItems.length > 0) {
          const count = expiringSoonItems.length;
          const header = count === 1
            ? '🎟️ Coupon Expiring Soon!'
            : `🎟️ ${count} Coupons Expiring Soon!`;

          const message = count === 1
            ? `"${expiringSoonItems[0].title}" expires very soon. Don't miss out!`
            : `You have ${count} discount codes approaching expiry in your Vault.`;

          // Channel A: In-App Toast Banner (bottom-right corner, stays for 8 seconds)
          addToast(`${header} ${message}`, 'info', 8000);

          // Archive into persistent Bell Inbox
          addNotification({
            type: 'coupon_expiry',
            title: header,
            message,
          });

          // Channel B: Native Desktop Notification (only if user granted permission)
          if (desktopPermission === 'granted') {
            new Notification(BRANDING.NOTIFICATION_TITLE, {
              body: `${header}\n${message}`,
              icon: '/favicon.svg',
            });
          }


          // Lock session only after successful dispatch
          sessionStorage.setItem(scanKey, 'true');
        } else {
          // No alerts needed — still lock to avoid repeated API calls
          sessionStorage.setItem(scanKey, 'true');
        }

      } catch (error) {
        console.error(`${BRANDING.NAME} Notification Scanner: Execution failed.`, error);

      }
    };

    // Slight delay so the dashboard fully renders before alert appears
    const timeout = setTimeout(scanForExpiringCoupons, 2000);
    return () => clearTimeout(timeout);

  }, [user, notifications?.couponExpiry, couponPreferences?.expiryReminderDays]);
}
