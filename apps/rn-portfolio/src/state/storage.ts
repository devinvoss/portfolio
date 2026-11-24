import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** AsyncStorage on native, localStorage on the web, for zustand's persist middleware. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
