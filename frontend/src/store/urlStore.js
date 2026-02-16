/**
 * URL Store
 * Manages URL/link state using Redux Toolkit
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { urlAPI } from "../services/apiService";
import { selectUrl } from "./urlSelectors";

const initialState = {
  urls: [],
  isLoading: false,
  error: null,
  totalUrls: 0,
  currentPage: 1,
};

export const fetchUrls = createAsyncThunk(
  "url/fetchUrls",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await urlAPI.listUrls(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch URLs");
    }
  }
);

export const createShortUrl = createAsyncThunk(
  "url/createShortUrl",
  async (data, { rejectWithValue }) => {
    try {
      const response = await urlAPI.createShortUrl(data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create short URL");
    }
  }
);

export const getUrl = createAsyncThunk(
  "url/getUrl",
  async (id, { rejectWithValue }) => {
    try {
      const response = await urlAPI.getUrl(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch URL");
    }
  }
);

export const updateUrl = createAsyncThunk(
  "url/updateUrl",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await urlAPI.updateUrl(id, data);
      return { id, data: response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update URL");
    }
  }
);

export const deleteUrl = createAsyncThunk(
  "url/deleteUrl",
  async (id, { rejectWithValue }) => {
    try {
      const response = await urlAPI.deleteUrl(id);
      return { id, data: response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete URL");
    }
  }
);

const urlSlice = createSlice({
  name: "url",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUrls.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUrls.fulfilled, (state, action) => {
        state.urls = action.payload.urls;
        state.totalUrls = action.payload.pagination?.total || 0;
        state.currentPage = action.payload.pagination?.page || 1;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchUrls.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch URLs";
      })
      .addCase(createShortUrl.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createShortUrl.fulfilled, (state, action) => {
        state.urls = [action.payload.url, ...state.urls];
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createShortUrl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create short URL";
      })
      .addCase(getUrl.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUrl.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(getUrl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch URL";
      })
      .addCase(updateUrl.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUrl.fulfilled, (state, action) => {
        state.urls = state.urls.map((url) =>
          url._id === action.payload.id ? { ...url, ...action.payload.data.url } : url
        );
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateUrl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to update URL";
      })
      .addCase(deleteUrl.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUrl.fulfilled, (state, action) => {
        state.urls = state.urls.filter((url) => url._id !== action.payload.id);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteUrl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to delete URL";
      });
  },
});

export const { clearError } = urlSlice.actions;
export const urlReducer = urlSlice.reducer;

const unwrapWithAxiosErrorShape = (promise) =>
  promise.catch((err) => {
    if (typeof err === "string") {
      const normalizedError = new Error(err);
      normalizedError.response = { data: { message: err } };
      throw normalizedError;
    }
    throw err;
  });

const createBoundUrlApi = (state, dispatch) => ({
  ...state,
  fetchUrls: (params = {}) => unwrapWithAxiosErrorShape(dispatch(fetchUrls(params)).unwrap()),
  createShortUrl: (data) =>
    unwrapWithAxiosErrorShape(dispatch(createShortUrl(data)).unwrap()),
  getUrl: (id) => unwrapWithAxiosErrorShape(dispatch(getUrl(id)).unwrap()),
  updateUrl: (id, data) =>
    unwrapWithAxiosErrorShape(dispatch(updateUrl({ id, data })).unwrap()).then(
      (result) => result.data
    ),
  deleteUrl: (id) =>
    unwrapWithAxiosErrorShape(dispatch(deleteUrl(id)).unwrap()).then((result) => result.data),
  clearError: () => dispatch(clearError()),
});

export const useUrlStore = (selector) => {
  const urlState = useSelector(selectUrl);
  const dispatch = useDispatch();
  const api = createBoundUrlApi(urlState, dispatch);

  if (typeof selector === "function") {
    return selector(api);
  }

  return api;
};

export default useUrlStore;
