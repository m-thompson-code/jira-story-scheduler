export const zeroOrNaN =(value: number): boolean => {
    if (!value) {
      return true;
    }

    if (isNaN(value)) {
      return true;
    }

    return false;
}

export const getArrayFromMap = <K, V>(arrayOrMapInstance: Map<K, V> | V[]): V[] => {
    if (Array.isArray(arrayOrMapInstance)) {
      return arrayOrMapInstance;
    }
    
    return Array.from(arrayOrMapInstance).map(([, value]) => value);
}

export const getArrayFromMap2 = <K, V>(mapInstance: Map<K, V>): { key: K; value: V }[] => {
  return Array.from(mapInstance).map(([key, value]) => ({ key, value }));
}
