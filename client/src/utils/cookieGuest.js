import Cookies from "js-cookie";

export const getGuestId = () => Cookies.get("guestId") || null;

export const clearGuestId = () => Cookies.remove("guestId");
