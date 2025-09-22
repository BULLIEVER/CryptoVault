import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useDebounce } from './useDebounce';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const debouncedValue = useDebounce(storedValue, 500);

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(debouncedValue));
        } catch (error) {
            console.error(error);
        }
    }, [key, debouncedValue]);

    return [storedValue, setStoredValue];
}