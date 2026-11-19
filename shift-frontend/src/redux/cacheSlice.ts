import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { getShiftDropdownOptions } from "../app/shift-api";
import type { ShiftDropdownOptionsResponse } from "../types/shift";
import type { RootState } from "./store";

interface CacheEntry<T> {
    data: T | null;
    timestamp: number;
    stale: boolean;
}

interface CacheState {
    dropdownOptions: CacheEntry<ShiftDropdownOptionsResponse>;
}

const initialState: CacheState = {
    dropdownOptions: {
        data: null,
        timestamp: 0,
        stale: true,
    },
};

const DROPDOWN_TTL = 5 * 60 * 1000;

const isFresh = <T>(entry: CacheEntry<T>, ttl: number) => {
    return (
        entry.data !== null &&
        !entry.stale &&
        Date.now() - entry.timestamp < ttl
    );
};

export const fetchShiftDropdownOptions = createAsyncThunk< ShiftDropdownOptionsResponse, void, { state: RootState }>(
    "cache/fetchShiftDropdownOptions", async (_, { getState }) => {
        const cached = getState().cache.dropdownOptions;
        if (isFresh(cached, DROPDOWN_TTL)) {
            return cached.data!;
        }
        const response = await getShiftDropdownOptions();
        return response.data;
    }
);

const cacheSlice = createSlice({name: "cache", initialState, reducers: { setDropdownOptions: ( state, action: PayloadAction<ShiftDropdownOptionsResponse> ) => {
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
        },
    },

    extraReducers: (builder) => { builder.addCase(fetchShiftDropdownOptions.fulfilled,(state, action) => { state.dropdownOptions = {
                    data: action.payload,
                    timestamp: Date.now(),
                    stale: false,
                };
            }
        );
    },
});

export const { setDropdownOptions, invalidateDropdownOptions,invalidateAll,} = cacheSlice.actions;

export const selectDropdownOptions = (state: RootState) => state.cache.dropdownOptions;

export const selectFreshDropdownOptions = (state: RootState) => {
    const entry = state.cache.dropdownOptions;
    return isFresh(entry, DROPDOWN_TTL) ? entry.data : null;
};

export default cacheSlice.reducer;