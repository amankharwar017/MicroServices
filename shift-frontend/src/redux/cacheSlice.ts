import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { getShiftDropdownOptions, getShiftById as getShiftByIdApi, } from "../app/shift-api";
import type { ShiftDropdownOptionsResponse, ShiftResponse, } from "../types/shift";
import type { RootState } from "./store";

interface CacheEntry<T> {
    data: T | null;
    timestamp: number;
    stale: boolean;
}

interface CacheState {
    dropdownOptions: CacheEntry<ShiftDropdownOptionsResponse>;
    shiftsById: Record<number, CacheEntry<ShiftResponse>>;
}

const initialState: CacheState = {
    dropdownOptions: {
        data: null,
        timestamp: 0,
        stale: true,
    },
    shiftsById: {},
};

const DROPDOWN_TTL = 5 * 60 * 1000;
const SHIFT_BY_ID_TTL = 5 * 60 * 1000;

const isFresh = <T>(entry: CacheEntry<T>, ttl: number) => {
    return (
        entry.data !== null &&
        !entry.stale &&
        Date.now() - entry.timestamp < ttl
    );
};

export const fetchShiftDropdownOptions = createAsyncThunk<ShiftDropdownOptionsResponse, void, { state: RootState }>(
    "cache/fetchShiftDropdownOptions", async (_, { getState }) => {
        const cached = getState().cache.dropdownOptions;
        if (isFresh(cached, DROPDOWN_TTL)) {
            return cached.data!;
        }
        const response = await getShiftDropdownOptions();
        return response.data;
    }
);

export const fetchShiftById = createAsyncThunk<ShiftResponse, number, { state: RootState }>(
    "cache/fetchShiftById", async (shiftId, { getState }) => {
        const cached = getState().cache.shiftsById[shiftId];
        if (cached && isFresh(cached, SHIFT_BY_ID_TTL)) {
            return cached.data!;
        }
        const response = await getShiftByIdApi(shiftId);
        return response.data;
    }
);

const cacheSlice = createSlice({
    name: "cache", initialState, reducers: {
        setDropdownOptions: (state, action: PayloadAction<ShiftDropdownOptionsResponse>) => {
            state.dropdownOptions = {
                data: action.payload,
                timestamp: Date.now(),
                stale: false,
            };
        },
        invalidateDropdownOptions: (state) => {
            state.dropdownOptions.stale = true;
        },
        invalidateAll: (state) => {
            state.dropdownOptions.stale = true;
            Object.values(state.shiftsById).forEach((entry) => {
                entry.stale = true;
            });
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchShiftDropdownOptions.fulfilled, (state, action) => {
            state.dropdownOptions = {
                data: action.payload,
                timestamp: Date.now(),
                stale: false,
            };
        });
        builder.addCase(fetchShiftById.fulfilled, (state, action) => {
            const shiftId = action.meta.arg;
            state.shiftsById[shiftId] = {
                data: action.payload,
                timestamp: Date.now(),
                stale: false,
            };
        });
    },
});

export const { setDropdownOptions, invalidateDropdownOptions, invalidateAll, } = cacheSlice.actions;

export const selectDropdownOptions = (state: RootState) => state.cache.dropdownOptions;

export const selectFreshDropdownOptions = (state: RootState) => {
    const entry = state.cache.dropdownOptions;
    return isFresh(entry, DROPDOWN_TTL) ? entry.data : null;
};

export const selectShiftById = (state: RootState, shiftId: number) => {
    const entry = state.cache.shiftsById[shiftId];
    return entry && isFresh(entry, SHIFT_BY_ID_TTL) ? entry.data : null;
};

export default cacheSlice.reducer;