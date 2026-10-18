import { useState } from "react";

function readStored<T>(key: string, initialValue: T): T {
    try {
        const stored = window.localStorage.getItem(key);

        return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
        return initialValue;
    }
}

/**
 * State that is mirrored into `localStorage` as JSON. Storage can be missing, blocked or full, so every read and
 * write is guarded and the value then lives in memory only for the lifetime of the component.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [value, setValue] = useState(() => readStored(key, initialValue));

    function updateValue(newValue: T) {
        setValue(newValue);

        try {
            window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch {
            // Keep the value in memory.
        }
    }

    return [value, updateValue];
}
