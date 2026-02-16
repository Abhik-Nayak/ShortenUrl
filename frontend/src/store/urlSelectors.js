export const selectUrl = (state) => state.url;
export const selectUrls = (state) => state.url.urls;
export const selectUrlLoading = (state) => state.url.isLoading;
export const selectUrlError = (state) => state.url.error;
export const selectTotalUrls = (state) => state.url.totalUrls;
export const selectCurrentPage = (state) => state.url.currentPage;
