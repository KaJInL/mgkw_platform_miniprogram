import localStorageHelper from "@/common/helper/localStorageHelper";

const DEVICE_ID_STORAGE_KEY = "pindou_generator_miniprogram_device_id";
const DEVICE_ID_EXPIRE_SECONDS = 365 * 24 * 60 * 60;

const generateDeviceId = (): string => {
    return `wx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateDeviceId = (): string => {
    const cached = localStorageHelper.get(DEVICE_ID_STORAGE_KEY, "");
    if (typeof cached === "string" && cached.trim()) {
        return cached.trim();
    }

    const created = generateDeviceId();
    localStorageHelper.set(DEVICE_ID_STORAGE_KEY, created, DEVICE_ID_EXPIRE_SECONDS);
    return created;
};
