import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from 'react';
import api from '../services/api';

const SettingsContext = createContext();

const currencyMap = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
};

const DEFAULTS = {
    currency: 'INR',
    theme: 'dark',
    notifications: {
        billReminders: true,
        couponExpiry: true,
        monthlySummaries: true,
        creditUtilization: true,
    },
    couponPreferences: {
        expiryReminderDays: 3,
        autoHideExpired: true,
        autoMarkExpired: true,
        categoryVisibility: { Food: true, Shopping: true, Entertainment: true, Others: true },
    },
    dateTimePreferences: {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
        weekStart: 'Monday',
    },
};

function loadLocal() {
    const merge = { ...DEFAULTS };
    try {
        const currency = localStorage.getItem('currency');
        const theme    = localStorage.getItem('theme');
        const notifs   = localStorage.getItem('notifications');
        const coupon   = localStorage.getItem('couponPreferences');
        const dt       = localStorage.getItem('dateTimePreferences');
        if (currency) merge.currency = currency;
        if (theme)    merge.theme    = theme;
        if (notifs)   merge.notifications        = JSON.parse(notifs);
        if (coupon)   merge.couponPreferences     = JSON.parse(coupon);
        if (dt)       merge.dateTimePreferences   = JSON.parse(dt);
    } catch { /* ignore */ }
    return merge;
}

export function SettingsProvider({ children }) {
    const local = loadLocal();

    const [currency,            setCurrencyState]            = useState(local.currency);
    const [theme,               setThemeState]               = useState(local.theme);
    const [notifications,       setNotificationsState]       = useState(local.notifications);
    const [couponPreferences,   setCouponPreferencesState]   = useState(local.couponPreferences);
    const [dateTimePreferences, setDateTimePreferencesState] = useState(local.dateTimePreferences);
    const [serverSynced,        setServerSynced]             = useState(false);

    // ─── Debounced server persist ─────────────────────────────────────────────
    const persistTimer = useRef(null);
    const persistToServer = useCallback((patch) => {
        clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(async () => {
            try {
                await api.put('/users/me/settings', patch);
            } catch { /* offline — localStorage already saved */ }
        }, 800);
    }, []);

    // ─── Hydrate from server on mount via active cookie session ─────────────
    const triggerSync = useCallback(async () => {
        const isAuth = localStorage.getItem('isAuthenticated');
        if (!isAuth) return;
        try {
            const res = await api.get('/users/me/settings');
            const s = res.data;
            if (s.currency)            { setCurrencyState(s.currency);                       localStorage.setItem('currency', s.currency); }
            if (s.theme)               { setThemeState(s.theme);                             localStorage.setItem('theme', s.theme); }
            if (s.notifications)       { setNotificationsState(s.notifications);             localStorage.setItem('notifications', JSON.stringify(s.notifications)); }
            if (s.couponPreferences)   { setCouponPreferencesState(s.couponPreferences);     localStorage.setItem('couponPreferences', JSON.stringify(s.couponPreferences)); }
            if (s.dateTimePreferences) { setDateTimePreferencesState(s.dateTimePreferences); localStorage.setItem('dateTimePreferences', JSON.stringify(s.dateTimePreferences)); }
            setServerSynced(true);
        } catch { 
            // Network failure or unauthenticated cookie — keep standard defaults/local settings active
        }
    }, []);

    useEffect(() => {
        if (!serverSynced) {
            triggerSync();
        }
    }, [serverSynced, triggerSync]);

    // ─── Theme DOM sync ───────────────────────────────────────────────────────
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    // ─── Setters — update state + localStorage + debounce server sync ─────────
    const setCurrency = useCallback((v) => {
        setCurrencyState(v);
        localStorage.setItem('currency', v);
        persistToServer({ currency: v });
    }, [persistToServer]);

    const setTheme = useCallback((v) => {
        setThemeState(v);
        localStorage.setItem('theme', v);
        persistToServer({ theme: v });
    }, [persistToServer]);

    const setNotifications = useCallback((v) => {
        setNotificationsState(v);
        localStorage.setItem('notifications', JSON.stringify(v));
        persistToServer({ notifications: v });
    }, [persistToServer]);

    const setCouponPreferences = useCallback((v) => {
        setCouponPreferencesState(v);
        localStorage.setItem('couponPreferences', JSON.stringify(v));
        persistToServer({ couponPreferences: v });
    }, [persistToServer]);

    const setDateTimePreferences = useCallback((v) => {
        setDateTimePreferencesState(v);
        localStorage.setItem('dateTimePreferences', JSON.stringify(v));
        persistToServer({ dateTimePreferences: v });
    }, [persistToServer]);

    const currencySymbol = currencyMap[currency] ?? '₹';

    return (
        <SettingsContext.Provider
            value={{
                currency,
                setCurrency,
                currencySymbol,
                currencyMap,
                theme,
                setTheme,
                notifications,
                setNotifications,
                couponPreferences,
                setCouponPreferences,
                dateTimePreferences,
                setDateTimePreferences,
                triggerSync,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}