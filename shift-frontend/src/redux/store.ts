import { configureStore } from "@reduxjs/toolkit";
import shiftReducer from "./shiftSlice";
import cacheReducer from "./cacheSlice";

export const store = configureStore({
    reducer: {
        shift: shiftReducer,
        cache: cacheReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;