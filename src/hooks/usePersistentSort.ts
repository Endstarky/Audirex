import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersistentSort<T extends string>(
  storageKey: string,
  defaultCategory: T,
  defaultReverse: boolean = false,
) {
  const [sortCategory, setSortCategory] = useState<T>(defaultCategory);
  const [isReverse, setIsReverse] = useState<boolean>(defaultReverse);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.sortCategory) setSortCategory(parsed.sortCategory);
        if (typeof parsed.isReverse === 'boolean') {
          setIsReverse(parsed.isReverse);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const updateSortCategory = (category: T) => {
    setSortCategory(category);
    if (loaded) {
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({sortCategory: category, isReverse}),
      ).catch(() => {});
    }
  };

  const updateIsReverse = (reverse: boolean) => {
    setIsReverse(reverse);
    if (loaded) {
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({sortCategory, isReverse: reverse}),
      ).catch(() => {});
    }
  };

  return {
    sortCategory,
    setSortCategory: updateSortCategory,
    isReverse,
    setIsReverse: updateIsReverse,
  };
}